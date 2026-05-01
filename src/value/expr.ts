import { type DataType, InferDtype, IntoDtype } from '../datatype.js'
import * as dt from '../datatype.js'
import type { DataShape, InferDataShape } from '../datashape.js'
import * as ops from './ops.js'
import { IVOp, IVExpr, IsVExprSymbol, isVExpr } from './core.js'
import * as cmp from './compare.js'
import { isVOp } from './core.js'
import { registerVOpToVExpr } from './base-op.js'
import { AcceptableJsVal, litOp } from './lit.js'

// ---------------------------------------------------------------------------
// opToExpr — wraps an IVOp in the appropriate Expr subclass
// ---------------------------------------------------------------------------

export type VExpr<DT extends DataType = DataType, DS extends DataShape = DataShape> =
    DT extends { typecode: 'null' } ? NullExpr<DS> :
    DT extends { typecode: 'string' } ? StringExpr<DS> :
    DT extends dt.NumericDataType ? NumericExpr<DT, DS> :
    DT extends { typecode: 'boolean' } ? BooleanExpr<DS> :
    DT extends { typecode: 'date' } ? DateExpr<DS> :
    DT extends { typecode: 'time' } ? TimeExpr<DS> :
    DT extends { typecode: 'datetime' } ? DateTimeExpr<DS> :
    DT extends { typecode: 'uuid' } ? UUIDExpr<DS> :
    DT extends { typecode: 'interval' } ? IntervalExpr<DS> :
    never

export function vOpToVExpr<DT extends DataType, DS extends DataShape>(op: IVOp<DT, DS>): VExpr<DT, DS> {
    const d = op.dtype()
    if (d.typecode === 'null') return new NullExpr(op as IVOp<{ typecode: 'null' }, DS>) as VExpr<DT, DS>
    if (d.typecode === 'string') return new StringExpr(op as IVOp<{ typecode: 'string' }, DS>) as VExpr<DT, DS>
    if (d.typecode === 'int') return new NumericExpr(op as IVOp<dt.NumericDataType, DS>) as VExpr<DT, DS>
    if (d.typecode === 'float') return new NumericExpr(op as IVOp<dt.NumericDataType, DS>) as VExpr<DT, DS>
    if (d.typecode === 'boolean') return new BooleanExpr(op as IVOp<{ typecode: 'boolean' }, DS>) as VExpr<DT, DS>
    if (d.typecode === 'date') return new DateExpr(op as IVOp<{ typecode: 'date' }, DS>) as VExpr<DT, DS>
    if (d.typecode === 'time') return new TimeExpr(op as IVOp<{ typecode: 'time' }, DS>) as VExpr<DT, DS>
    if (d.typecode === 'datetime') return new DateTimeExpr(op as IVOp<{ typecode: 'datetime' }, DS>) as VExpr<DT, DS>
    if (d.typecode === 'uuid') return new UUIDExpr(op as IVOp<{ typecode: 'uuid' }, DS>) as VExpr<DT, DS>
    if (d.typecode === 'interval') return new IntervalExpr(op as IVOp<{ typecode: 'interval' }, DS>) as VExpr<DT, DS>
    throw new Error(`Unsupported dtype in opToExpr: ${(d satisfies never)}`)
}
registerVOpToVExpr(vOpToVExpr)



// ---------------------------------------------------------------------------
// Abstract Expression classes (public-facing API)
// ---------------------------------------------------------------------------

export abstract class BaseVExpr<DT extends DataType = DataType, DS extends DataShape = DataShape> implements IVExpr<DT, DS> {
    constructor(private readonly _op: IVOp<DT, DS>) { }
    [IsVExprSymbol] = true as const
    dtype() { return this._op.dtype() }
    dshape() { return this._op.dshape() }
    toOp() { return this._op }
}

export class GenericVExpr<DT extends DataType = DataType, DS extends DataShape = DataShape> extends BaseVExpr<DT, DS> {

    isNotNull() {
        return vOpToVExpr(new ops.IsNotNullOp(this.toOp()))
    }

    isNull() {
        return vOpToVExpr(new ops.IsNullOp(this.toOp()))
    }

