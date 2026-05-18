import {
    type ROpPlanHandlers,
    type SqlVOp,
    type VOpHandlers,
    type SqlCompiler,
    closeLevel,
} from './compiler.js'
import { f, param, type Sql } from './types.js'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function infix(self: SqlCompiler, left: SqlVOp, op: string, right: SqlVOp): Sql {
    return f`${self.compileVOp(left)} ${[op]} ${self.compileVOp(right)}`
}

function paren(s: Sql): Sql {
    return f`(${s})`
}

// ---------------------------------------------------------------------------
// VOp handlers — ANSI defaults
// ---------------------------------------------------------------------------

// The explicit return type annotation on the IIFE prevents TS4023/4094 errors
// caused by inferring private/non-exported field types from `tybis`. The
// `satisfies` clause inside enforces exhaustiveness — adding a new
// `SqlVOp` kind without a handler is a compile error here.
export const ANSI_V_HANDLERS: VOpHandlers<SqlCompiler> = ({
    // ---- Column reference ----
    col_ref(op) {
        return [(this as SqlCompiler)['quoteIdent'](op.name)]
    },

    // ---- Literals ----
    int_literal(op) {
        return [String(op.value)]
    },
    float_literal(op) {
        const v = op.value
        if (Number.isNaN(v)) return [`'NaN'`]
        if (!Number.isFinite(v)) return [v > 0 ? `'Infinity'` : `'-Infinity'`]
        return [String(v)]
    },
    string_literal(op) {
        return [param(op.value)]
    },
    boolean_literal(op) {
        return [op.value ? 'TRUE' : 'FALSE']
    },
    null_literal(_op) {
        return ['NULL']
    },
    datetime_literal(op) {
        return [param(op.value.toISOString())]
    },
    date_literal(op) {
        return [param(op.value.toISOString().split('T')[0])]
    },
    time_literal(op) {
        const iso = op.value.toISOString()
        const t = iso.split('T')[1]?.replace(/Z$/, '') ?? ''
        return [param(t)]
    },
    interval_literal(op) {
        return [param(op.value)]
    },
    uuid_literal(op) {
        return [param(op.value)]
    },

    // ---- Generic ----
    is_null(op) {
        return f`${this.compileVOp(op.operand as SqlVOp)} IS NULL`
    },
    is_not_null(op) {
        return f`${this.compileVOp(op.operand as SqlVOp)} IS NOT NULL`
    },
    count(_op) {
        return ['COUNT(*)']
    },
    raw_sql(op) {
        return [op.rawSql]
    },

    // ---- Comparison ----
    eq(op) {
        return infix(this, op.left as SqlVOp, '=', op.right as SqlVOp)
    },
    gt(op) {
        return infix(this, op.left as SqlVOp, '>', op.right as SqlVOp)
    },
    gte(op) {
        return infix(this, op.left as SqlVOp, '>=', op.right as SqlVOp)
    },
    lt(op) {
        return infix(this, op.left as SqlVOp, '<', op.right as SqlVOp)
    },
    lte(op) {
        return infix(this, op.left as SqlVOp, '<=', op.right as SqlVOp)
    },
    min(op) {
        return f`MIN(${this.compileVOp(op.operand as SqlVOp)})`
    },
    max(op) {
        return f`MAX(${this.compileVOp(op.operand as SqlVOp)})`
    },

    // ---- Boolean logic ----
    not(op) {
        return f`NOT ${paren(this.compileVOp(op.operand as SqlVOp))}`
    },
    and(op) {
        const l = paren(this.compileVOp(op.left as SqlVOp))
        const r = paren(this.compileVOp(op.right as SqlVOp))
        return f`${l} AND ${r}`
    },
    or(op) {
        const l = paren(this.compileVOp(op.left as SqlVOp))
        const r = paren(this.compileVOp(op.right as SqlVOp))
        return f`${l} OR ${r}`
    },

    // ---- Arithmetic ----
    add(op) {
        return paren(infix(this, op.left as SqlVOp, '+', op.right as SqlVOp))
    },
    sub(op) {
        return paren(infix(this, op.left as SqlVOp, '-', op.right as SqlVOp))
    },
    mul(op) {
        return paren(infix(this, op.left as SqlVOp, '*', op.right as SqlVOp))
    },
    div(op) {
        return paren(infix(this, op.left as SqlVOp, '/', op.right as SqlVOp))
    },
    sum(op) {
        return f`SUM(${this.compileVOp(op.operand as SqlVOp)})`
    },
    mean(op) {
        return f`AVG(${this.compileVOp(op.operand as SqlVOp)})`
    },

    // ---- String ----
    upper(op) {
        return f`UPPER(${this.compileVOp(op.operand as SqlVOp)})`
    },
    lower(op) {
        return f`LOWER(${this.compileVOp(op.operand as SqlVOp)})`
    },
    contains(op) {
        return f`POSITION(${this.compileVOp(op.pattern as SqlVOp)} IN ${this.compileVOp(op.operand as SqlVOp)}) > 0`
    },
    starts_with(op) {
        const operand = this.compileVOp(op.operand as SqlVOp)
        const prefix = this.compileVOp(op.prefix as SqlVOp)
        return f`SUBSTRING(${operand} FROM 1 FOR LENGTH(${prefix})) = ${prefix}`
    },

    // ---- Temporal ----
    temporal_to_string(op) {
        return f`TO_CHAR(${this.compileVOp(op.operand as SqlVOp)}, ${[param(op.format)]})`
    },
} satisfies VOpHandlers<SqlCompiler>)

