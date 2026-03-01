import type { DataType, Schema } from './datatypes.js'

// ---------------------------------------------------------------------------
// Abstract Expression Nodes
// ---------------------------------------------------------------------------
// These form a pure expression tree with no compilation dependencies.
// Each node represents an operation; actual compilation to PRQL/SQL
// is handled by separate Compiler implementations.

/** Base class for all expressions. Carries the TypeScript-level DataType. */
export abstract class BaseExpr<T extends DataType = DataType> {
    abstract readonly kind: string
    constructor(readonly dtype: T) { }

    // Equality
    eq(value: string | number | boolean | BaseExpr<DataType>): BooleanExpr {
        return new Eq(this, toLiteral(value))
    }

    // Null checking
    isNotNull(): BooleanExpr {
        return new IsNotNull(this)
    }

    // Aggregations (for use inside agg())
    mean(): AggExpr<'float64'> {
        return new AggExpr(new Mean(this), 'float64')
    }

    sum(): AggExpr<'float64'> {
        return new AggExpr(new Sum(this), 'float64')
    }

    min(): AggExpr<T> {
        return new AggExpr(new Min(this), this.dtype)
    }

    max(): AggExpr<T> {
        return new AggExpr(new Max(this), this.dtype)
    }

    // Sort direction (for use inside sort())
    desc(): SortExpr {
        return new SortExpr(this, 'desc')
    }

    asc(): SortExpr {
        return new SortExpr(this, 'asc')
    }
}

// ---------------------------------------------------------------------------
// Numeric expressions (int32, int64, float32, float64)
// ---------------------------------------------------------------------------

export type NumericDataType = 'int32' | 'int64' | 'float32' | 'float64'

export abstract class NumericExpr<T extends NumericDataType = NumericDataType> extends BaseExpr<T> {
    gt(value: number | BaseExpr<DataType>): BooleanExpr {
        return new Gt(this, toLiteral(value))
    }

    gte(value: number | BaseExpr<DataType>): BooleanExpr {
        return new Gte(this, toLiteral(value))
    }

    lt(value: number | BaseExpr<DataType>): BooleanExpr {
        return new Lt(this, toLiteral(value))
    }

    lte(value: number | BaseExpr<DataType>): BooleanExpr {
        return new Lte(this, toLiteral(value))
    }

    div(value: number | BaseExpr<DataType>): NumericExpr<'float64'> {
        return new Div(this, toLiteral(value))
    }
}

// ---------------------------------------------------------------------------
// String expressions
// ---------------------------------------------------------------------------

export abstract class StringExpr extends BaseExpr<'string'> {
    constructor() { super('string') }

    upper(): StringExpr {
        return new Upper(this)
    }

    lower(): StringExpr {
        return new Lower(this)
    }

    contains(pattern: string): BooleanExpr {
        return new Contains(this, new StringLiteral(pattern))
    }

    startsWith(prefix: string): BooleanExpr {
        return new StartsWith(this, new StringLiteral(prefix))
    }
}

// ---------------------------------------------------------------------------
// Boolean expressions
// ---------------------------------------------------------------------------

export abstract class BooleanExpr extends BaseExpr<'boolean'> {
    constructor() { super('boolean') }

    and(other: BooleanExpr): BooleanExpr {
        return new And(this, other)
    }

    or(other: BooleanExpr): BooleanExpr {
        return new Or(this, other)
    }
}

// ---------------------------------------------------------------------------
// Concrete expression nodes
// ---------------------------------------------------------------------------

// -- Column reference (for non-string, non-numeric, non-boolean types like date/datetime/interval) --
export class ColRef<N extends string = string, T extends DataType = DataType> extends BaseExpr<DataType> {
    readonly kind = 'col_ref' as const
    readonly name: N
    override readonly dtype: T
    constructor(name: N, dtype: T) {
        super(dtype)
        this.name = name
        this.dtype = dtype
    }
}

// -- Literals --
export class NumberLiteral extends NumericExpr<'float64'> {
    readonly kind = 'number_literal' as const
    constructor(readonly value: number) { super('float64') }
}

export class StringLiteral extends StringExpr {
    readonly kind = 'string_literal' as const
    constructor(readonly value: string) { super() }
}

export class BooleanLiteral extends BooleanExpr {
    readonly kind = 'boolean_literal' as const
    constructor(readonly value: boolean) { super() }
}

export class NullLiteral extends BaseExpr<'string'> {
    readonly kind = 'null_literal' as const
    constructor() { super('string') }
}

// -- Comparison nodes --
export class Eq extends BooleanExpr {
    readonly kind = 'eq' as const
    constructor(readonly left: BaseExpr, readonly right: BaseExpr) { super() }
}

export class Gt extends BooleanExpr {
    readonly kind = 'gt' as const
    constructor(readonly left: BaseExpr, readonly right: BaseExpr) { super() }
}

export class Gte extends BooleanExpr {
    readonly kind = 'gte' as const
    constructor(readonly left: BaseExpr, readonly right: BaseExpr) { super() }
}

export class Lt extends BooleanExpr {
    readonly kind = 'lt' as const
    constructor(readonly left: BaseExpr, readonly right: BaseExpr) { super() }
}

export class Lte extends BooleanExpr {
    readonly kind = 'lte' as const
    constructor(readonly left: BaseExpr, readonly right: BaseExpr) { super() }
}

export class IsNotNull extends BooleanExpr {
    readonly kind = 'is_not_null' as const
    constructor(readonly operand: BaseExpr) { super() }
}