    eq<O extends cmp.IntoValueComparableTo<DT>>(other: O) {
        const op = cmp.coerceToComparable(this.dtype(), other)
        return vOpToVExpr(new ops.EqOp(this.toOp(), op))
    }
    gt<O extends cmp.IntoValueComparableTo<DT>>(other: O) {
        const op = cmp.coerceToComparable(this.dtype(), other)
        return vOpToVExpr(new ops.GtOp(this.toOp(), op))
    }
    gte<O extends cmp.IntoValueComparableTo<DT>>(other: O) {
        const op = cmp.coerceToComparable(this.dtype(), other)
        return vOpToVExpr(new ops.GteOp(this.toOp(), op))
    }
    lt<O extends cmp.IntoValueComparableTo<DT>>(other: O) {
        const op = cmp.coerceToComparable(this.dtype(), other)
        return vOpToVExpr(new ops.LtOp(this.toOp(), op))
    }
    lte<O extends cmp.IntoValueComparableTo<DT>>(other: O) {
        const op = cmp.coerceToComparable(this.dtype(), other)
        return vOpToVExpr(new ops.LteOp(this.toOp(), op))
    }
    min() {
        return vOpToVExpr(new ops.MinOp(this.toOp()))
    }
    max() {
        return vOpToVExpr(new ops.MaxOp(this.toOp()))
    }
    desc() {
        return new SortExpr(this, 'desc')
    }
    asc() {
        return new SortExpr(this, 'asc')
    }
}

export class NullExpr<DS extends DataShape = DataShape> extends GenericVExpr<{ typecode: 'null' }, DS> {
    // no methods yet, but could add null-specific things here if desired
}

// ---------------------------------------------------------------------------
// Numeric expressions (int32, int64, float32, float64)
// ---------------------------------------------------------------------------

export class NumericExpr<DT extends dt.NumericDataType = dt.NumericDataType, DS extends DataShape = DataShape> extends GenericVExpr<DT, DS> {
    add<O extends number | IVExpr<dt.NumericDataType, any>>(other: O) {
        return vOpToVExpr(new ops.AddOp(this.toOp(), ops.toOpValue(other)))
    }
    sub<O extends number | IVExpr<dt.NumericDataType, any>>(other: O) {
        return vOpToVExpr(new ops.SubOp(this.toOp(), ops.toOpValue(other)))
    }
    mul<O extends number | IVExpr<dt.NumericDataType, any>>(other: O) {
        return vOpToVExpr(new ops.MulOp(this.toOp(), ops.toOpValue(other)))
    }
    div<O extends number | IVExpr<dt.NumericDataType, any>>(other: O) {
        return vOpToVExpr(new ops.DivOp(this.toOp(), ops.toOpValue(other)))
    }
    sum() {
        return vOpToVExpr(new ops.SumOp(this.toOp()))
    }
    mean() {
        return vOpToVExpr(new ops.MeanOp(this.toOp()))
    }
}

// ---------------------------------------------------------------------------
// String expressions
// ---------------------------------------------------------------------------

export class StringExpr<DS extends DataShape = DataShape> extends GenericVExpr<dt.DTString, DS> {
    upper() {
        return vOpToVExpr(new ops.UpperOp(this.toOp()))
    }
    lower() {
        return vOpToVExpr(new ops.LowerOp(this.toOp()))
    }
    contains<O extends IntoValueOfType<'string', any>>(pattern: O) {
        const op = intoValueOfType(pattern, { typecode: 'string' })
        return vOpToVExpr(new ops.ContainsOp(this.toOp(), op))
    }
    startsWith<O extends IntoValueOfType<'string', any>>(prefix: O) {
        const op = intoValueOfType(prefix, { typecode: 'string' })
        return vOpToVExpr(new ops.StartsWithOp(this.toOp(), op))
    }
}
type IntoValueOfType<DT extends IntoDtype, DS extends DataShape = DataShape> =
    | AcceptableJsVal<DT>
    | IVExpr<InferDtype<DT>, DS>
    | IVOp<InferDtype<DT>, DS, any>

function intoValueOfType<TargetDT extends IntoDtype, ArgDS extends DataShape>(value: IntoValueOfType<TargetDT, ArgDS>, targetDtype: TargetDT): IVOp<dt.InferDtype<TargetDT>, InferDataShape<ArgDS>> {
    const target = dt.dtype(targetDtype)
    let vop: IVOp<any, any>;
    if (isVOp(value)) {
        vop = value;
    } else if (isVExpr(value)) {
        vop = value.toOp();
    } else {
        vop = litOp(value as any, targetDtype)
    }
    const vtype = vop.dtype()
    if (dt.eq(vtype, target)) {
        return vop
    } else {
        throw new Error(`Expected a value of type ${JSON.stringify(targetDtype)}, but got an IVOp with dtype ${JSON.stringify(vtype)}`)
    }
}

// ---------------------------------------------------------------------------
// Boolean expressions
// ---------------------------------------------------------------------------

