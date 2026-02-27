import type { DataType, Schema } from './datatypes.js'

/**
 * Base class for all PRQL expressions. Carries both the PRQL text representation
 * and the TypeScript-level DataType for compile-time type tracking.
 */
export class Expr<T extends DataType = DataType> {
    constructor(
        protected readonly _prql: string,
        readonly dtype: T
    ) { }

    prql(): string { return this._prql }

    // Null checking
    is_not_null(): BoolExpr {
        return new BoolExpr(`${this._prql} != null`)
    }

    // Equality
    eq(value: string | number | boolean | Expr<DataType>): BoolExpr {
        const v = value instanceof Expr ? value.prql() : fmtLiteral(value)
        return new BoolExpr(`${this._prql} == ${v}`)
    }

    // Numeric comparisons
    gt(value: number | Expr<DataType>): BoolExpr {
        const v = value instanceof Expr ? value.prql() : value
        return new BoolExpr(`${this._prql} > ${v}`)
    }

    gte(value: number | Expr<DataType>): BoolExpr {
        const v = value instanceof Expr ? value.prql() : value
        return new BoolExpr(`${this._prql} >= ${v}`)
    }

    lt(value: number | Expr<DataType>): BoolExpr {
        const v = value instanceof Expr ? value.prql() : value
        return new BoolExpr(`${this._prql} < ${v}`)
    }

    lte(value: number | Expr<DataType>): BoolExpr {
        const v = value instanceof Expr ? value.prql() : value
        return new BoolExpr(`${this._prql} <= ${v}`)
    }

    div(value: number | Expr<DataType>): Expr<'float64'> {
        const v = value instanceof Expr ? value.prql() : value
        return new Expr(`${this._prql} / ${v}`, 'float64')
    }

    // Aggregations (for use inside agg())
    mean(): AggExpr<'float64'> {
        return new AggExpr(`average ${this._prql}`, 'float64')
    }

    sum(): AggExpr<'float64'> {
        return new AggExpr(`sum ${this._prql}`, 'float64')
    }

    min(): AggExpr<T> {
        return new AggExpr(`min ${this._prql}`, this.dtype)
    }

    max(): AggExpr<T> {
        return new AggExpr(`max ${this._prql}`, this.dtype)
    }

    // Sort direction (for use inside sort())
    desc(): SortExpr {
        return new SortExpr(`-${this._prql}`)
    }

    asc(): SortExpr {
        return new SortExpr(this._prql)
    }
}

/** A boolean-typed expression, used in filter(). */
export class BoolExpr extends Expr<'boolean'> {
    constructor(prql: string) {
        super(prql, 'boolean')
    }

    and(other: BoolExpr): BoolExpr {
        return new BoolExpr(`(${this._prql}) && (${other._prql})`)
    }

    or(other: BoolExpr): BoolExpr {
        return new BoolExpr(`(${this._prql}) || (${other._prql})`)
    }
}

/** An aggregation expression, produced by .mean(), .sum(), etc. or count(). */
export class AggExpr<T extends DataType> extends Expr<T> {
    constructor(prql: string, dtype: T) {
        super(prql, dtype)
    }
}

/** A sort key with direction, produced by .asc() or .desc(). */
export class SortExpr {
    constructor(readonly _prql: string) { }
}

/**
 * A typed column reference. N is the literal column name, T is the PRQL DataType,
 * S is the schema of the table this column belongs to.
 */
export class Col<N extends string, T extends DataType, S extends Schema = Schema> extends Expr<T> {
    readonly name: N

    constructor(name: N, dtype: T) {
        super(name, dtype)
        this.name = name
    }
}

/** Count the number of rows in the current relation. */
export function count(): AggExpr<'int64'> {
    return new AggExpr('count this', 'int64')
}

/** Embed a raw SQL expression with an explicit return type. */
export function sql<T extends DataType>(rawSql: string, dtype: T): Expr<T> {
    return new Expr(`s"${rawSql}"`, dtype)
}

function fmtLiteral(value: string | number | boolean): string {
    if (typeof value === 'string') return `"${value}"`
    return String(value)
}
