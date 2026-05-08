import type { BuiltinVOp } from 'tybis'
import {
    type ROpPlanHandlers,
    type VOpHandlers,
    type SqlCompiler,
    closeLevel,
} from './compiler.js'
import { f, param, type Sql } from './types.js'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function infix(self: SqlCompiler, left: BuiltinVOp, op: string, right: BuiltinVOp): Sql {
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
// `BuiltinVOp` kind without a handler is a compile error here.
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
        return f`${this.compileVOp(op.operand as BuiltinVOp)} IS NULL`
    },
    is_not_null(op) {
        return f`${this.compileVOp(op.operand as BuiltinVOp)} IS NOT NULL`
    },
    count(_op) {
        return ['COUNT(*)']
    },
    raw_sql(op) {
        return [op.rawSql]
    },

    // ---- Comparison ----
    eq(op) {
        return infix(this, op.left as BuiltinVOp, '=', op.right as BuiltinVOp)
    },
    gt(op) {
        return infix(this, op.left as BuiltinVOp, '>', op.right as BuiltinVOp)
    },
    gte(op) {
        return infix(this, op.left as BuiltinVOp, '>=', op.right as BuiltinVOp)
    },
    lt(op) {
        return infix(this, op.left as BuiltinVOp, '<', op.right as BuiltinVOp)
    },
    lte(op) {
        return infix(this, op.left as BuiltinVOp, '<=', op.right as BuiltinVOp)
    },
    min(op) {
        return f`MIN(${this.compileVOp(op.operand as BuiltinVOp)})`
    },
    max(op) {
        return f`MAX(${this.compileVOp(op.operand as BuiltinVOp)})`
    },

    // ---- Boolean logic ----
    not(op) {
        return f`NOT ${paren(this.compileVOp(op.operand as BuiltinVOp))}`
    },
    and(op) {
        const l = paren(this.compileVOp(op.left as BuiltinVOp))
        const r = paren(this.compileVOp(op.right as BuiltinVOp))
        return f`${l} AND ${r}`
    },
    or(op) {
        const l = paren(this.compileVOp(op.left as BuiltinVOp))
        const r = paren(this.compileVOp(op.right as BuiltinVOp))
        return f`${l} OR ${r}`
    },

    // ---- Arithmetic ----
    add(op) {
        return paren(infix(this, op.left as BuiltinVOp, '+', op.right as BuiltinVOp))
    },
    sub(op) {
        return paren(infix(this, op.left as BuiltinVOp, '-', op.right as BuiltinVOp))
    },
    mul(op) {
        return paren(infix(this, op.left as BuiltinVOp, '*', op.right as BuiltinVOp))
    },
    div(op) {
        return paren(infix(this, op.left as BuiltinVOp, '/', op.right as BuiltinVOp))
    },
    sum(op) {
        return f`SUM(${this.compileVOp(op.operand as BuiltinVOp)})`
    },
    mean(op) {
        return f`AVG(${this.compileVOp(op.operand as BuiltinVOp)})`
    },

    // ---- String ----
    upper(op) {
        return f`UPPER(${this.compileVOp(op.operand as BuiltinVOp)})`
    },
    lower(op) {
        return f`LOWER(${this.compileVOp(op.operand as BuiltinVOp)})`
    },
    contains(op) {
        return f`POSITION(${this.compileVOp(op.pattern as BuiltinVOp)} IN ${this.compileVOp(op.operand as BuiltinVOp)}) > 0`
    },
    starts_with(op) {
        const operand = this.compileVOp(op.operand as BuiltinVOp)
        const prefix = this.compileVOp(op.prefix as BuiltinVOp)
        return f`SUBSTRING(${operand} FROM 1 FOR LENGTH(${prefix})) = ${prefix}`
    },

    // ---- Temporal ----
    temporal_to_string(op) {
        return f`TO_CHAR(${this.compileVOp(op.operand as BuiltinVOp)}, ${[param(op.format)]})`
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
