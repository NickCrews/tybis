import {
    type BuiltinROp,
    type BuiltinVOp,
    type Compiler,
    type Schema,
    type IVOp,
    type IROp,
} from 'tybis'

// SortSpec and IVOp aren't re-exported from `tybis` root; use a structural type.
type IVOpLike = { readonly kind: string }
interface SortSpecLike { readonly op: IVOpLike; readonly direction: 'asc' | 'desc' }

import {
    type CompiledQuery,
    type Param,
    type Sql,
    f,
    joinSql,
} from './types.js'

// ---------------------------------------------------------------------------
// Handler record types
// ---------------------------------------------------------------------------

/**
 * Handler record keyed by the `kind` discriminator of {@link BuiltinVOp}.
 *
 * Each handler receives the *full typed op object* — renaming a field on the
 * op class breaks the corresponding handler immediately. Adding a new op kind
 * to {@link BuiltinVOp} surfaces as a missing-key error wherever the handler
 * record is `satisfies`-checked (see `ANSI_V_HANDLERS`).
 */
export type VOpHandlers<Self> = {
    [K in BuiltinVOp['kind']]: (this: Self, op: Extract<BuiltinVOp, { kind: K }>) => Sql
}

/**
 * Handler record keyed by the `kind` discriminator of {@link BuiltinROp}.
 *
 * Each handler is responsible for either merging the incoming op into the
 * current {@link QueryLevel} or closing the level and opening a new one.
 */
export type ROpPlanHandlers<Self> = {
    [K in BuiltinROp['kind']]: (this: Self, op: Extract<BuiltinROp, { kind: K }>, ctx: PlannerCtx) => void
}

// ---------------------------------------------------------------------------
// Query level / planner context
// ---------------------------------------------------------------------------

export interface QueryLevel {
    from: string
    /** Schema visible at the start of this level — used for derive-shadow detection. */
    derivesSourceSchema?: Schema
    filters: IVOpLike[]
    derives: [string, IVOpLike][]
    select?: [string, IVOpLike][]
    group?: { keys: [string, IVOpLike][]; aggs: [string, IVOpLike][] }
    sort?: SortSpecLike[]
    limit?: number
}

export interface PlannerCtx {
    /** Already-closed levels, in order. Each becomes a CTE. */
    levels: QueryLevel[]
    /** The level currently being built. */
    current: QueryLevel
    /** Monotonically increasing counter used to mint CTE names. */
    cteCounter: number
}

function newLevel(from: string, sourceSchema?: Schema): QueryLevel {
    const lvl: QueryLevel = { from, filters: [], derives: [] }
    if (sourceSchema !== undefined) {
        lvl.derivesSourceSchema = sourceSchema
    }
    return lvl
}

/**
 * Close the current level, push it onto the completed list, and start a new
 * level whose `from` is the just-closed level's CTE name.
 */
export function closeLevel(ctx: PlannerCtx, sourceSchema: Schema): string {
    const cteName = `_cte_${ctx.cteCounter++}`
    ctx.levels.push(ctx.current)
    ctx.current = newLevel(cteName, sourceSchema)
    return cteName
}

// ---------------------------------------------------------------------------
// Abstract base compiler
// ---------------------------------------------------------------------------

export abstract class SqlCompiler implements Compiler<Sql, CompiledQuery, IVOp, IROp> {
    abstract readonly vHandlers: VOpHandlers<SqlCompiler>
    abstract readonly rHandlers: ROpPlanHandlers<SqlCompiler>

    /** Compile a value op to a {@link Sql} fragment array. */
    compileVOp(op: BuiltinVOp): Sql {
        // Indexing the handler record reduces precision — cast to the kind-narrowed signature.
        const handler = this.vHandlers[op.kind] as (this: this, op: BuiltinVOp) => Sql
        if (!handler) throw new Error(`No handler for VOp kind: ${op.kind}`)
        return handler.call(this, op)
    }

    /**
     * Plan an ROp chain into levels, then compile and finalize.
     *
     * Returns a {@link CompiledQuery} so that this method satisfies the public
     * `Compiler<CompiledQuery>` interface.
     */
    compileROp(op: BuiltinROp): CompiledQuery {
        const ctx = this.planROp(op)
        const sql = this.emitLevels(ctx)
        return this.finalize(sql)
    }

    /**
     * Walk the op chain leaf-first and produce a populated {@link PlannerCtx}.
     */
    protected planROp(rootOp: BuiltinROp): PlannerCtx {
        // Flatten the chain leaf-first.
        const chain = flattenChain(rootOp)
        const head = chain[0]
        if (!head || head.kind !== 'from') {
            throw new Error(`Expected ROp chain to begin with a FromOp, got: ${head?.kind}`)
        }
        const ctx: PlannerCtx = {
            levels: [],
            current: newLevel(head.name, head.schema()),
            cteCounter: 0,
        }
        for (let i = 1; i < chain.length; i++) {
            const op = chain[i]!
            const handler = this.rHandlers[op.kind] as (this: this, op: BuiltinROp, ctx: PlannerCtx) => void
            if (!handler) throw new Error(`No handler for ROp kind: ${op.kind}`)
            handler.call(this, op, ctx)
        }
        return ctx
    }

