import type { DataType, Schema } from './datatypes.js'
import {
    type IOp, type IExpr, _registerOpToExpr,
    ColRefOp, NumberLiteralOp, StringLiteralOp, BooleanLiteralOp,
    DatetimeLiteralOp,
    EqOp, GtOp, GteOp, LtOp, LteOp, IsNotNullOp,
    AndOp, OrOp, DivOp,
    UpperOp, LowerOp, ContainsOp, StartsWithOp,
    MeanOp, SumOp, MinOp, MaxOp, CountOp,
    RawSqlOp, AggOp, SortSpec,
} from './ops.js'

// ---------------------------------------------------------------------------
// opToExpr — wraps an IOp in the appropriate Expr subclass
// ---------------------------------------------------------------------------

export type NumericDataType = 'int32' | 'int64' | 'float32' | 'float64'

export function opToExpr(op: IOp<'string'>): StringExpr
export function opToExpr(op: IOp<'boolean'>): BooleanExpr
export function opToExpr<T extends NumericDataType>(op: IOp<T>): NumericExpr<T>
export function opToExpr<T extends DataType>(op: IOp<T>): BaseExpr<T>
export function opToExpr<T extends DataType>(op: IOp<T>): BaseExpr<T> {
    const d = op.dtype
    if (d === 'string') return new OpStringExpr(op as IOp<'string'>) as unknown as BaseExpr<T>
    if (d === 'int32' || d === 'int64' || d === 'float32' || d === 'float64')
        return new OpNumericExpr(op as IOp<any>) as unknown as BaseExpr<T>
    if (d === 'boolean') return new OpBooleanExpr(op as IOp<'boolean'>) as unknown as BaseExpr<T>
    return new OpExpr(op) as unknown as BaseExpr<T>
}

_registerOpToExpr(opToExpr as <T extends DataType>(op: IOp<T>) => IExpr<T>)

// ---------------------------------------------------------------------------
// Abstract Expression classes (public-facing API)
// ---------------------------------------------------------------------------

export abstract class BaseExpr<T extends DataType = DataType> implements IExpr<T> {
    abstract readonly dtype: T
    abstract toOp(): IOp<T>
    toExpr(): this { return this }

