import { inferDtype, type DataType, type InferDtype, type JsType, type Schema } from './datatypes.js'
import type { DataShape } from './datashape.js'
import * as ops from './ops.js'
import { IOp, IExpr, IsExprSymbol, isOp, isExpr } from './core.js'

// ---------------------------------------------------------------------------
// opToExpr — wraps an IOp in the appropriate Expr subclass
// ---------------------------------------------------------------------------

export type NumericDataType = 'int32' | 'int64' | 'float32' | 'float64'

export function opToExpr<S extends DataShape>(op: IOp<'string', S>): StringExpr<S>
export function opToExpr<S extends DataShape>(op: IOp<'boolean', S>): BooleanExpr<S>
export function opToExpr<T extends NumericDataType, S extends DataShape>(op: IOp<T, S>): NumericExpr<T, S>
export function opToExpr<S extends DataShape>(op: IOp<'date', S>): DateExpr<S>
export function opToExpr<S extends DataShape>(op: IOp<'time', S>): TimeExpr<S>
export function opToExpr<S extends DataShape>(op: IOp<'uuid', S>): UUIDExpr<S>
export function opToExpr<T extends DataType, S extends DataShape>(op: IOp<T, S>): BaseExpr<T, S>
export function opToExpr<T extends DataType, S extends DataShape>(op: IOp<T, S>): BaseExpr<T, S> {
    const d = op.dtype
    if (d === 'string') return new OpStringExpr(op as IOp<'string'>) as unknown as BaseExpr<T, S>
    if (d === 'int32' || d === 'int64' || d === 'float32' || d === 'float64')
        return new OpNumericExpr(op as IOp<any>) as unknown as BaseExpr<T, S>
    if (d === 'boolean') return new OpBooleanExpr(op as IOp<'boolean'>) as unknown as BaseExpr<T, S>
    if (d === 'date') return new OpDateExpr(op as IOp<'date'>) as unknown as BaseExpr<T, S>
    if (d === 'time') return new OpTimeExpr(op as IOp<'time'>) as unknown as BaseExpr<T, S>
    if (d === 'datetime') return new OpDateTimeExpr(op as IOp<'datetime'>) as unknown as BaseExpr<T, S>
    if (d === 'uuid') return new OpUUIDExpr(op as IOp<'uuid'>) as unknown as BaseExpr<T, S>
    return new OpExpr(op) as unknown as BaseExpr<T, S>
}

// _registerOpToExpr(opToExpr as <T extends DataType, S extends DataShape>(op: IOp<T, S>) => IExpr<T, S>)

// ---------------------------------------------------------------------------
// Abstract Expression classes (public-facing API)
// ---------------------------------------------------------------------------

export abstract class BaseExpr<T extends DataType = DataType, S extends DataShape = DataShape> implements IExpr<T, S> {
    abstract readonly dtype: T
    abstract readonly dshape: S
    abstract toOp(): IOp<T, S>
    [IsExprSymbol] = true

    isNotNull() {
        return opToExpr(new ops.IsNotNullOp(this.toOp()))
    }

    // assumes that all expressions are "comparable"
    eq(value: string | number | boolean | IExpr<DataType>) {
        return opToExpr(new ops.EqOp(this.toOp(), toOpValue(value)))
    }
    gt(value: number | IExpr<NumericDataType>) {
        return opToExpr(new ops.GtOp(this.toOp(), toOpValue(value)))
    }
    gte(value: number | IExpr<NumericDataType>) {
        return opToExpr(new ops.GteOp(this.toOp(), toOpValue(value)))
    }
    lt(value: number | IExpr<NumericDataType>) {
        return opToExpr(new ops.LtOp(this.toOp(), toOpValue(value)))
    }
    lte(value: number | IExpr<NumericDataType>) {
        return opToExpr(new ops.LteOp(this.toOp(), toOpValue(value)))
    }
    min(): BaseExpr<T, 'scalar'> {
        return opToExpr(new ops.MinOp(this.toOp()))
    }
    max(): BaseExpr<T, 'scalar'> {
        return opToExpr(new ops.MaxOp(this.toOp()))
    }
    desc() {
        return new SortExpr(this, 'desc')
    }
    asc() {
        return new SortExpr(this, 'asc')
    }
}

// ---------------------------------------------------------------------------
// Numeric expressions (int32, int64, float32, float64)
// ---------------------------------------------------------------------------