// ---------------------------------------------------------------------------
// ROp planner handlers — level-boundary rules
// ---------------------------------------------------------------------------

export const ANSI_R_HANDLERS: ROpPlanHandlers<SqlCompiler> = ({
    from(_op, _ctx) {
        // Handled inline by SqlCompiler.planROp — the chain head is always FromOp
        // and is consumed before this dispatcher is invoked.
        throw new Error('FromOp must be the first op in the chain')
    },

    filter(op, ctx) {
        const lvl = ctx.current
        // Boundary: filter cannot follow group or an explicit select.
        if (lvl.group || lvl.select) {
            const sourceSchema = op.source.schema()
            closeLevel(ctx, sourceSchema)
        }
        ctx.current.filters.push(op.condition)
    },

    derive(op, ctx) {
        const lvl = ctx.current
        if (lvl.group || lvl.select) {
            const sourceSchema = op.source.schema()
            closeLevel(ctx, sourceSchema)
        }
        for (const pair of op.derivations) {
            ctx.current.derives.push(pair)
        }
    },

    select(op, ctx) {
        const lvl = ctx.current
        if (lvl.group || lvl.derives.length > 0 || lvl.select) {
            const sourceSchema = op.source.schema()
            closeLevel(ctx, sourceSchema)
        }
        ctx.current.select = op.selections.slice()
    },

    group(op, ctx) {
        const lvl = ctx.current
        if (lvl.group || lvl.derives.length > 0 || lvl.select) {
            const sourceSchema = op.source.schema()
            closeLevel(ctx, sourceSchema)
        }
        ctx.current.group = {
            keys: op.keys.slice(),
            aggs: op.aggregations.slice(),
        }
    },

    sort(op, ctx) {
        const lvl = ctx.current
        if (lvl.limit !== undefined) {
            const sourceSchema = op.source.schema()
            closeLevel(ctx, sourceSchema)
        }
        ctx.current.sort = op.keys.slice()
    },

    take(op, ctx) {
        const lvl = ctx.current
        if (lvl.limit !== undefined) {
            const sourceSchema = op.source.schema()
            closeLevel(ctx, sourceSchema)
        }
        ctx.current.limit = op.n
    },
} satisfies ROpPlanHandlers<SqlCompiler>)
