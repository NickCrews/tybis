/**
 * Fragment-based SQL representation.
 *
 * A {@link Sql} value is a flat array of {@link SqlFragment}s — each one is
 * either a string of literal SQL text or a {@link Param} placeholder for a
 * runtime value. The placeholders are resolved into the dialect's parameter
 * marker ($1, ?, etc.) by {@link SqlCompiler.finalize}.
 */
export type Param = { readonly value: unknown }
export type SqlFragment = string | Param
export type Sql = SqlFragment[]

/** Final compiled output: a SQL string plus an ordered array of parameter values. */
export type CompiledQuery = { sql: string; params: unknown[] }

/** Wrap an arbitrary JS value as a parameter placeholder. */
export const param = (value: unknown): Param => ({ value })

/**
 * Tagged template for composing Sql fragments naturally.
 *
 * @example
 * f`strpos(${this.compileVOp(op.operand)}, ${this.compileVOp(op.pattern)}) > 0`
 */
export function f(strings: TemplateStringsArray, ...values: Sql[]): Sql {
    const out: Sql = []
    for (let i = 0; i < strings.length; i++) {
        const s = strings[i]
        if (s !== undefined && s !== '') {
            out.push(s)
        }
        if (i < values.length) {
            const v = values[i]
            if (v !== undefined) {
                for (const frag of v) {
                    out.push(frag)
                }
            }
        }
    }
    return out
}

/** Helper: join an array of {@link Sql} fragments with a separator string. */
export function joinSql(parts: Sql[], sep: string): Sql {
    const out: Sql = []
    for (let i = 0; i < parts.length; i++) {
        if (i > 0) out.push(sep)
        const p = parts[i]
        if (p !== undefined) {
            for (const frag of p) out.push(frag)
        }
    }
    return out
}
