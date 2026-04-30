/**
 * Type declarations injected into the Monaco editor so users get
 * autocomplete and type-checking for the tybis API and the `preview`
 * sandbox function.
 * 
 * Auto-generated from tybis package types.
 */

export const TYBIS_DTS = /* ts */ `declare module "tybis" { type DataShape = 'scalar' | 'columnar';
type HighestDataShape<Shapes extends DataShape[]> = Shapes extends [] ? never : 'columnar' extends Shapes[number] ? 'columnar' : 'scalar';
type IntoDataShape = DataShape | IExpr<any, any> | IOp<any, any> | InferrableJsType;
type InferDataShape<T extends IntoDataShape> = T extends DataShape ? T : T extends IExpr<any, infer S> ? S : T extends IOp<any, infer S> ? S : T extends InferrableJsType ? 'scalar' : never;

declare abstract class BaseOp<T extends DataType = DataType, S extends DataShape = DataShape> implements IOp<T, S> {
    [IsOpSymbol]: true;
    abstract readonly kind: string;
    private readonly _dtype;
    private readonly _dshape;
    constructor(dtype: T, dshape: S);
    dtype(): T;
    dshape(): S;
    toExpr(): Expr<T, S>;
    getName(): string;
}
declare class ColRefOp<N extends string = string, T extends IntoDtype = DataType> extends BaseOp<InferDtype<T>, 'columnar'> {
    readonly name: N;
    readonly kind: "col_ref";
    constructor(name: N, dtype: T);
    getName(): string;
}
type IntoIntLiteralValue = number | \`\${number}\`;
declare class IntLiteralOp<T extends DTInt = DTInt> extends BaseOp<T, 'scalar'> {
    readonly raw: IntoIntLiteralValue;
    readonly kind: "int_literal";
    readonly value: number;
    constructor(raw: IntoIntLiteralValue, dtype?: T);
}
type IntoFloatLiteralValue = number | \`\${number}\` | 'NAN' | 'nan' | 'NaN';
declare class FloatLiteralOp<T extends DTFloat = DTFloat> extends BaseOp<T, 'scalar'> {
    readonly raw: IntoFloatLiteralValue;
    readonly kind: "float_literal";
    readonly value: number;
    constructor(raw: IntoFloatLiteralValue, dtype?: T);
}
type IntoStringLiteralValue = string | boolean | number | null | Date;
declare class StringLiteralOp extends BaseOp<DTString, 'scalar'> {
    readonly raw: IntoStringLiteralValue;
    readonly kind: "string_literal";
    readonly value: string;
    constructor(raw: IntoStringLiteralValue);
}
type IntoBooleanLiteralValue = boolean | number | null | 'true' | 'false';
declare class BooleanLiteralOp extends BaseOp<DTBoolean, 'scalar'> {
    readonly raw: IntoBooleanLiteralValue;
    readonly kind: "boolean_literal";
    readonly value: boolean;
    constructor(raw: IntoBooleanLiteralValue);
}
declare class NullLiteralOp extends BaseOp<DTNull, 'scalar'> {
    readonly kind: "null_literal";
    constructor();
}
type IntoDatetimeLiteralValue = Date | string;
declare class DatetimeLiteralOp extends BaseOp<DTDateTime, 'scalar'> {
    readonly raw: IntoDatetimeLiteralValue;
    readonly kind: "datetime_literal";
    readonly value: Date;
    constructor(raw: IntoDatetimeLiteralValue);
}
type IntoDateLiteralValue = Date | string;
declare class DateLiteralOp extends BaseOp<DTDate, 'scalar'> {
    readonly raw: IntoDateLiteralValue;
    readonly kind: "date_literal";
    readonly value: Date;
    constructor(raw: IntoDateLiteralValue);
}
type IntoTimeLiteralValue = Date | string;
declare class TimeLiteralOp extends BaseOp<DTTime, 'scalar'> {
    readonly raw: IntoTimeLiteralValue;
    readonly kind: "time_literal";
    readonly value: Date;
    constructor(raw: IntoTimeLiteralValue);
}
type IntoIntervalLiteralValue = number;
type IntoUuidLiteralValue = string;
type LiteralValueCoercibleTo<T extends DataType> = T extends DTInt ? IntoIntLiteralValue : T extends DTFloat ? IntoFloatLiteralValue : T extends DTString ? IntoStringLiteralValue : T extends DTBoolean ? IntoBooleanLiteralValue : T extends DTDateTime ? IntoDatetimeLiteralValue : T extends DTDate ? IntoDateLiteralValue : T extends DTTime ? IntoTimeLiteralValue : T extends DTInterval ? IntoIntervalLiteralValue : T extends DTUUID ? IntoUuidLiteralValue : never;
type AcceptableJsVal<DT extends IntoDtype | undefined = undefined> = DT extends IntoDtype ? LiteralValueCoercibleTo<InferDtype<DT>> : InferrableJsType;
type ExplicitOrInferredDtype<JS extends InferrableJsType, DT extends IntoDtype | undefined> = DT extends IntoDtype ? InferDtype<DT> : InferDtypeFromJs<JS>;
declare class IsNotNullOp<S extends DataShape = DataShape> extends BaseOp<DTBoolean, S> {
    readonly operand: IOp<DataType, S>;
    readonly kind: "is_not_null";
    constructor(operand: IOp<DataType, S>);
}
declare class CountOp extends BaseOp<DTInt<64>, 'scalar'> {
    readonly kind: "count";
    constructor();
}
declare class RawSqlOp<T extends DataType = DataType, S extends DataShape = DataShape> extends BaseOp<T, S> {
    readonly rawSql: string;
    readonly kind: "raw_sql";
    constructor(rawSql: string, dtype: T, dshape: S);
}
declare class EqOp<S1 extends DataShape = DataShape, S2 extends DataShape = DataShape> extends BaseOp<DTBoolean, HighestDataShape<[S1, S2]>> {
    readonly left: IOp<DataType, S1>;
    readonly right: IOp<DataType, S2>;
    readonly kind: "eq";
    constructor(left: IOp<DataType, S1>, right: IOp<DataType, S2>);
}
declare class GtOp<S1 extends DataShape = DataShape, S2 extends DataShape = DataShape> extends BaseOp<DTBoolean, HighestDataShape<[S1, S2]>> {
    readonly left: IOp<DataType, S1>;
    readonly right: IOp<DataType, S2>;
    readonly kind: "gt";
    constructor(left: IOp<DataType, S1>, right: IOp<DataType, S2>);
}
declare class GteOp<S1 extends DataShape = DataShape, S2 extends DataShape = DataShape> extends BaseOp<DTBoolean, HighestDataShape<[S1, S2]>> {
    readonly left: IOp<DataType, S1>;
    readonly right: IOp<DataType, S2>;
    readonly kind: "gte";
    constructor(left: IOp<DataType, S1>, right: IOp<DataType, S2>);
}
declare class LtOp<S1 extends DataShape = DataShape, S2 extends DataShape = DataShape> extends BaseOp<DTBoolean, HighestDataShape<[S1, S2]>> {
    readonly left: IOp<DataType, S1>;
    readonly right: IOp<DataType, S2>;
    readonly kind: "lt";
    constructor(left: IOp<DataType, S1>, right: IOp<DataType, S2>);
}
declare class LteOp<S1 extends DataShape = DataShape, S2 extends DataShape = DataShape> extends BaseOp<DTBoolean, HighestDataShape<[S1, S2]>> {
    readonly left: IOp<DataType, S1>;
    readonly right: IOp<DataType, S2>;
    readonly kind: "lte";
    constructor(left: IOp<DataType, S1>, right: IOp<DataType, S2>);
}
declare class MinOp<T extends DataType = DataType> extends BaseOp<T, 'scalar'> {
    readonly operand: IOp<T, any>;
    readonly kind: "min";
    constructor(operand: IOp<T, any>);
}
declare class MaxOp<T extends DataType = DataType> extends BaseOp<T, 'scalar'> {
    readonly operand: IOp<T, any>;
    readonly kind: "max";
    constructor(operand: IOp<T, any>);
}
declare class LogicalNotOp<S extends DataShape = DataShape> extends BaseOp<DTBoolean, S> {
    readonly operand: IOp<DTBoolean, S>;
    readonly kind: "not";
    constructor(operand: IOp<DTBoolean, S>);
}
declare class LogicalAndOp<S1 extends DataShape = DataShape, S2 extends DataShape = DataShape> extends BaseOp<DTBoolean, HighestDataShape<[S1, S2]>> {
    readonly left: IOp<DTBoolean, S1>;
    readonly right: IOp<DTBoolean, S2>;
    readonly kind: "and";
    constructor(left: IOp<DTBoolean, S1>, right: IOp<DTBoolean, S2>);
}
declare class LogicalOrOp<S1 extends DataShape = DataShape, S2 extends DataShape = DataShape> extends BaseOp<DTBoolean, HighestDataShape<[S1, S2]>> {
    readonly left: IOp<DTBoolean, S1>;
    readonly right: IOp<DTBoolean, S2>;
    readonly kind: "or";
    constructor(left: IOp<DTBoolean, S1>, right: IOp<DTBoolean, S2>);
}
declare class AddOp<S1 extends DataShape = DataShape, S2 extends DataShape = DataShape, D1 extends DataType = DataType, D2 extends DataType = DataType> extends BaseOp<HighestDataType<[D1, D2]>, HighestDataShape<[S1, S2]>> {
    readonly left: IOp<D1, S1>;
    readonly right: IOp<D2, S2>;
    readonly kind: "add";
    constructor(left: IOp<D1, S1>, right: IOp<D2, S2>);
}
declare class SubOp<S1 extends DataShape = DataShape, S2 extends DataShape = DataShape, D1 extends DataType = DataType, D2 extends DataType = DataType> extends BaseOp<HighestDataType<[D1, D2]>, HighestDataShape<[S1, S2]>> {
    readonly left: IOp<D1, S1>;
    readonly right: IOp<D2, S2>;
    readonly kind: "sub";
    constructor(left: IOp<D1, S1>, right: IOp<D2, S2>);
}
declare class MulOp<S1 extends DataShape = DataShape, S2 extends DataShape = DataShape, D1 extends DataType = DataType, D2 extends DataType = DataType> extends BaseOp<HighestDataType<[D1, D2]>, HighestDataShape<[S1, S2]>> {
    readonly left: IOp<D1, S1>;
    readonly right: IOp<D2, S2>;
    readonly kind: "mul";
    constructor(left: IOp<D1, S1>, right: IOp<D2, S2>);
}
declare class DivOp<S1 extends DataShape = DataShape, S2 extends DataShape = DataShape, D1 extends DataType = DataType, D2 extends DataType = DataType> extends BaseOp<HighestDataType<[D1, D2]>, HighestDataShape<[S1, S2]>> {
    readonly left: IOp<D1, S1>;
    readonly right: IOp<D2, S2>;
    readonly kind: "div";
    constructor(left: IOp<D1, S1>, right: IOp<D2, S2>);
}
declare class SumOp<T extends DataType = DataType> extends BaseOp<T, 'scalar'> {
    readonly operand: IOp<T, any>;
    readonly kind: "sum";
    constructor(operand: IOp<T, any>);
}
declare class MeanOp extends BaseOp<DTFloat64, 'scalar'> {
    readonly operand: IOp<any, any>;
    readonly kind: "mean";
    constructor(operand: IOp<any, any>);
}
declare class UpperOp<S extends DataShape = DataShape> extends BaseOp<DTString, S> {
    readonly operand: IOp<{
        typecode: 'string';
    }, S>;
    readonly kind: "upper";
    constructor(operand: IOp<{
        typecode: 'string';
    }, S>);
}
declare class LowerOp<S extends DataShape = DataShape> extends BaseOp<DTString, S> {
    readonly operand: IOp<{
        typecode: 'string';
    }, S>;
    readonly kind: "lower";
    constructor(operand: IOp<{
        typecode: 'string';
    }, S>);
}
declare class ContainsOp<S1 extends DataShape = DataShape> extends BaseOp<DTBoolean, HighestDataShape<[S1, 'scalar']>> {
    readonly operand: IOp<{
        typecode: 'string';
    }, S1>;
    readonly pattern: StringLiteralOp;
    readonly kind: "contains";
    constructor(operand: IOp<{
        typecode: 'string';
    }, S1>, pattern: StringLiteralOp);
}
declare class StartsWithOp<S1 extends DataShape = DataShape> extends BaseOp<DTBoolean, HighestDataShape<[S1, 'scalar']>> {
    readonly operand: IOp<{
        typecode: 'string';
    }, S1>;
    readonly prefix: StringLiteralOp;
    readonly kind: "starts_with";
    constructor(operand: IOp<{
        typecode: 'string';
    }, S1>, prefix: StringLiteralOp);
}
type TemporalDataType = {
    typecode: 'date';
} | {
    typecode: 'time';
} | {
    typecode: 'datetime';
};
declare class TemporalToStringOp<S extends DataShape = DataShape> extends BaseOp<DTString, S> {
    readonly operand: IOp<TemporalDataType, S>;
    readonly format: string;
    readonly kind: "temporal_to_string";
    constructor(operand: IOp<TemporalDataType, S>, format: string);
}
declare class SortSpec {
    readonly op: IOp<any, any>;
    readonly direction: 'asc' | 'desc';
    constructor(op: IOp<any, any>, direction: 'asc' | 'desc');
}
type BuiltinOp = ColRefOp | IntLiteralOp | FloatLiteralOp | StringLiteralOp | BooleanLiteralOp | NullLiteralOp | DatetimeLiteralOp | DateLiteralOp | TimeLiteralOp | IsNotNullOp | CountOp | RawSqlOp | EqOp | GtOp | GteOp | LtOp | LteOp | MinOp | MaxOp | LogicalNotOp | LogicalAndOp | LogicalOrOp | AddOp | SubOp | MulOp | DivOp | SumOp | MeanOp | UpperOp | LowerOp | ContainsOp | StartsWithOp | TemporalToStringOp;

/** Given a datatype, what are the datatypes that are comparable to it eg with .eq() */
type DtypesComparableTo<T extends DataType> = T extends {
    typecode: 'string';
} ? {
    typecode: 'string';
} : T extends NumericDataType ? NumericDataType : T extends {
    typecode: 'boolean';
} ? {
    typecode: 'boolean';
} : T extends {
    typecode: 'date';
} ? {
    typecode: 'date';
} : T extends {
    typecode: 'time';
} ? {
    typecode: 'time';
} : T extends {
    typecode: 'datetime';
} ? {
    typecode: 'datetime';
} : T extends {
    typecode: 'uuid';
} ? {
    typecode: 'uuid';
} : T extends {
    typecode: 'interval';
} ? {
    typecode: 'interval';
} : never;
type IntoValueComparableTo<Target extends DataType> = LiteralValueCoercibleTo<Target> | IExpr<DtypesComparableTo<Target>, any> | IOp<DtypesComparableTo<Target>, any>;

type Expr<T extends DataType = DataType, S extends DataShape = DataShape> = T extends {
    typecode: 'null';
} ? NullExpr<S> : T extends {
    typecode: 'string';
} ? StringExpr<S> : T extends NumericDataType ? NumericExpr<T, S> : T extends {
    typecode: 'boolean';
} ? BooleanExpr<S> : T extends {
    typecode: 'date';
} ? DateExpr<S> : T extends {
    typecode: 'time';
} ? TimeExpr<S> : T extends {
    typecode: 'datetime';
} ? DateTimeExpr<S> : T extends {
    typecode: 'uuid';
} ? UUIDExpr<S> : T extends {
    typecode: 'interval';
} ? IntervalExpr<S> : never;
declare abstract class BaseExpr<T extends DataType = DataType, S extends DataShape = DataShape> implements IExpr<T, S> {
    private readonly _op;
    constructor(_op: IOp<T, S>);
    [IsExprSymbol]: true;
    dtype(): T;
    dshape(): S;
    toOp(): IOp<T, S>;
}
declare class GenericExpr<T extends DataType = DataType, S extends DataShape = DataShape> extends BaseExpr<T, S> {
    isNotNull(): Expr<DTBoolean, S>;
    eq<Value extends IntoValueComparableTo<T>>(value: Value): BooleanExpr<HighestDataShape<[InferDataShape<Value>, S]>>;
    gt<Value extends IntoValueComparableTo<T>>(value: Value): BooleanExpr<HighestDataShape<[InferDataShape<Value>, S]>>;
    gte<Value extends IntoValueComparableTo<T>>(value: Value): BooleanExpr<HighestDataShape<[InferDataShape<Value>, S]>>;
    lt<Value extends IntoValueComparableTo<T>>(value: Value): BooleanExpr<HighestDataShape<[InferDataShape<Value>, S]>>;
    lte<Value extends IntoValueComparableTo<T>>(value: Value): BooleanExpr<HighestDataShape<[InferDataShape<Value>, S]>>;
    min(): Expr<T, 'scalar'>;
    max(): Expr<T, 'scalar'>;
    desc(): SortExpr;
    asc(): SortExpr;
}
declare class NullExpr<S extends DataShape = DataShape> extends GenericExpr<{
    typecode: 'null';
}, S> {
}
declare class NumericExpr<T extends NumericDataType = NumericDataType, S extends DataShape = DataShape> extends GenericExpr<T, S> {
    add<T extends number | IExpr<NumericDataType, any>>(value: T): NumericExpr<DTFloat64, HighestDataShape<[InferDataShape<T>, S]>>;
    sub<T extends number | IExpr<NumericDataType, any>>(value: T): NumericExpr<DTFloat64, HighestDataShape<[InferDataShape<T>, S]>>;
    mul<T extends number | IExpr<NumericDataType, any>>(value: T): NumericExpr<DTFloat64, HighestDataShape<[InferDataShape<T>, S]>>;
    div<T extends number | IExpr<NumericDataType, any>>(value: T): NumericExpr<DTFloat64, HighestDataShape<[InferDataShape<T>, S]>>;
    sum(): NumericExpr<DTFloat64, 'scalar'>;
    mean(): NumericExpr<DTFloat64, 'scalar'>;
}
declare class StringExpr<S extends DataShape = DataShape> extends GenericExpr<DTString, S> {
    upper(): StringExpr<S>;
    lower(): StringExpr<S>;
    contains(pattern: string): BooleanExpr<"columnar" extends "scalar" | S ? S & "columnar" : "scalar">;
    startsWith(prefix: string): BooleanExpr<"columnar" extends "scalar" | S ? S & "columnar" : "scalar">;
}
declare class BooleanExpr<S extends DataShape = DataShape> extends GenericExpr<DTBoolean, S> {
    and(other: boolean | IExpr<DTBoolean, any>): BooleanExpr<"columnar">;
    or(other: boolean | IExpr<DTBoolean, any>): BooleanExpr<"columnar">;
    not(): BooleanExpr<S>;
}
declare class DateExpr<S extends DataShape = DataShape> extends GenericExpr<DTDate, S> {
    toString(format: string): StringExpr<S>;
}
declare class TimeExpr<S extends DataShape = DataShape> extends GenericExpr<DTTime, S> {
    toString(format: string): StringExpr<S>;
}
declare class DateTimeExpr<S extends DataShape = DataShape> extends GenericExpr<DTDateTime, S> {
    toString(format: string): StringExpr<S>;
}
declare class IntervalExpr<S extends DataShape = DataShape> extends GenericExpr<DTInterval, S> {
}
declare class UUIDExpr<S extends DataShape = DataShape> extends GenericExpr<DTUUID, S> {
}
declare function col<N extends string, T extends IntoDtype>(name: N, dtype: T): Expr<InferDtype<T>, "columnar">;
declare class SortExpr {
    readonly expr: BaseExpr;
    readonly direction: 'asc' | 'desc';
    constructor(expr: BaseExpr, direction: 'asc' | 'desc');
    toSortSpec(): SortSpec;
}
declare function count(): NumericExpr<DTInt64, 'scalar'>;
declare function lit<JS extends AcceptableJsVal<DT>, DT extends IntoDtype | undefined = undefined>(value: JS, dtype?: DT): Expr<ExplicitOrInferredDtype<JS, DT>, 'scalar'>;

declare const IsOpSymbol: unique symbol;
declare const IsExprSymbol: unique symbol;
/**
 * An IOp is the **internal** representation of an operation. It does not have the pleasant
 * user-facing API of an IExpr. For example, you might have
 *
 * \`\`\`ts
 * class StringUpperOp<S extends DataShape> implements IOp<{ typecode: 'string' }, S> {
 *     readonly kind = 'upper' as const
 *     constructor(readonly operand: IOp<{ typecode: 'string' }, S>) {}
 *     dtype() { return DT.string }
 *     dshape() { return this.operand.dshape() }
 *     toExpr() { return new StringExpr(this) }
 * }
 * \`\`\`
 *
 * Note that this doesn't have the nice API of an IExpr, such as the \`.trim()\` or \`.length()\` methods.
 */
interface IOp<T extends DataType = DataType, S extends DataShape = DataShape, K extends any = any> {
    readonly kind: K;
    /** The {@link DataType} of this expression. */
    dtype(): T;
    /** The {@link DataShape} of this expression, which can be 'scalar' or 'columnar'. */
    dshape(): S;
    toExpr(): Expr<T, S>;
    getName(): string;
    /** Optional symbol to mark this object as an Op. If not present, the object will be checked for the presence of 'kind', 'dtype', and 'dshape' properties. */
    [IsOpSymbol]?: boolean;
}
interface IExpr<T extends DataType = DataType, S extends DataShape = DataShape, N extends string = string> {
    /** The {@link DataType} of this expression. */
    dtype(): T;
    /** The {@link DataShape} of this expression, which can be 'scalar' or 'columnar'. */
    dshape(): S;
    /** Convert this expression to its internal operation representation. */
    toOp(): IOp<T, S>;
    /** Optional symbol to mark this object as an Expr. If not present, the object will be checked for the presence of 'dtype' and 'dshape' properties. */
    [IsExprSymbol]?: boolean;
}

interface DTNull {
    typecode: 'null';
}
declare function DTNull(): DTNull;
interface DTString {
    typecode: 'string';
}
declare function DTString(): DTString;
interface DTInt<S extends 8 | 16 | 32 | 64 = 8 | 16 | 32 | 64> {
    typecode: 'int';
    size: S;
}
declare function DTInt<S extends 8 | 16 | 32 | 64 = 8 | 16 | 32 | 64>(size: S): DTInt<S>;
interface DTInt8 {
    typecode: 'int';
    size: 8;
}
declare function DTInt8(): DTInt8;
interface DTInt16 {
    typecode: 'int';
    size: 16;
}
declare function DTInt16(): DTInt16;
interface DTInt32 {
    typecode: 'int';
    size: 32;
}
declare function DTInt32(): DTInt32;
interface DTInt64 {
    typecode: 'int';
    size: 64;
}
declare function DTInt64(): DTInt64;
interface DTFloat<S extends 8 | 16 | 32 | 64 = 8 | 16 | 32 | 64> {
    typecode: 'float';
    size: S;
}
declare function DTFloat<S extends 8 | 16 | 32 | 64 = 8 | 16 | 32 | 64>(size: S): DTFloat<S>;
interface DTFloat8 {
    typecode: 'float';
    size: 8;
}
declare function DTFloat8(): DTFloat8;
interface DTFloat16 {
    typecode: 'float';
    size: 16;
}
declare function DTFloat16(): DTFloat16;
interface DTFloat32 {
    typecode: 'float';
    size: 32;
}
declare function DTFloat32(): DTFloat32;
interface DTFloat64 {
    typecode: 'float';
    size: 64;
}
declare function DTFloat64(): DTFloat64;
interface DTBoolean {
    typecode: 'boolean';
}
declare function DTBoolean(): DTBoolean;
interface DTDate {
    typecode: 'date';
}
declare function DTDate(): DTDate;
interface DTTime {
    typecode: 'time';
}
declare function DTTime(): DTTime;
interface DTDateTime {
    typecode: 'datetime';
}
declare function DTDateTime(): DTDateTime;
interface DTInterval {
    typecode: 'interval';
}
declare function DTInterval(): DTInterval;
interface DTUUID {
    typecode: 'uuid';
}
declare function DTUUID(): DTUUID;
type NumericDataType = DTInt | DTFloat;
type DataType = DTNull | DTString | DTInt | DTFloat | DTBoolean | DTDate | DTTime | DTDateTime | DTInterval | DTUUID;
type DTypeShorthands = DataType['typecode'] | 'int8' | 'int16' | 'int32' | 'int64' | 'float8' | 'float16' | 'float32' | 'float64';
type InferDtypeFromShorthand<S extends DTypeShorthands> = S extends 'null' ? DTNull : S extends 'string' ? DTString : S extends 'int' ? {
    typecode: 'int';
    size: 64;
} : S extends 'int8' ? {
    typecode: 'int';
    size: 8;
} : S extends 'int16' ? {
    typecode: 'int';
    size: 16;
} : S extends 'int32' ? {
    typecode: 'int';
    size: 32;
} : S extends 'int64' ? {
    typecode: 'int';
    size: 64;
} : S extends 'float' ? {
    typecode: 'float';
    size: 64;
} : S extends 'float8' ? {
    typecode: 'float';
    size: 8;
} : S extends 'float16' ? {
    typecode: 'float';
    size: 16;
} : S extends 'float32' ? {
    typecode: 'float';
    size: 32;
} : S extends 'float64' ? {
    typecode: 'float';
    size: 64;
} : S extends 'boolean' ? DTBoolean : S extends 'date' ? DTDate : S extends 'time' ? DTTime : S extends 'datetime' ? DTDateTime : S extends 'interval' ? DTInterval : S extends 'uuid' ? DTUUID : never;
type InferrableJsType = string | number | boolean | Date | null;
/** Given a JS type, what DataType will be inferred? */
type InferDtypeFromJs<JS extends InferrableJsType> = JS extends string ? DTString : JS extends number ? DTFloat<64> : JS extends boolean ? DTBoolean : JS extends Date ? DTDateTime : JS extends null ? DTNull : never;
type IntoDtype = DataType | DTypeShorthands | IExpr<DataType, any> | IOp<DataType, any>;
type InferDtype<T extends IntoDtype> = T extends DataType ? T : T extends DTypeShorthands ? InferDtypeFromShorthand<T> : T extends IExpr<infer D, any> ? D : T extends IOp<infer D, any> ? D : never;
type HighestDataType<Types extends DataType[]> = Types extends [] ? never : Types[number] extends DTFloat64 ? DTFloat64 : Types[number] extends DTFloat32 ? DTFloat32 : Types[number] extends DTFloat16 ? DTFloat16 : Types[number] extends DTFloat8 ? DTFloat8 : Types[number] extends DTInt64 ? DTInt64 : Types[number] extends DTInt32 ? DTInt32 : Types[number] extends DTInt16 ? DTInt16 : Types[number] extends DTInt8 ? DTInt8 : never;

type Schema = Record<string, DataType>;
type IntoSchema = Schema | Record<string, IntoDtype>;
type InferSchema<T extends IntoSchema> = T extends Schema ? T : T extends Record<string, IntoDtype> ? {
    [K in keyof T]: InferDtype<T[K]>;
} : never;

type IRNode = {
    kind: 'from';
    name: string;
} | {
    kind: 'filter';
    source: IRNode;
    condition: IOp<{
        typecode: 'boolean';
    }>;
} | {
    kind: 'derive';
    source: IRNode;
    derivations: [string, IOp][];
} | {
    kind: 'select';
    source: IRNode;
    selections: [string, IOp][];
} | {
    kind: 'group';
    source: IRNode;
    keys: string[];
    aggregations: [string, IOp][];
} | {
    kind: 'sort';
    source: IRNode;
    keys: SortSpec[];
} | {
    kind: 'take';
    source: IRNode;
    n: number;
};

interface Compiler<O extends IOp<any, any, any> = BuiltinOp> {
    compileOp(op: O): string;
    compileIR(node: IRNode): string;
}

type Col<K extends string = string, T extends DataType = DataType> = Expr<T, 'columnar'>;
declare class RowAccessor<S extends Schema> {
    private readonly _schema;
    constructor(_schema: S);
    col<K extends keyof S & string>(name: K): Col<K, S[K]>;
}
/** Result of calling g.agg({...}) inside a group() callback. */
declare class GroupResult<A extends Record<string, BaseExpr<DataType, 'scalar'>>> {
    readonly aggregations: A;
    constructor(aggregations: A);
}
declare class GroupAccessor<S extends Schema> extends RowAccessor<S> {
    agg<A extends Record<string, BaseExpr<DataType, 'scalar'>>>(aggregations: A): GroupResult<A>;
}
type ColName<C> = C extends Col<infer N, DataType> ? N : never;
type ColArrayNames<KC> = KC extends Array<infer C> ? ColName<C> : never;
type AggResultSchema<A extends Record<string, BaseExpr<DataType, 'scalar'>>> = {
    [K in keyof A]: A[K] extends BaseExpr<infer T, 'scalar'> ? T : never;
};
type DeriveSchema<S extends Schema, D extends Record<string, IExpr<any, any>>> = Omit<S, keyof D> & {
    [K in keyof D]: D[K] extends IExpr<infer T, any> ? T : never;
};
type SelectInput<S extends Schema, D> = {
    [K in keyof D]: K extends keyof S ? (IExpr<any, any> | boolean) : IExpr<any, any>;
};
type SelectSchema<S extends Schema, D> = {
    [K in keyof D as D[K] extends false ? never : K]: D[K] extends IExpr<infer T, any> ? T : D[K] extends boolean ? (K extends keyof S ? S[K] : never) : never;
};
declare class Relation<S extends Schema = Schema> {
    readonly schema: S;
    /** @internal */ readonly _ir: IRNode;
    constructor(schema: S, 
    /** @internal */ _ir: IRNode);
    /**
     * Get a column expression by name.
     * @example penguins.col("bill_length_mm")
     */
    col<K extends keyof S & string>(name: K): Col<K, S[K]>;
    /**
     * Filter rows using a boolean expression.
     * @example penguins.filter(r => r.col("bill_length_mm").gt(40))
     */
    filter(cb: (r: RowAccessor<S>) => BooleanExpr): Relation<S>;
    /**
     * Group rows by key columns and apply aggregations.
     * @example
     * penguins.group(
     *   r => [r.col("species"), r.col("year")],
     *   g => g.agg({ count: count(), mean_bill: g.col("bill_length_mm").mean() })
     * )
     */
    group<KC extends Col[], A extends Record<string, BaseExpr<DataType, 'scalar'>>>(keys: (r: RowAccessor<S>) => KC, transform: (g: GroupAccessor<S>) => GroupResult<A>): Relation<Pick<S, ColArrayNames<KC> & keyof S> & AggResultSchema<A>>;
    /**
     * Add computed columns to each row.
     * @example penguins.derive(r => ({ ratio: r.col("bill_length_mm").div(40) }))
     */
    derive<D extends Record<string, IExpr<any, any>>>(cb: (r: RowAccessor<S>) => D): Relation<DeriveSchema<S, D>>;
    /**
     * Replace existing columns with a new set of expressions.
     * @example penguins.select(r => ({ species: r.col("species"), age: r.col("year").sub(2000) }))
     * @example penguins.select(r => ({ species: true })) // Keep existing column
     */
    select<D extends SelectInput<S, D>>(cb: (r: RowAccessor<S>) => D): Relation<SelectSchema<S, D>>;
    /**
     * Sort rows by one or more keys.
     * @example penguins.sort(r => r.col("count").desc())
     * @example penguins.sort(r => [r.col("species"), r.col("year").desc()])
     */
    sort(cb: (r: RowAccessor<S>) => SortExpr | IExpr<any, any> | (SortExpr | IExpr<any, any>)[]): Relation<S>;
    /**
     * Take the first n rows.
     * @example penguins.take(10)
     */
    take(n: number): Relation<S>;
    compile(compiler: Compiler<any>): string;
    /** Compile to a PRQL query string. */
    toPrql(): string;
    /** Compile to SQL using the PRQL compiler. */
    toSql(): string;
}
/**
 * Define a relation with an explicit name and schema.
 * @example
 * const penguins = relation('penguins', {
 *   species: DT.string,
 *   year: DT.int32,
 *   bill_length_mm: DT.float64,
 * })
 */
declare function relation<S extends IntoSchema>(name: string, sch: S): Relation<InferSchema<S>>;

declare class PrqlCompiler implements Compiler {
    compileOp(op: BuiltinOp): string;
    compileSortKey(spec: SortSpec): string;
    compileIR(node: IRNode): string;
}

declare class SqlCompiler implements Compiler {
    private readonly prqlCompiler;
    compileOp(op: BuiltinOp): string;
    compileIR(node: IRNode): string;
}

export { type Compiler, type Expr, type IExpr, type IRNode, type InferSchema, PrqlCompiler, Relation, type Schema, SqlCompiler, col, count, lit, relation };
 }`