export class BooleanExpr<DS extends DataShape = DataShape> extends GenericVExpr<dt.DTBoolean, DS> {
    and<O extends boolean | IVExpr<dt.DTBoolean, any>>(other: O) {
        return vOpToVExpr(new ops.LogicalAndOp(this.toOp(), ops.toOpValue(other)))
    }
    or<O extends boolean | IVExpr<dt.DTBoolean, any>>(other: O) {
        return vOpToVExpr(new ops.LogicalOrOp(this.toOp(), ops.toOpValue(other)))
    }
    not() {
        return vOpToVExpr(new ops.LogicalNotOp(this.toOp()))
    }
}

// ---------------------------------------------------------------------------
// Date expressions
// ---------------------------------------------------------------------------

export class DateExpr<DS extends DataShape = DataShape> extends GenericVExpr<dt.DTDate, DS> {
    toString(format: string) {
        return vOpToVExpr(new ops.TemporalToStringOp(this.toOp(), format))
    }
}

// ---------------------------------------------------------------------------
// Time expressions
// ---------------------------------------------------------------------------

export class TimeExpr<DS extends DataShape = DataShape> extends GenericVExpr<dt.DTTime, DS> {
    toString(format: string) {
        return vOpToVExpr(new ops.TemporalToStringOp(this.toOp(), format))
    }
}

export class DateTimeExpr<DS extends DataShape = DataShape> extends GenericVExpr<dt.DTDateTime, DS> {
    toString(format: string) {
        return vOpToVExpr(new ops.TemporalToStringOp(this.toOp(), format))
    }
}

export class IntervalExpr<DS extends DataShape = DataShape> extends GenericVExpr<dt.DTInterval, DS> {
    // could add interval-specific methods here, e.g. to extract components like years, months, etc.
}

// ---------------------------------------------------------------------------
// UUID expressions
// ---------------------------------------------------------------------------

export class UUIDExpr<DS extends DataShape = DataShape> extends GenericVExpr<dt.DTUUID, DS> {
    // no methods yet, but could add things like uuidv4(), etc.
}

export function col<N extends string, DT extends IntoDtype>(name: N, dtype: DT) {
    const op = new ops.ColRefOp(name, dtype)
    return vOpToVExpr(op)
}

// ---------------------------------------------------------------------------
// SortExpr — sort key with direction (public-facing)
// ---------------------------------------------------------------------------

export class SortExpr {
    constructor(
        readonly expr: BaseVExpr,
        readonly direction: 'asc' | 'desc',
    ) { }
    toSortSpec() {
        return new ops.SortSpec(this.expr.toOp(), this.direction)
    }
}

// ---------------------------------------------------------------------------
// Factory functions
// ---------------------------------------------------------------------------

/**
 * Counts the number of rows. Analogous to SQL's COUNT(*). Returns a NumericExpr with dtype=int64 and dshape='scalar'.
 */
export function count() {
    return vOpToVExpr(new ops.CountOp())
}

/**
 * Creates a raw SQL expression. The caller must provide the raw SQL string, as well as the expected dtype and dshape of the result.
 * This is an escape hatch for when you need to use a function or expression that isn't natively supported by Tybis.
 * 
 * The provided dtype and dshape will ONLY be used for type-checking and expression-building purposes,
 * and will have no effect at runtime.
 * So if you pass the wrong dtype/dshape, your code might type-check but then fail at runtime, or return incorrect results.
 * Use with caution!
 * 
 * @param rawSql The raw SQL string to use. TODO in the future this should support tagged template literals for better interpolation, eg ty.sql`DATE_ADD(${col('my_date')}, INTERVAL 1 DAY)`
 * @param dtype The expected data type of the result.
 * @param dshape The expected data shape of the result.
 * @returns A VExpr representing the raw SQL expression.
 */
export function sql<DT extends DataType, DS extends DataShape>(rawSql: string, dtype: DT, dshape: DS) {
    return vOpToVExpr(new ops.RawSqlOp(rawSql, dtype, dshape))
}

/**
 * Create a scalar value expression that represents a single literal value, eg `ty.lit(42)` or `ty.lit("hello")`.
 * 
 * The dtype can be inferred from the value, or explicitly provided if needed.
 * 
 * Note how `ty.lit("name")` represents a string literal value, which is different from `myrelation.col("name")`, which represents a reference to a column named "name".
 * 
 * @param value The literal value to use.
 * @param dtype The optional data type of the literal. If not provided, it will be inferred from the value.
 * @returns A VExpr representing the literal value.
 */
export function lit<JS extends AcceptableJsVal<DT>, DT extends dt.IntoDtype | undefined = undefined>(value: JS, dtype?: DT) {
    const op = litOp(value, dtype)
    return vOpToVExpr(op)
}