    eq(value: string | number | boolean | BaseExpr<DataType>): BooleanExpr {
        return opToExpr(new EqOp(this.toOp(), toOpValue(value)))
    }
    isNotNull(): BooleanExpr {
        return opToExpr(new IsNotNullOp(this.toOp()))
    }
    mean(): AggExpr<'float64'> {
        return new AggExpr(new AggOp(new MeanOp(this.toOp()), 'float64'))
    }
    sum(): AggExpr<'float64'> {
        return new AggExpr(new AggOp(new SumOp(this.toOp()), 'float64'))
    }
    min(): AggExpr<T> {
        return new AggExpr(new AggOp(new MinOp(this.toOp()), this.dtype))
    }
    max(): AggExpr<T> {
        return new AggExpr(new AggOp(new MaxOp(this.toOp()), this.dtype))
    }
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

export abstract class NumericExpr<T extends NumericDataType = NumericDataType> extends BaseExpr<T> {
    gt(value: number | NumericExpr): BooleanExpr {
        return opToExpr(new GtOp(this.toOp(), toOpValue(value)))
    }
    gte(value: number | NumericExpr): BooleanExpr {
        return opToExpr(new GteOp(this.toOp(), toOpValue(value)))
    }
    lt(value: number | NumericExpr): BooleanExpr {
        return opToExpr(new LtOp(this.toOp(), toOpValue(value)))
    }
    lte(value: number | NumericExpr): BooleanExpr {
        return opToExpr(new LteOp(this.toOp(), toOpValue(value)))
    }
    div(value: number | NumericExpr): NumericExpr<'float64'> {
        return opToExpr(new DivOp(this.toOp(), toOpValue(value)))
    }
}

// ---------------------------------------------------------------------------
// String expressions
// ---------------------------------------------------------------------------

export abstract class StringExpr extends BaseExpr<'string'> {
    readonly dtype = 'string' as const
    upper(): StringExpr {
        return new UpperOp(this.toOp()).toExpr() as unknown as StringExpr
    }
    lower(): StringExpr {
        return new LowerOp(this.toOp()).toExpr() as unknown as StringExpr
    }
    contains(pattern: string): BooleanExpr {
        return opToExpr(new ContainsOp(this.toOp(), new StringLiteralOp(pattern)))
    }
    startsWith(prefix: string): BooleanExpr {
        return opToExpr(new StartsWithOp(this.toOp(), new StringLiteralOp(prefix)))
    }
}

// ---------------------------------------------------------------------------
// Boolean expressions
// ---------------------------------------------------------------------------

export abstract class BooleanExpr extends BaseExpr<'boolean'> {
    readonly dtype = 'boolean' as const
    and(other: BooleanExpr): BooleanExpr {
        return opToExpr(new AndOp(this.toOp(), other.toOp()))
    }
    or(other: BooleanExpr): BooleanExpr {
        return opToExpr(new OrOp(this.toOp(), other.toOp()))
    }
}

// ---------------------------------------------------------------------------
// Generic Op-wrapping Expr implementations (internal)
// ---------------------------------------------------------------------------

class OpExpr<T extends DataType = DataType> extends BaseExpr<T> {
    readonly dtype: T
    constructor(private readonly _op: IOp<T>) {
        super()
        this.dtype = _op.dtype
    }
    toOp(): IOp<T> { return this._op }
}

class OpNumericExpr<T extends NumericDataType = NumericDataType> extends NumericExpr<T> {
    readonly dtype: T
    constructor(private readonly _op: IOp<T>) {
        super()
        this.dtype = _op.dtype
    }
    toOp(): IOp<T> { return this._op }
}

class OpStringExpr extends StringExpr {
    constructor(private readonly _op: IOp<'string'>) { super() }
    override toOp(): IOp<'string'> { return this._op }
}

class OpBooleanExpr extends BooleanExpr {
    constructor(private readonly _op: IOp<'boolean'>) { super() }
    override toOp(): IOp<'boolean'> { return this._op }
}

// ---------------------------------------------------------------------------
// Column references (public-facing typed wrappers)
// ---------------------------------------------------------------------------

export type Col<N extends string = string, T extends DataType = DataType, S extends Schema = Schema> =
    T extends 'string' ? StringCol<N> :
    T extends NumericDataType ? NumericCol<N, T> :
    T extends 'boolean' ? BooleanCol<N> :
    ColRef<N, T>

export class StringCol<N extends string = string> extends StringExpr {
    readonly name: N
    private readonly _op: ColRefOp<N, 'string'>
    constructor(name: N) {
        super()
        this.name = name
        this._op = new ColRefOp(name, 'string')
    }
    override toOp(): ColRefOp<N, 'string'> { return this._op }
}

export class NumericCol<N extends string = string, T extends NumericDataType = NumericDataType> extends NumericExpr<T> {
    readonly dtype: T
    readonly name: N
    private readonly _op: ColRefOp<N, T>
    constructor(name: N, dtype: T) {
        super()
        this.name = name
        this.dtype = dtype
        this._op = new ColRefOp(name, dtype)
    }
    override toOp(): ColRefOp<N, T> { return this._op }
}

export class BooleanCol<N extends string = string> extends BooleanExpr {
    readonly name: N
    private readonly _op: ColRefOp<N, 'boolean'>
    constructor(name: N) {
        super()
        this.name = name
        this._op = new ColRefOp(name, 'boolean')
    }
    override toOp(): ColRefOp<N, 'boolean'> { return this._op }
}

export class ColRef<N extends string = string, T extends DataType = DataType> extends BaseExpr<T> {
    readonly dtype: T
    readonly name: N
    private readonly _op: ColRefOp<N, T>
    constructor(name: N, dtype: T) {
        super()
        this.name = name
        this.dtype = dtype
        this._op = new ColRefOp(name, dtype)
    }
    override toOp(): ColRefOp<N, T> { return this._op }
}

export function col<N extends string, T extends DataType>(name: N, dtype: T): Col<N, T> {
    if (dtype === 'string') return new StringCol(name) as Col<N, T>
    if (dtype === 'int32' || dtype === 'int64' || dtype === 'float32' || dtype === 'float64') {
        return new NumericCol(name, dtype) as Col<N, T>
    }
    if (dtype === 'boolean') return new BooleanCol(name) as Col<N, T>
    return new ColRef(name, dtype) as Col<N, T>
}

// ---------------------------------------------------------------------------
// AggExpr — marks an expression as an aggregation result
// ---------------------------------------------------------------------------

export class AggExpr<T extends DataType = DataType> extends BaseExpr<T> {
    readonly dtype: T
    constructor(private readonly _op: AggOp<T>) {
        super()
        this.dtype = _op.dtype
    }
    override toOp(): AggOp<T> { return this._op }
}

// ---------------------------------------------------------------------------
// SortExpr — sort key with direction (public-facing)
// ---------------------------------------------------------------------------

export class SortExpr {
    constructor(
        readonly expr: BaseExpr,
        readonly direction: 'asc' | 'desc',
    ) { }
    toSortSpec(): SortSpec {
        return new SortSpec(this.expr.toOp(), this.direction)
    }
}

// ---------------------------------------------------------------------------
// Factory functions
// ---------------------------------------------------------------------------

export function count(): AggExpr<'int64'> {
    return new AggExpr(new AggOp(new CountOp(), 'int64'))
}

export function sql<T extends DataType>(rawSql: string, dtype: T): BaseExpr<T> {
    return opToExpr(new RawSqlOp(rawSql, dtype))
}

export type JsType = string | number | boolean | Date
export type InferDtype<JS extends JsType> =
    JS extends string ? 'string'
    : JS extends number ? 'float64'
    : JS extends boolean ? 'boolean'
    : JS extends Date ? 'datetime'
    : never

export function lit<JS extends JsType>(value: JS): BaseExpr<InferDtype<JS>> {
    if (typeof value === 'string') return opToExpr(new StringLiteralOp(value)) as any
    if (typeof value === 'boolean') return opToExpr(new BooleanLiteralOp(value)) as any
    if (typeof value === 'number') return opToExpr(new NumberLiteralOp(value)) as any
    if (value instanceof Date) return opToExpr(new DatetimeLiteralOp(value)) as any
    throw new Error(`Unsupported JS value type: ${typeof value}`)
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

function toOpValue(value: string | number | boolean | Date | BaseExpr): IOp {
    if (value instanceof BaseExpr) return value.toOp()
    if (typeof value === 'string') return new StringLiteralOp(value)
    if (typeof value === 'boolean') return new BooleanLiteralOp(value)
    if (typeof value === 'number') return new NumberLiteralOp(value)
    if (value instanceof Date) return new DatetimeLiteralOp(value)
    throw new Error(`Unsupported value type: ${typeof value}`)
}