// -- Boolean logic --
export class And extends BooleanExpr {
    readonly kind = 'and' as const
    constructor(readonly left: BooleanExpr, readonly right: BooleanExpr) { super() }
}

export class Or extends BooleanExpr {
    readonly kind = 'or' as const
    constructor(readonly left: BooleanExpr, readonly right: BooleanExpr) { super() }
}

// -- Arithmetic --
export class Div extends NumericExpr<'float64'> {
    readonly kind = 'div' as const
    constructor(readonly left: BaseExpr, readonly right: BaseExpr) { super('float64') }
}

// -- String operations --
export class Upper extends StringExpr {
    readonly kind = 'upper' as const
    constructor(readonly operand: StringExpr) { super() }
}

export class Lower extends StringExpr {
    readonly kind = 'lower' as const
    constructor(readonly operand: StringExpr) { super() }
}

export class Contains extends BooleanExpr {
    readonly kind = 'contains' as const
    constructor(readonly operand: StringExpr, readonly pattern: StringLiteral) { super() }
}

export class StartsWith extends BooleanExpr {
    readonly kind = 'starts_with' as const
    constructor(readonly operand: StringExpr, readonly prefix: StringLiteral) { super() }
}

// -- Aggregation nodes --
export class Mean extends BaseExpr<'float64'> {
    readonly kind = 'mean' as const
    constructor(readonly operand: BaseExpr) { super('float64') }
}

export class Sum extends BaseExpr<'float64'> {
    readonly kind = 'sum' as const
    constructor(readonly operand: BaseExpr) { super('float64') }
}

export class Min<T extends DataType = DataType> extends BaseExpr<T> {
    readonly kind = 'min' as const
    constructor(readonly operand: BaseExpr<T>) { super(operand.dtype) }
}

export class Max<T extends DataType = DataType> extends BaseExpr<T> {
    readonly kind = 'max' as const
    constructor(readonly operand: BaseExpr<T>) { super(operand.dtype) }
}

export class Count extends BaseExpr<'int64'> {
    readonly kind = 'count' as const
    constructor() { super('int64') }
}

// -- Raw SQL --
export class RawSql<T extends DataType = DataType> extends BaseExpr<T> {
    readonly kind = 'raw_sql' as const
    constructor(readonly rawSql: string, dtype: T) { super(dtype) }
}

// ---------------------------------------------------------------------------
// AggExpr wrapper — marks an expression as an aggregation result
// ---------------------------------------------------------------------------

export class AggExpr<T extends DataType = DataType> extends BaseExpr<T> {
    readonly kind = 'agg' as const
    constructor(readonly inner: BaseExpr, dtype: T) { super(dtype) }
}

// ---------------------------------------------------------------------------
// SortExpr — sort key with direction
// ---------------------------------------------------------------------------

export class SortExpr {
    constructor(
        readonly expr: BaseExpr,
        readonly direction: 'asc' | 'desc',
    ) { }
}

// ---------------------------------------------------------------------------
// Col — typed column that extends the right expression subclass
// ---------------------------------------------------------------------------

// We need Col to extend different base classes depending on the DataType.
// TypeScript doesn't support conditional base classes directly, so we use
// a factory function that returns the appropriately-typed expression.

/** A typed column reference. N is the literal column name, T is the DataType. */
export type Col<N extends string = string, T extends DataType = DataType, S extends Schema = Schema> =
    T extends 'string' ? StringCol<N> :
    T extends NumericDataType ? NumericCol<N, T> :
    T extends 'boolean' ? BooleanCol<N> :
    ColRef<N, T>

export class StringCol<N extends string = string> extends StringExpr {
    readonly kind = 'col_ref' as const
    readonly name: N
    constructor(name: N) {
        super()
        this.name = name
    }
}

export class NumericCol<N extends string = string, T extends NumericDataType = NumericDataType> extends NumericExpr<T> {
    readonly kind = 'col_ref' as const
    readonly name: N
    constructor(name: N, dtype: T) {
        super(dtype)
        this.name = name
    }
}

export class BooleanCol<N extends string = string> extends BooleanExpr {
    readonly kind = 'col_ref' as const
    readonly name: N
    constructor(name: N) {
        super()
        this.name = name
    }
}

/** Create a typed column reference. */
export function col<N extends string, T extends DataType>(name: N, dtype: T): Col<N, T> {
    if (dtype === 'string') return new StringCol(name) as Col<N, T>
    if (dtype === 'int32' || dtype === 'int64' || dtype === 'float32' || dtype === 'float64') {
        return new NumericCol(name, dtype) as Col<N, T>
    }
    if (dtype === 'boolean') return new BooleanCol(name) as Col<N, T>
    return new ColRef(name, dtype) as Col<N, T>
}

// ---------------------------------------------------------------------------
// Factory functions
// ---------------------------------------------------------------------------

/** Count the number of rows in the current relation. */
export function count(): AggExpr<'int64'> {
    return new AggExpr(new Count(), 'int64')
}

/** Embed a raw SQL expression with an explicit return type. */
export function sql<T extends DataType>(rawSql: string, dtype: T): BaseExpr<T> {
    return new RawSql(rawSql, dtype)
}

// ---------------------------------------------------------------------------
// Helper: convert JS value or Expr to a literal Expr
// ---------------------------------------------------------------------------

function toLiteral(value: string | number | boolean | BaseExpr): BaseExpr {
    if (value instanceof BaseExpr) return value
    if (typeof value === 'string') return new StringLiteral(value)
    if (typeof value === 'boolean') return new BooleanLiteral(value)
    return new NumberLiteral(value)
}