export abstract class NumericExpr<T extends NumericDataType = NumericDataType, S extends DataShape = DataShape> extends BaseExpr<T, S> {
    add(value: number | IExpr<NumericDataType>) {
        return opToExpr(new ops.AddOp(this.toOp(), toOpValue(value)))
    }
    sub(value: number | IExpr<NumericDataType>) {
        return opToExpr(new ops.SubOp(this.toOp(), toOpValue(value)))
    }
    mul(value: number | IExpr<NumericDataType>) {
        return opToExpr(new ops.MulOp(this.toOp(), toOpValue(value)))
    }
    div(value: number | IExpr<NumericDataType>) {
        return opToExpr(new ops.DivOp(this.toOp(), toOpValue(value)))
    }
    sum(): BaseExpr<'float64', 'scalar'> {
        return opToExpr(new ops.SumOp(this.toOp()))
    }
    mean(): BaseExpr<'float64', 'scalar'> {
        return opToExpr(new ops.MeanOp(this.toOp()))
    }
}

// ---------------------------------------------------------------------------
// String expressions
// ---------------------------------------------------------------------------

export abstract class StringExpr<S extends DataShape = DataShape> extends BaseExpr<'string', S> {
    readonly dtype = 'string' as const
    upper() {
        return opToExpr(new ops.UpperOp(this.toOp()))
    }
    lower() {
        return opToExpr(new ops.LowerOp(this.toOp()))
    }
    contains(pattern: string) {
        return opToExpr(new ops.ContainsOp(this.toOp(), new ops.StringLiteralOp(pattern)))
    }
    startsWith(prefix: string) {
        return opToExpr(new ops.StartsWithOp(this.toOp(), new ops.StringLiteralOp(prefix)))
    }
}

// ---------------------------------------------------------------------------
// Boolean expressions
// ---------------------------------------------------------------------------

export abstract class BooleanExpr<S extends DataShape = DataShape> extends BaseExpr<'boolean', S> {
    readonly dtype = 'boolean' as const
    and(other: IExpr<'boolean'>) {
        return opToExpr(new ops.LogicalAndOp(this.toOp(), other.toOp()))
    }
    or(other: IExpr<'boolean'>) {
        return opToExpr(new ops.LogicalOrOp(this.toOp(), other.toOp()))
    }
    not() {
        return opToExpr(new ops.LogicalNotOp(this.toOp()))
    }
}

// ---------------------------------------------------------------------------
// Date expressions
// ---------------------------------------------------------------------------

export abstract class DateExpr<S extends DataShape = DataShape> extends BaseExpr<'date', S> {
    readonly dtype = 'date' as const
    toString(format: string) {
        return opToExpr(new ops.TemporalToStringOp(this.toOp(), format))
    }
}

// ---------------------------------------------------------------------------
// Time expressions
// ---------------------------------------------------------------------------

export abstract class TimeExpr<S extends DataShape = DataShape> extends BaseExpr<'time', S> {
    readonly dtype = 'time' as const
    toString(format: string) {
        return opToExpr(new ops.TemporalToStringOp(this.toOp(), format))
    }
}

export abstract class DateTimeExpr<S extends DataShape = DataShape> extends BaseExpr<'datetime', S> {
    readonly dtype = 'datetime' as const
    toString(format: string) {
        return opToExpr(new ops.TemporalToStringOp(this.toOp(), format))
    }
}

// ---------------------------------------------------------------------------
// UUID expressions
// ---------------------------------------------------------------------------