    /** Compile a single {@link QueryLevel} into a SELECT statement (no semicolon). */
    protected emitLevel(level: QueryLevel): Sql {
        const parts: Sql[] = []

        // SELECT projection
        let projection: Sql
        if (level.group) {
            const items: Sql[] = []
            for (const [name, op] of level.group.keys) {
                items.push(this.aliasIfNeeded(this.compileVOp(op as BuiltinVOp), name))
            }
            for (const [name, op] of level.group.aggs) {
                items.push(this.aliasIfNeeded(this.compileVOp(op as BuiltinVOp), name))
            }
            projection = joinSql(items, ', ')
        } else if (level.select) {
            const items: Sql[] = level.select.map(([name, op]) =>
                this.aliasIfNeeded(this.compileVOp(op as BuiltinVOp), name)
            )
            projection = joinSql(items, ', ')
        } else if (level.derives.length > 0) {
            // Determine if any derive shadows an existing column → must list explicitly.
            const sourceSchema = level.derivesSourceSchema ?? {}
            const derivedNames = new Set(level.derives.map(([n]) => n))
            const shadows = [...derivedNames].some(n => n in sourceSchema)
            if (shadows && Object.keys(sourceSchema).length > 0) {
                const items: Sql[] = []
                for (const colName of Object.keys(sourceSchema)) {
                    if (derivedNames.has(colName)) continue
                    items.push([this.quoteIdent(colName)])
                }
                for (const [name, op] of level.derives) {
                    items.push(this.aliasIfNeeded(this.compileVOp(op as BuiltinVOp), name))
                }
                projection = joinSql(items, ', ')
            } else {
                const items: Sql[] = [['*']]
                for (const [name, op] of level.derives) {
                    items.push(this.aliasIfNeeded(this.compileVOp(op as BuiltinVOp), name))
                }
                projection = joinSql(items, ', ')
            }
        } else {
            projection = ['*']
        }

        parts.push(f`SELECT `)
        parts.push(projection)
        parts.push(f` FROM ${[this.quoteIdentIfNotCte(level.from)]}`)

        if (level.filters.length > 0) {
            const conds: Sql[] = level.filters.map(c => this.compileVOp(c as BuiltinVOp))
            const wrapped: Sql[] = conds.length === 1 ? [conds[0]!] : conds.map(c => f`(${c})`)
            parts.push(f` WHERE `)
            parts.push(joinSql(wrapped, ' AND '))
        }

        if (level.group) {
            const keyExprs: Sql[] = level.group.keys.map(([_, op]) =>
                this.compileVOp(op as BuiltinVOp)
            )
            parts.push(f` GROUP BY `)
            parts.push(joinSql(keyExprs, ', '))
        }

        if (level.sort && level.sort.length > 0) {
            const items: Sql[] = level.sort.map(s => {
                const inner = this.compileVOp(s.op as BuiltinVOp)
                return s.direction === 'desc' ? f`${inner} DESC` : inner
            })
            parts.push(f` ORDER BY `)
            parts.push(joinSql(items, ', '))
        }

        if (level.limit !== undefined) {
            parts.push(f` LIMIT ${[String(level.limit)]}`)
        }

        return joinSql(parts, '')
    }

    /** Stitch the closed levels and the current level into a final SQL fragment array. */
    protected emitLevels(ctx: PlannerCtx): Sql {
        if (ctx.levels.length === 0) {
            return this.emitLevel(ctx.current)
        }
        const ctes: Sql[] = ctx.levels.map((lvl, i) => {
            const inner = this.emitLevel(lvl)
            return f`${[`_cte_${i}`]} AS (${inner})`
        })
        const head: Sql = [`WITH `, ...joinSql(ctes, ', ')]
        const tail = this.emitLevel(ctx.current)
        return [...head, ' ', ...tail]
    }

    /** Convenience: emit either a quoted identifier or, for an internal `_cte_N` ref, leave unquoted. */
    protected quoteIdentIfNotCte(name: string): string {
        if (/^_cte_\d+$/.test(name)) return name
        return this.quoteIdent(name)
    }

    /**
     * Wrap an expression as `expr AS alias` when the expression isn't already a
     * bare reference to that same identifier. Avoids redundant `name AS name`.
     */
    protected aliasIfNeeded(expr: Sql, alias: string): Sql {
        if (expr.length === 1 && typeof expr[0] === 'string' && expr[0] === this.quoteIdent(alias)) {
            return expr
        }
        return f`${expr} AS ${[this.quoteIdent(alias)]}`
    }

    /** Default placeholder style: `$1, $2, …` (postgres). Override per dialect. */
    protected placeholder(n: number): string {
        return `$${n}`
    }

    /** Default identifier quoting: ANSI double-quotes. Override per dialect. */
    protected quoteIdent(name: string): string {
        return `"${name.replace(/"/g, '""')}"`
    }

    /** Collapse a {@link Sql} fragment array into a finished {@link CompiledQuery}. */
    protected finalize(sql: Sql): CompiledQuery {
        const params: unknown[] = []
        let out = ''
        for (const frag of sql) {
            if (typeof frag === 'string') {
                out += frag
            } else {
                params.push((frag as Param).value)
                out += this.placeholder(params.length)
            }
        }
        return { sql: out, params }
    }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Walk a chained ROp leaf-first; returns ops in [leaf, …, root] order. */
function flattenChain(rootOp: BuiltinROp): BuiltinROp[] {
    const out: BuiltinROp[] = []
    let cur: BuiltinROp | undefined = rootOp
    while (cur) {
        out.push(cur)
        if (cur.kind === 'from') break
        // All non-from ROps have a `source` field of type IROp.
        cur = (cur as unknown as { source: BuiltinROp }).source
    }
    out.reverse()
    return out
}
