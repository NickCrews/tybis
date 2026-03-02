import type { DataType, DataShape, Schema } from './datatypes.js'
import {
    type IOp, type IExpr, _registerOpToExpr
} from './ops.js'
import * as ops from './ops.js'

// ---------------------------------------------------------------------------
// opToExpr — wraps an IOp in the appropriate Expr subclass
// ---------------------------------------------------------------------------

export type NumericDataType = 'int32' | 'int64' | 'float32' | 'float64'

export function opToExpr<S extends DataShape>(op: IOp<'string', S>): StringExpr<S>
export function opToExpr<S extends DataShape>(op: IOp<'boolean', S>): BooleanExpr<S>
export function opToExpr<T extends NumericDataType, S extends DataShape>(op: IOp<T, S>): NumericExpr<T, S>
export function opToExpr<T extends DataType, S extends DataShape>(op: IOp<T, S>): BaseExpr<T, S>
export function opToExpr<T extends DataType, S extends DataShape>(op: IOp<T, S>): BaseExpr<T, S> {
    const d = op.dtype
    if (d === 'string') return new OpStringExpr(op as IOp<'string'>) as unknown as BaseExpr<T, S>
    if (d === 'int32' || d === 'int64' || d === 'float32' || d === 'float64')
        return new OpNumericExpr(op as IOp<any>) as unknown as BaseExpr<T, S>
    if (d === 'boolean') return new OpBooleanExpr(op as IOp<'boolean'>) as unknown as BaseExpr<T, S>
    return new OpExpr(op) as unknown as BaseExpr<T, S>
}

_registerOpToExpr(opToExpr as <T extends DataType, S extends DataShape>(op: IOp<T, S>) => IExpr<T, S>)

// ---------------------------------------------------------------------------
// Abstract Expression classes (public-facing API)
// ---------------------------------------------------------------------------

export abstract class BaseExpr<T extends DataType = DataType, S extends DataShape = DataShape> implements IExpr<T, S> {
    abstract readonly dtype: T
    abstract readonly dshape: S
    abstract toOp(): IOp<T, S>
    toExpr(): this { return this }