export abstract class UUIDExpr<S extends DataShape = DataShape> extends BaseExpr<'uuid', S> {
    readonly dtype = 'uuid' as const
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

class OpDateExpr<S extends DataShape = DataShape> extends DateExpr<S> {
    readonly dshape: S
    constructor(private readonly _op: IOp<'date', S>) {
        super()
        this.dshape = _op.dshape
    }
    override toOp(): IOp<'date', S> { return this._op }
}

class OpTimeExpr<S extends DataShape = DataShape> extends TimeExpr<S> {
    readonly dshape: S
    constructor(private readonly _op: IOp<'time', S>) {
        super()
        this.dshape = _op.dshape
    }
    override toOp(): IOp<'time', S> { return this._op }
}

class OpDateTimeExpr<S extends DataShape = DataShape> extends DateTimeExpr<S> {
    readonly dshape: S
    constructor(private readonly _op: IOp<'datetime', S>) {
        super()
        this.dshape = _op.dshape
    }
    override toOp(): IOp<'datetime', S> { return this._op }
}

class OpUUIDExpr<S extends DataShape = DataShape> extends UUIDExpr<S> {
    readonly dshape: S
    constructor(private readonly _op: IOp<'uuid', S>) {
        super()
        this.dshape = _op.dshape
    }
    override toOp(): IOp<'uuid', S> { return this._op }
}

// ---------------------------------------------------------------------------
// Column references (public-facing typed wrappers)
// ---------------------------------------------------------------------------

export type Col<N extends string = string, T extends DataType = DataType, S extends Schema = Schema> =
    T extends 'string' ? StringCol<N> :
    T extends NumericDataType ? NumericCol<N, T> :
    T extends 'boolean' ? BooleanCol<N> :
    T extends 'date' ? DateCol<N> :
    T extends 'time' ? TimeCol<N> :
    T extends 'datetime' ? DateTimeCol<N> :
    T extends 'uuid' ? UUIDCol<N> :
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

export class DateCol<N extends string = string> extends DateExpr<'columnar'> {
    readonly dshape = 'columnar' as const
    readonly name: N
    private readonly _op: ops.ColRefOp<N, 'date'>
    constructor(name: N) {
        super()
        this.name = name
        this._op = new ops.ColRefOp(name, 'date')
    }
    override toOp(): ops.ColRefOp<N, 'date'> { return this._op }
}

export class TimeCol<N extends string = string> extends TimeExpr<'columnar'> {
    readonly dshape = 'columnar' as const
    readonly name: N
    private readonly _op: ops.ColRefOp<N, 'time'>
    constructor(name: N) {
        super()
        this.name = name
        this._op = new ops.ColRefOp(name, 'time')
    }
    override toOp(): ops.ColRefOp<N, 'time'> { return this._op }
}

export class DateTimeCol<N extends string = string> extends DateTimeExpr<'columnar'> {
    readonly dshape = 'columnar' as const
    readonly name: N
    private readonly _op: ops.ColRefOp<N, 'datetime'>
    constructor(name: N) {
        super()
        this.name = name
        this._op = new ops.ColRefOp(name, 'datetime')
    }
    override toOp(): ops.ColRefOp<N, 'datetime'> { return this._op }
}

export class UUIDCol<N extends string = string> extends UUIDExpr<'columnar'> {
    readonly dshape = 'columnar' as const
    readonly name: N
    private readonly _op: ops.ColRefOp<N, 'uuid'>
    constructor(name: N) {
        super()
        this.name = name
        this._op = new ops.ColRefOp(name, 'uuid')
    }
    override toOp(): ops.ColRefOp<N, 'uuid'> { return this._op }
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
    if (dtype === 'date') return new DateCol(name) as Col<N, T>
    if (dtype === 'time') return new TimeCol(name) as Col<N, T>
    if (dtype === 'datetime') return new DateTimeCol(name) as Col<N, T>
    if (dtype === 'uuid') return new UUIDCol(name) as Col<N, T>
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

export function lit<JS extends JsType>(value: JS): IExpr<InferDtype<JS>, 'scalar'> {
    const op = litOp(value)
    return opToExpr(op)
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

function litOp<JS extends JsType>(value: JS): IOp<InferDtype<JS>, 'scalar'> {
    const inferredDtype = inferDtype(value)
    type R = IOp<InferDtype<JS>, 'scalar'>
    switch (inferredDtype) {
        case 'string':
            return new ops.StringLiteralOp(value as string) as unknown as R
        case 'boolean':
            return new ops.BooleanLiteralOp(value as boolean) as unknown as R
        case 'float64':
            return new ops.NumberLiteralOp(value as number) as unknown as R
        case 'datetime':
            return new ops.DatetimeLiteralOp(value as Date) as unknown as R
        default:
            throw new Error(`Unsupported JS value type: ${inferredDtype satisfies never}`)
    }
}

function toOpValue(exprOrJs: IExpr | IOp | JsType): IOp {
    if (isOp(exprOrJs)) {
        return exprOrJs
    } else if (isExpr(exprOrJs)) {
        return exprOrJs.toOp()
    } else {
        return litOp(exprOrJs)
    }
}