    eq(value: string | number | boolean | BaseExpr<DataType>): BooleanExpr<S> {
        return opToExpr(new ops.EqOp(this.toOp(), toOpValue(value))) as BooleanExpr<S>
    }
    isNotNull(): BooleanExpr<S> {
        return opToExpr(new ops.IsNotNullOp(this.toOp()))
    }
    mean(): BaseExpr<'float64', 'scalar'> {
        return opToExpr(new ops.MeanOp(this.toOp()))
    }
    sum(): BaseExpr<'float64', 'scalar'> {
        return opToExpr(new ops.SumOp(this.toOp()))
    }
    min(): BaseExpr<T, 'scalar'> {
        return opToExpr(new ops.MinOp(this.toOp()))
    }
    max(): BaseExpr<T, 'scalar'> {
        return opToExpr(new ops.MaxOp(this.toOp()))
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

export abstract class NumericExpr<T extends NumericDataType = NumericDataType, S extends DataShape = DataShape> extends BaseExpr<T, S> {
    gt(value: number | NumericExpr): BooleanExpr<S> {
        return opToExpr(new ops.GtOp(this.toOp(), toOpValue(value))) as BooleanExpr<S>
    }
    gte(value: number | NumericExpr): BooleanExpr<S> {
        return opToExpr(new ops.GteOp(this.toOp(), toOpValue(value))) as BooleanExpr<S>
    }
    lt(value: number | NumericExpr): BooleanExpr<S> {
        return opToExpr(new ops.LtOp(this.toOp(), toOpValue(value))) as BooleanExpr<S>
    }
    lte(value: number | NumericExpr): BooleanExpr<S> {
        return opToExpr(new ops.LteOp(this.toOp(), toOpValue(value))) as BooleanExpr<S>
    }
    add(value: number | NumericExpr): NumericExpr<'float64', S> {
        return opToExpr(new ops.AddOp(this.toOp(), toOpValue(value))) as NumericExpr<'float64', S>
    }
    sub(value: number | NumericExpr): NumericExpr<'float64', S> {
        return opToExpr(new ops.SubOp(this.toOp(), toOpValue(value))) as NumericExpr<'float64', S>
    }
    mul(value: number | NumericExpr): NumericExpr<'float64', S> {
        return opToExpr(new ops.MulOp(this.toOp(), toOpValue(value))) as NumericExpr<'float64', S>
    }
    div(value: number | NumericExpr): NumericExpr<'float64', S> {
        return opToExpr(new ops.DivOp(this.toOp(), toOpValue(value))) as NumericExpr<'float64', S>
    }
}

// ---------------------------------------------------------------------------
// String expressions
// ---------------------------------------------------------------------------

export abstract class StringExpr<S extends DataShape = DataShape> extends BaseExpr<'string', S> {
    readonly dtype = 'string' as const
    upper(): StringExpr<S> {
        return opToExpr(new ops.UpperOp(this.toOp())) as StringExpr<S>
    }
    lower(): StringExpr<S> {
        return opToExpr(new ops.LowerOp(this.toOp())) as StringExpr<S>
    }
    contains(pattern: string): BooleanExpr<S> {
        return opToExpr(new ops.ContainsOp(this.toOp(), new ops.StringLiteralOp(pattern))) as BooleanExpr<S>
    }
    startsWith(prefix: string): BooleanExpr<S> {
        return opToExpr(new ops.StartsWithOp(this.toOp(), new ops.StringLiteralOp(prefix))) as BooleanExpr<S>
    }
}

// ---------------------------------------------------------------------------
// Boolean expressions
// ---------------------------------------------------------------------------

export abstract class BooleanExpr<S extends DataShape = DataShape> extends BaseExpr<'boolean', S> {
    readonly dtype = 'boolean' as const
    and(other: BooleanExpr): BooleanExpr<S> {
        return opToExpr(new ops.AndOp(this.toOp(), other.toOp())) as BooleanExpr<S>
    }
    or(other: BooleanExpr): BooleanExpr<S> {
        return opToExpr(new ops.OrOp(this.toOp(), other.toOp())) as BooleanExpr<S>
    }
}

// ---------------------------------------------------------------------------
// Generic Op-wrapping Expr implementations (internal)
// ---------------------------------------------------------------------------

class OpExpr<T extends DataType = DataType, S extends DataShape = DataShape> extends BaseExpr<T, S> {
    readonly dtype: T
    readonly dshape: S
    constructor(private readonly _op: IOp<T, S>) {
        super()
        this.dtype = _op.dtype
        this.dshape = _op.dshape
    }
    toOp(): IOp<T, S> { return this._op }
}

class OpNumericExpr<T extends NumericDataType = NumericDataType, S extends DataShape = DataShape> extends NumericExpr<T, S> {
    readonly dtype: T
    readonly dshape: S
    constructor(private readonly _op: IOp<T, S>) {
        super()
        this.dtype = _op.dtype
        this.dshape = _op.dshape
    }
    toOp(): IOp<T, S> { return this._op }
}

class OpStringExpr<S extends DataShape = DataShape> extends StringExpr<S> {
    readonly dshape: S
    constructor(private readonly _op: IOp<'string', S>) {
        super()
        this.dshape = _op.dshape
    }
    override toOp(): IOp<'string', S> { return this._op }
}

class OpBooleanExpr<S extends DataShape = DataShape> extends BooleanExpr<S> {
    readonly dshape: S
    constructor(private readonly _op: IOp<'boolean', S>) {
        super()
        this.dshape = _op.dshape
    }
    override toOp(): IOp<'boolean', S> { return this._op }
}

// ---------------------------------------------------------------------------
// Column references (public-facing typed wrappers)
// ---------------------------------------------------------------------------

export type Col<N extends string = string, T extends DataType = DataType, S extends Schema = Schema> =
    T extends 'string' ? StringCol<N> :
    T extends NumericDataType ? NumericCol<N, T> :
    T extends 'boolean' ? BooleanCol<N> :
    ColRef<N, T>

export class StringCol<N extends string = string> extends StringExpr<'columnar'> {
    readonly dshape = 'columnar' as const
    readonly name: N
    private readonly _op: ops.ColRefOp<N, 'string'>
    constructor(name: N) {
        super()
        this.name = name
        this._op = new ops.ColRefOp(name, 'string')
    }
    override toOp(): ops.ColRefOp<N, 'string'> { return this._op }
}

export class NumericCol<N extends string = string, T extends NumericDataType = NumericDataType> extends NumericExpr<T, 'columnar'> {
    readonly dtype: T
    readonly dshape = 'columnar' as const
    readonly name: N
    private readonly _op: ops.ColRefOp<N, T>
    constructor(name: N, dtype: T) {
        super()
        this.name = name
        this.dtype = dtype
        this._op = new ops.ColRefOp(name, dtype)
    }
    override toOp(): ops.ColRefOp<N, T> { return this._op }
}

export class BooleanCol<N extends string = string> extends BooleanExpr<'columnar'> {
    readonly dshape = 'columnar' as const
    readonly name: N
    private readonly _op: ops.ColRefOp<N, 'boolean'>
    constructor(name: N) {
        super()
        this.name = name
        this._op = new ops.ColRefOp(name, 'boolean')
    }
    override toOp(): ops.ColRefOp<N, 'boolean'> { return this._op }
}

export class ColRef<N extends string = string, T extends DataType = DataType> extends BaseExpr<T, 'columnar'> {
    readonly dtype: T
    readonly dshape = 'columnar' as const
    readonly name: N
    private readonly _op: ops.ColRefOp<N, T>
    constructor(name: N, dtype: T) {
        super()
        this.name = name
        this.dtype = dtype
        this._op = new ops.ColRefOp(name, dtype)
    }
    override toOp(): ops.ColRefOp<N, T> { return this._op }
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
// SortExpr — sort key with direction (public-facing)
// ---------------------------------------------------------------------------

export class SortExpr {
    constructor(
        readonly expr: BaseExpr,
        readonly direction: 'asc' | 'desc',
    ) { }
    toSortSpec(): ops.SortSpec {
        return new ops.SortSpec(this.expr.toOp(), this.direction)
    }
}

// ---------------------------------------------------------------------------
// Factory functions
// ---------------------------------------------------------------------------

export function count(): BaseExpr<'int64', 'scalar'> {
    return opToExpr(new ops.CountOp())
}

export function sql<T extends DataType, S extends DataShape>(rawSql: string, dtype: T, dshape: S): BaseExpr<T, S> {
    return opToExpr(new ops.RawSqlOp(rawSql, dtype, dshape))
}

export type JsType = string | number | boolean | Date
export type InferDtype<JS extends JsType> =
    JS extends string ? 'string'
    : JS extends number ? 'float64'
    : JS extends boolean ? 'boolean'
    : JS extends Date ? 'datetime'
    : never

export function lit<JS extends JsType>(value: JS): BaseExpr<InferDtype<JS>> {
    if (typeof value === 'string') return opToExpr(new ops.StringLiteralOp(value)) as any
    if (typeof value === 'boolean') return opToExpr(new ops.BooleanLiteralOp(value)) as any
    if (typeof value === 'number') return opToExpr(new ops.NumberLiteralOp(value)) as any
    if (value instanceof Date) return opToExpr(new ops.DatetimeLiteralOp(value)) as any
    throw new Error(`Unsupported JS value type: ${typeof value}`)
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

function toOpValue(value: string | number | boolean | Date | BaseExpr): IOp {
    if (value instanceof BaseExpr) return value.toOp()
    if (typeof value === 'string') return new ops.StringLiteralOp(value)
    if (typeof value === 'boolean') return new ops.BooleanLiteralOp(value)
    if (typeof value === 'number') return new ops.NumberLiteralOp(value)
    if (value instanceof Date) return new ops.DatetimeLiteralOp(value)
    throw new Error(`Unsupported value type: ${typeof value}`)
}