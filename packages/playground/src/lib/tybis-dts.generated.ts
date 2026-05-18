/**
 * Type declarations injected into the Monaco editor so users get
 * autocomplete and type-checking for the tybis API and the `preview`
 * sandbox function.
 *
 * Auto-generated from tybis + tybis-sql-compiler package types.
 */

export const TYBIS_DTS = /* ts */ `declare module "tybis" { type DataShape = 'scalar' | 'columnar';
type HighestDataShape<Shapes extends DataShape[]> = Shapes extends [] ? never : 'columnar' extends Shapes[number] ? 'columnar' : 'scalar';
type IntoDataShape = DataShape | IVExpr<any, any> | IVOp<any, any> | InferrableJsType;
type InferDataShape<T extends IntoDataShape> = T extends DataShape ? T : T extends IVExpr<any, infer DS> ? DS : T extends IVOp<any, infer DS> ? DS : T extends InferrableJsType ? 'scalar' : never;

declare const IsVOpSymbol: unique symbol;
declare const IsVExprSymbol: unique symbol;
/**
 * An IVOp is an interface for a value-op, for example \`add(5, relation.cols.height_cm)\`.
 *
 * An IVop represent either a scalar or columnar value with a known DataType.
 * An implementation of IVOp must have the following properties:
 * - has a \`dtype()\` method that returns a DataType
 * - has a \`dshape()\` method that returns a DataShape ('scalar' or 'columnar')
 * - has a \`getName()\` method that returns a string, often used to generate the column name.
 *
 * For example, you might have an operation that converts a string column to uppercase. You could implement this as an IVOp like this:
 *
 * \`\`\`ts
 * class StringUpperOp<S extends DataShape> implements IVOp<{ typecode: 'string' }, S> {
 *     readonly kind = 'upper' as const
 *     constructor(readonly operand: IVOp<{ typecode: 'string' }, S>) {}
 *     dtype() { return DT.string }
 *     dshape() { return this.operand.dshape() }
 *     getName() { return \`\${this.operand.getName()}_upper\` }
 * }
 * \`\`\`
 *
 * Note that this doesn't have the nice API of an IVExpr, such as the \`.trim()\` or \`.length()\` methods.
 *
 * Note that this also does NOT implement the actual compilation logic,
 * eg there is nothing in there that says how to convert this to SQL or PRQL.
 * It is the responsibility of a Compiler to define this for a given computation backend.
 * This separation means that a \`StringUpperOp\` has shared semantics across all backends,
 * eg you could build it on the frontend and show a preview of the resulting data
 * with an in-memory compiler,
 * but then serialize the op to JSON, pass it to the backend, store it in a database,
 * and then the backend could deserialize it and compile it to SQL or PRQL or whatever,
 * then execute on the actual database, and the semantics of the operation would be preserved across all those steps.
 */
interface IVOp<DT extends DataType = DataType, DS extends DataShape = DataShape, K extends string = string> {
    readonly kind: K;
    /** The {@link DataType} of this expression. */
    dtype(): DT;
    /** The {@link DataShape} of this expression, which can be 'scalar' or 'columnar'. */
    dshape(): DS;
    getName(): string;
    /** Optional symbol to mark this object as an Op. If not present, the object will be checked for the presence of 'kind', 'dtype', and 'dshape' properties. */
    [IsVOpSymbol]?: boolean;
}
interface IVExpr<DT extends DataType = DataType, DS extends DataShape = DataShape> {
    /** The {@link DataType} of this expression. */
    dtype(): DT;
    /** The {@link DataShape} of this expression, which can be 'scalar' or 'columnar'. */
    dshape(): DS;
    /** Convert this expression to its internal operation representation. */
    toOp(): IVOp<DT, DS>;
    /** Optional symbol to mark this object as an Expr. If not present, the object will be checked for the presence of 'dtype' and 'dshape' properties. */
    [IsVExprSymbol]?: boolean;
}

interface DTNull {
    typecode: 'null';
    nullable: boolean;
}
declare function DTNull(opts?: {
    nullable?: boolean;
}): DTNull;
interface DTString {
    typecode: 'string';
    nullable: boolean;
}
declare function DTString(opts?: {
    nullable?: boolean;
}): DTString;
interface DTInt<S extends 8 | 16 | 32 | 64 = 8 | 16 | 32 | 64> {
    typecode: 'int';
    size: S;
    nullable: boolean;
}
declare function DTInt<S extends 8 | 16 | 32 | 64 = 8 | 16 | 32 | 64>(size: S, opts?: {
    nullable?: boolean;
}): DTInt<S>;
interface DTFloat<S extends 8 | 16 | 32 | 64 = 8 | 16 | 32 | 64> {
    typecode: 'float';
    size: S;
    nullable: boolean;
}
declare function DTFloat<S extends 8 | 16 | 32 | 64 = 8 | 16 | 32 | 64>(size: S, opts?: {
    nullable?: boolean;
}): DTFloat<S>;
interface DTBoolean {
    typecode: 'boolean';
    nullable: boolean;
}
declare function DTBoolean(opts?: {
    nullable?: boolean;
}): DTBoolean;
interface DTDate {
    typecode: 'date';
    nullable: boolean;
}
declare function DTDate(opts?: {
    nullable?: boolean;
}): DTDate;
interface DTTime {
    typecode: 'time';
    nullable: boolean;
}
declare function DTTime(opts?: {
    nullable?: boolean;
}): DTTime;
interface DTDateTime {
    typecode: 'datetime';
    nullable: boolean;
}
declare function DTDateTime(opts?: {
    nullable?: boolean;
}): DTDateTime;
interface DTInterval {
    typecode: 'interval';
    nullable: boolean;
}
declare function DTInterval(opts?: {
    nullable?: boolean;
}): DTInterval;
interface DTUUID {
    typecode: 'uuid';
    nullable: boolean;
}
declare function DTUUID(opts?: {
    nullable?: boolean;
}): DTUUID;
interface DTCustom {
    typecode: 'custom';
    meta: unknown;
    nullable: boolean;
}
declare function DTCustom(meta: unknown, opts?: {
    nullable?: boolean;
}): DTCustom;
type NumericDataType = DTInt | DTFloat;
type DataType = DTNull | DTString | DTInt | DTFloat | DTBoolean | DTDate | DTTime | DTDateTime | DTInterval | DTUUID | DTCustom;
type DTypeShorthands = Exclude<DataType['typecode'], 'custom'> | 'int8' | 'int16' | 'int32' | 'int64' | 'float8' | 'float16' | 'float32' | 'float64';
type InferDtypeFromShorthand<S extends DTypeShorthands> = S extends 'null' ? DTNull : S extends 'string' ? DTString : S extends 'int' ? DTInt<64> : S extends 'int8' ? DTInt<8> : S extends 'int16' ? DTInt<16> : S extends 'int32' ? DTInt<32> : S extends 'int64' ? DTInt<64> : S extends 'float' ? DTFloat<64> : S extends 'float8' ? DTFloat<8> : S extends 'float16' ? DTFloat<16> : S extends 'float32' ? DTFloat<32> : S extends 'float64' ? DTFloat<64> : S extends 'boolean' ? DTBoolean : S extends 'date' ? DTDate : S extends 'time' ? DTTime : S extends 'datetime' ? DTDateTime : S extends 'interval' ? DTInterval : S extends 'uuid' ? DTUUID : never;
type JSTypeFromDtype<DT extends DataType> = DT extends {
    nullable: false;
} ? NonNullableJSTypeFromDtype<DT> : NonNullableJSTypeFromDtype<DT> | null;
type NonNullableJSTypeFromDtype<DT extends DataType> = DT extends DTString ? string : DT extends DTInt ? number : DT extends DTFloat ? number : DT extends DTBoolean ? boolean : DT extends DTDate ? Date : DT extends DTTime ? Date : DT extends DTDateTime ? Date : DT extends DTInterval ? string : DT extends DTUUID ? string : DT extends DTNull ? null : DT extends DTCustom ? unknown : never;
type InferrableJsType = string | number | boolean | Date | null;
/** Given a JS type, what DataType will be inferred? */
type InferDtypeFromJs<JS extends InferrableJsType> = JS extends string ? DTString : JS extends number ? DTFloat<64> : JS extends boolean ? DTBoolean : JS extends Date ? DTDateTime : JS extends null ? DTNull : never;
type IntoDtype = DataType | DTypeShorthands | IVExpr<DataType, any> | IVOp<DataType, any, any>;
type InferDtype<DT extends IntoDtype> = DT extends DataType ? DT : DT extends DTypeShorthands ? InferDtypeFromShorthand<DT> : DT extends IVExpr<infer D, any> ? D : DT extends IVOp<infer D, any, any> ? D : never;
declare function dtype<T extends IntoDtype>(thing: T): InferDtype<T>;
type HighestDataType<DTs extends DataType[]> = DTs extends [] ? never : DTFloat<64> extends DTs[number] ? DTFloat<64> : DTFloat<32> extends DTs[number] ? DTFloat<32> : DTFloat<16> extends DTs[number] ? DTFloat<16> : DTFloat<8> extends DTs[number] ? DTFloat<8> : DTInt<64> extends DTs[number] ? DTInt<64> : DTInt<32> extends DTs[number] ? DTInt<32> : DTInt<16> extends DTs[number] ? DTInt<16> : DTInt<8> extends DTs[number] ? DTInt<8> : never;

type Schema = Record<string, DataType>;
type IntoSchema = Schema | Record<string, IntoDtype>;
type InferSchema<T extends IntoSchema> = T extends Schema ? T : T extends Record<string, IntoDtype> ? {
    [K in keyof T]: InferDtype<T[K]>;
} : never;
declare function schema<T extends IntoSchema>(s: T): InferSchema<T>;

declare const IsROpSymbol: unique symbol;
/**
 * An IROp is an interface for a relational operation, representing a step in a query such as a \`filter\` or a \`group\` or a \`select\`.
 *
 * An IROp represents tabular data with a known Schema.
 * An implementation of IROp must have the following properties:
 * - has a \`schema()\` method that returns a Schema
 *
 * For example, you might have an operation that samples rows. You could implement this as an IROp like this:
 *
 * \`\`\`ts
 * class SampleOp<S extends Schema> extends BaseROp<S, 'sample'> {
 *     readonly kind = 'sample' as const
 *     constructor(readonly source: IROp<S>, readonly n: number) { super() }
 *     protected computeSchema(): S { return this.source.schema() }
 * }
 * \`\`\`
 *
 * Note that this doesn't have the nice API of a Relation, such as the \`.filter()\` or \`.select()\` methods.
 *
 * Note that this also does NOT implement the actual compilation logic,
 * eg there is nothing in there that says how to convert this to SQL or PRQL.
 * It is the responsibility of a Compiler to define this for a given computation backend.
 * This separation means that a \`SampleOp\` has shared semantics across all backends.
 */
interface IROp<S extends Schema = Schema, K extends string = string> {
    readonly kind: K;
    /** The structural {@link Schema} of the relation produced by this operation. */
    schema(): S;
    /** Optional symbol to mark this object as an ROp. If not present, the object will be checked for the presence of 'kind' and 'schema' properties. */
    [IsROpSymbol]?: boolean;
}

/** A base class that you can use as a utility for defining custom {@link IVOp}s.
 *
 * Note that you don't NEED to extend this class to create a custom IVOp,
 * this class is just sometimes a useful shortcut.
 * For example, the builtin string \`StartsWithOp\` is currently implemented as follows:
 *
 * \`\`\`ts
 * export class StartsWithOp<
 *     DS1 extends DataShape = DataShape,
 *     DS2 extends DataShape = DataShape
 * > extends BaseVOp<dt.DTBoolean, HighestDataShape<[DS1, DS2]>> {
 *     readonly kind = 'starts_with' as const
 *     constructor(readonly operand: IVOp<dt.DTString, DS1>, readonly prefix: IVOp<dt.DTString, DS2>) {
 *        super(dt.DTBoolean(), highestDataShape(operand.dshape(), prefix.dshape()))
 *     }
 * }
 *
 * // usage: new StartsWithOp(lit('hello').toOp(), mytable.cols.mycol.toOp())
 * \`\`\`
 *
 * But it could also have been implemented without extending \`BaseVOp\`, like this:
 *
 * \`\`\`ts
 * export function startsWith<DS1 extends DataShape = DataShape, DS2 extends DataShape = DataShape>(
 *     operand: IVOp<dt.DTString, DS1>,
 *     prefix: IVOp<dt.DTString, DS2>
 * ): IVOp<dt.DTBoolean, HighestDataShape<[DS1, DS2]>> {
 *     return {
 *         [IsVOpSymbol]: true as const,
 *         kind: 'starts_with' as const,
 *         operand,
 *         prefix,
 *         dtype() { return dt.DTBoolean() },
 *         dshape() { return highestDataShape(operand.dshape(), prefix.dshape()) },
 *         getName() { return this.kind }
 *     }
 * }
 *
 * // usage: startsWith(lit('hello').toOp(), mytable.cols.mycol.toOp())
 * \`\`\`
*/
declare abstract class BaseVOp<DT extends DataType = DataType, DS extends DataShape = DataShape> implements IVOp<DT, DS> {
    [IsVOpSymbol]: true;
    abstract readonly kind: string;
    private readonly _dtype;
    private readonly _dshape;
    constructor(dtype: DT, dshape: DS);
    dtype(): DT;
    dshape(): DS;
    getName(): string;
}

type IntoIntLiteralValue = number | \`\${number}\`;
declare class IntLiteralOp<DT extends DTInt = DTInt> extends BaseVOp<DT, 'scalar'> {
    readonly raw: IntoIntLiteralValue;
    readonly kind: "int_literal";
    readonly value: number;
    constructor(raw: IntoIntLiteralValue, dtype?: DT);
}
type IntoFloatLiteralValue = number | \`\${number}\` | 'NAN' | 'nan' | 'NaN';
declare class FloatLiteralOp<DT extends DTFloat = DTFloat> extends BaseVOp<DT, 'scalar'> {
    readonly raw: IntoFloatLiteralValue;
    readonly kind: "float_literal";
    readonly value: number;
    constructor(raw: IntoFloatLiteralValue, dtype?: DT);
}
type IntoStringLiteralValue = string | boolean | number | null | Date;
declare class StringLiteralOp extends BaseVOp<DTString, 'scalar'> {
    readonly raw: IntoStringLiteralValue;
    readonly kind: "string_literal";
    readonly value: string;
    constructor(raw: IntoStringLiteralValue);
}
type IntoBooleanLiteralValue = boolean | number | null | 'true' | 'false';
declare class BooleanLiteralOp extends BaseVOp<DTBoolean, 'scalar'> {
    readonly raw: IntoBooleanLiteralValue;
    readonly kind: "boolean_literal";
    readonly value: boolean;
    constructor(raw: IntoBooleanLiteralValue);
}
declare class NullLiteralOp extends BaseVOp<DTNull, 'scalar'> {
    readonly kind: "null_literal";
    constructor();
}
type IntoDatetimeLiteralValue = Date | string;
declare class DatetimeLiteralOp extends BaseVOp<DTDateTime, 'scalar'> {
    readonly raw: IntoDatetimeLiteralValue;
    readonly kind: "datetime_literal";
    readonly value: Date;
    constructor(raw: IntoDatetimeLiteralValue);
}
type IntoDateLiteralValue = Date | string;
declare class DateLiteralOp extends BaseVOp<DTDate, 'scalar'> {
    readonly raw: IntoDateLiteralValue;
    readonly kind: "date_literal";
    readonly value: Date;
    constructor(raw: IntoDateLiteralValue);
}
type IntoTimeLiteralValue = Date | string;
declare class TimeLiteralOp extends BaseVOp<DTTime, 'scalar'> {
    readonly raw: IntoTimeLiteralValue;
    readonly kind: "time_literal";
    readonly value: Date;
    constructor(raw: IntoTimeLiteralValue);
}
type IntoIntervalLiteralValue = number;
declare class IntervalLiteralOp extends BaseVOp<DTInterval, 'scalar'> {
    readonly raw: IntoIntervalLiteralValue;
    readonly kind: "interval_literal";
    readonly value: number;
    constructor(raw: IntoIntervalLiteralValue);
}
type IntoUuidLiteralValue = string;
declare class UuidLiteralOp extends BaseVOp<DTUUID, 'scalar'> {
    readonly raw: IntoUuidLiteralValue;
    readonly kind: "uuid_literal";
    readonly value: string;
    constructor(raw: IntoUuidLiteralValue);
}
type LiteralValueCoercibleTo<DT extends DataType> = DT extends DTInt ? IntoIntLiteralValue : DT extends DTFloat ? IntoFloatLiteralValue : DT extends DTString ? IntoStringLiteralValue : DT extends DTBoolean ? IntoBooleanLiteralValue : DT extends DTDateTime ? IntoDatetimeLiteralValue : DT extends DTDate ? IntoDateLiteralValue : DT extends DTTime ? IntoTimeLiteralValue : DT extends DTInterval ? IntoIntervalLiteralValue : DT extends DTUUID ? IntoUuidLiteralValue : never;
type AcceptableJsVal<DT extends IntoDtype | undefined = undefined> = DT extends IntoDtype ? LiteralValueCoercibleTo<InferDtype<DT>> : InferrableJsType;
type ExplicitOrInferredDtype<JS extends InferrableJsType, DT extends IntoDtype | undefined> = DT extends IntoDtype ? InferDtype<DT> : InferDtypeFromJs<JS>;

declare class ColRefOp<N extends string = string, DT extends IntoDtype = DataType> extends BaseVOp<InferDtype<DT>, 'columnar'> {
    readonly name: N;
    readonly kind: "col_ref";
    constructor(name: N, dtype: DT);
    getName(): string;
}
declare class IsNotNullOp<DS extends DataShape = DataShape> extends BaseVOp<DTBoolean, DS> {
    readonly operand: IVOp<DataType, DS>;
    readonly kind: "is_not_null";
    constructor(operand: IVOp<DataType, DS>);
}
declare class IsNullOp<DS extends DataShape = DataShape> extends BaseVOp<DTBoolean, DS> {
    readonly operand: IVOp<DataType, DS>;
    readonly kind: "is_null";
    constructor(operand: IVOp<DataType, DS>);
}
declare class CountOp extends BaseVOp<DTInt<64>, 'scalar'> {
    readonly kind: "count";
    constructor();
}
declare class EqOp<DS1 extends DataShape = DataShape, DS2 extends DataShape = DataShape> extends BaseVOp<DTBoolean, HighestDataShape<[DS1, DS2]>> {
    readonly left: IVOp<DataType, DS1>;
    readonly right: IVOp<DataType, DS2>;
    readonly kind: "eq";
    constructor(left: IVOp<DataType, DS1>, right: IVOp<DataType, DS2>);
}
declare class GtOp<DS1 extends DataShape = DataShape, DS2 extends DataShape = DataShape> extends BaseVOp<DTBoolean, HighestDataShape<[DS1, DS2]>> {
    readonly left: IVOp<DataType, DS1>;
    readonly right: IVOp<DataType, DS2>;
    readonly kind: "gt";
    constructor(left: IVOp<DataType, DS1>, right: IVOp<DataType, DS2>);
}
declare class GteOp<DS1 extends DataShape = DataShape, DS2 extends DataShape = DataShape> extends BaseVOp<DTBoolean, HighestDataShape<[DS1, DS2]>> {
    readonly left: IVOp<DataType, DS1>;
    readonly right: IVOp<DataType, DS2>;
    readonly kind: "gte";
    constructor(left: IVOp<DataType, DS1>, right: IVOp<DataType, DS2>);
}
declare class LtOp<DS1 extends DataShape = DataShape, DS2 extends DataShape = DataShape> extends BaseVOp<DTBoolean, HighestDataShape<[DS1, DS2]>> {
    readonly left: IVOp<DataType, DS1>;
    readonly right: IVOp<DataType, DS2>;
    readonly kind: "lt";
    constructor(left: IVOp<DataType, DS1>, right: IVOp<DataType, DS2>);
}
declare class LteOp<DS1 extends DataShape = DataShape, DS2 extends DataShape = DataShape> extends BaseVOp<DTBoolean, HighestDataShape<[DS1, DS2]>> {
    readonly left: IVOp<DataType, DS1>;
    readonly right: IVOp<DataType, DS2>;
    readonly kind: "lte";
    constructor(left: IVOp<DataType, DS1>, right: IVOp<DataType, DS2>);
}
declare class MinOp<DT extends DataType = DataType> extends BaseVOp<DT, 'scalar'> {
    readonly operand: IVOp<DT, any>;
    readonly kind: "min";
    constructor(operand: IVOp<DT, any>);
}
declare class MaxOp<DT extends DataType = DataType> extends BaseVOp<DT, 'scalar'> {
    readonly operand: IVOp<DT, any>;
    readonly kind: "max";
    constructor(operand: IVOp<DT, any>);
}
declare class LogicalNotOp<DS extends DataShape = DataShape> extends BaseVOp<DTBoolean, DS> {
    readonly operand: IVOp<DTBoolean, DS>;
    readonly kind: "not";
    constructor(operand: IVOp<DTBoolean, DS>);
}
declare class LogicalAndOp<DS1 extends DataShape = DataShape, DS2 extends DataShape = DataShape> extends BaseVOp<DTBoolean, HighestDataShape<[DS1, DS2]>> {
    readonly left: IVOp<DTBoolean, DS1>;
    readonly right: IVOp<DTBoolean, DS2>;
    readonly kind: "and";
    constructor(left: IVOp<DTBoolean, DS1>, right: IVOp<DTBoolean, DS2>);
}
declare class LogicalOrOp<DS1 extends DataShape = DataShape, DS2 extends DataShape = DataShape> extends BaseVOp<DTBoolean, HighestDataShape<[DS1, DS2]>> {
    readonly left: IVOp<DTBoolean, DS1>;
    readonly right: IVOp<DTBoolean, DS2>;
    readonly kind: "or";
    constructor(left: IVOp<DTBoolean, DS1>, right: IVOp<DTBoolean, DS2>);
}
declare class AddOp<DS1 extends DataShape = DataShape, DS2 extends DataShape = DataShape, DT1 extends DataType = DataType, DT2 extends DataType = DataType> extends BaseVOp<HighestDataType<[DT1, DT2]>, HighestDataShape<[DS1, DS2]>> {
    readonly left: IVOp<DT1, DS1>;
    readonly right: IVOp<DT2, DS2>;
    readonly kind: "add";
    constructor(left: IVOp<DT1, DS1>, right: IVOp<DT2, DS2>);
}
declare class SubOp<DS1 extends DataShape = DataShape, DS2 extends DataShape = DataShape, DT1 extends DataType = DataType, DT2 extends DataType = DataType> extends BaseVOp<HighestDataType<[DT1, DT2]>, HighestDataShape<[DS1, DS2]>> {
    readonly left: IVOp<DT1, DS1>;
    readonly right: IVOp<DT2, DS2>;
    readonly kind: "sub";
    constructor(left: IVOp<DT1, DS1>, right: IVOp<DT2, DS2>);
}
declare class MulOp<DS1 extends DataShape = DataShape, DS2 extends DataShape = DataShape, DT1 extends DataType = DataType, DT2 extends DataType = DataType> extends BaseVOp<HighestDataType<[DT1, DT2]>, HighestDataShape<[DS1, DS2]>> {
    readonly left: IVOp<DT1, DS1>;
    readonly right: IVOp<DT2, DS2>;
    readonly kind: "mul";
    constructor(left: IVOp<DT1, DS1>, right: IVOp<DT2, DS2>);
}
declare class DivOp<DS1 extends DataShape = DataShape, DS2 extends DataShape = DataShape, DT1 extends DataType = DataType, DT2 extends DataType = DataType> extends BaseVOp<HighestDataType<[DT1, DT2]>, HighestDataShape<[DS1, DS2]>> {
    readonly left: IVOp<DT1, DS1>;
    readonly right: IVOp<DT2, DS2>;
    readonly kind: "div";
    constructor(left: IVOp<DT1, DS1>, right: IVOp<DT2, DS2>);
}
declare class SumOp<DT extends DataType = DataType> extends BaseVOp<DT, 'scalar'> {
    readonly operand: IVOp<DT, any>;
    readonly kind: "sum";
    constructor(operand: IVOp<DT, any>);
}
declare class MeanOp extends BaseVOp<DTFloat<64>, 'scalar'> {
    readonly operand: IVOp<any, any>;
    readonly kind: "mean";
    constructor(operand: IVOp<any, any>);
}
declare class UpperOp<DS extends DataShape = DataShape> extends BaseVOp<DTString, DS> {
    readonly operand: IVOp<DTString, DS>;
    readonly kind: "upper";
    constructor(operand: IVOp<DTString, DS>);
}
declare class LowerOp<DS extends DataShape = DataShape> extends BaseVOp<DTString, DS> {
    readonly operand: IVOp<DTString, DS>;
    readonly kind: "lower";
    constructor(operand: IVOp<DTString, DS>);
}
declare class ContainsOp<DS1 extends DataShape = DataShape, DS2 extends DataShape = DataShape> extends BaseVOp<DTBoolean, HighestDataShape<[DS1, DS2]>> {
    readonly operand: IVOp<DTString, DS1>;
    readonly pattern: IVOp<DTString, DS2>;
    readonly kind: "contains";
    constructor(operand: IVOp<DTString, DS1>, pattern: IVOp<DTString, DS2>);
}
declare class StartsWithOp<DS1 extends DataShape = DataShape, DS2 extends DataShape = DataShape> extends BaseVOp<DTBoolean, HighestDataShape<[DS1, DS2]>> {
    readonly operand: IVOp<DTString, DS1>;
    readonly prefix: IVOp<DTString, DS2>;
    readonly kind: "starts_with";
    constructor(operand: IVOp<DTString, DS1>, prefix: IVOp<DTString, DS2>);
}
type TemporalDataType = {
    typecode: 'date';
    nullable: boolean;
} | {
    typecode: 'time';
    nullable: boolean;
} | {
    typecode: 'datetime';
    nullable: boolean;
};
declare class TemporalToStringOp<DS extends DataShape = DataShape> extends BaseVOp<DTString, DS> {
    readonly operand: IVOp<TemporalDataType, DS>;
    readonly format: string;
    readonly kind: "temporal_to_string";
    constructor(operand: IVOp<TemporalDataType, DS>, format: string);
}
declare class SortSpec {
    readonly op: IVOp<any, any>;
    readonly direction: 'asc' | 'desc';
    constructor(op: IVOp<any, any>, direction: 'asc' | 'desc');
}
type BuiltinVOp = IntLiteralOp | FloatLiteralOp | StringLiteralOp | BooleanLiteralOp | NullLiteralOp | DatetimeLiteralOp | DateLiteralOp | TimeLiteralOp | IntervalLiteralOp | UuidLiteralOp | ColRefOp | IsNotNullOp | IsNullOp | CountOp | EqOp | GtOp | GteOp | LtOp | LteOp | MinOp | MaxOp | LogicalNotOp | LogicalAndOp | LogicalOrOp | AddOp | SubOp | MulOp | DivOp | SumOp | MeanOp | UpperOp | LowerOp | ContainsOp | StartsWithOp | TemporalToStringOp;

declare abstract class BaseROp<S extends Schema = Schema, K extends string = string> implements IROp<S, K> {
    [IsROpSymbol]: true;
    abstract readonly kind: K;
    private _schema;
    protected abstract computeSchema(): S;
    schema(): S;
}
declare class FromOp<S extends Schema> extends BaseROp<S, 'from'> {
    readonly name: string;
    private readonly _initialSchema;
    readonly kind: "from";
    constructor(name: string, _initialSchema: S);
    protected computeSchema(): S;
}
declare class FilterOp<S extends Schema> extends BaseROp<S, 'filter'> {
    readonly source: IROp<S>;
    readonly condition: IVOp<DTBoolean>;
    readonly kind: "filter";
    constructor(source: IROp<S>, condition: IVOp<DTBoolean>);
    protected computeSchema(): S;
}
type DeriveOpSchema<S extends Schema, D extends Record<string, IVOp>> = Omit<S, keyof D> & {
    [K in keyof D]: ReturnType<D[K]['dtype']>;
};
declare class DeriveOp<S extends Schema, D extends Record<string, IVOp>> extends BaseROp<DeriveOpSchema<S, D>, 'derive'> {
    readonly source: IROp<S>;
    readonly derivations: [string, IVOp][];
    readonly kind: "derive";
    constructor(source: IROp<S>, derivations: [string, IVOp][]);
    protected computeSchema(): DeriveOpSchema<S, D>;
}
declare class SelectOp<S extends Schema> extends BaseROp<S, 'select'> {
    readonly source: IROp<any>;
    readonly selections: [string, IVOp][];
    readonly kind: "select";
    constructor(source: IROp<any>, selections: [string, IVOp][]);
    protected computeSchema(): S;
}
declare class GroupOp<S extends Schema> extends BaseROp<S, 'group'> {
    readonly source: IROp<any>;
    readonly keys: [string, IVOp][];
    readonly aggregations: [string, IVOp][];
    readonly kind: "group";
    constructor(source: IROp<any>, keys: [string, IVOp][], aggregations: [string, IVOp][]);
    protected computeSchema(): S;
}
declare class SortOp<S extends Schema> extends BaseROp<S, 'sort'> {
    readonly source: IROp<S>;
    readonly keys: SortSpec[];
    readonly kind: "sort";
    constructor(source: IROp<S>, keys: SortSpec[]);
    protected computeSchema(): S;
}
declare class TakeOp<S extends Schema> extends BaseROp<S, 'take'> {
    readonly source: IROp<S>;
    readonly n: number;
    readonly kind: "take";
    constructor(source: IROp<S>, n: number);
    protected computeSchema(): S;
}
type BuiltinROp = FromOp<any> | FilterOp<any> | DeriveOp<any, any> | SelectOp<any> | GroupOp<any> | SortOp<any> | TakeOp<any>;

interface VCompiler<Result, Accepts extends IVOp = IVOp> {
    compileVOp(op: Accepts): Result;
}
interface RCompiler<Result, Accepts extends IROp = IROp> {
    compileROp(op: Accepts): Result;
}
interface Compiler<VResult, RResult, VAccepts extends IVOp = IVOp, RAccepts extends IROp = IROp> extends VCompiler<VResult, VAccepts>, RCompiler<RResult, RAccepts> {
}

/** Given a datatype, what are the datatypes that are comparable to it eg with .eq() */
type DtypesComparableTo<DT extends DataType> = DT extends DTString ? DTString : DT extends NumericDataType ? NumericDataType : DT extends DTBoolean ? DTBoolean : DT extends DTDate ? DTDate : DT extends DTTime ? DTTime : DT extends DTDateTime ? DTDateTime : DT extends DTUUID ? DTUUID : DT extends DTInterval ? DTInterval : never;
type IntoValueComparableTo<TargetDT extends DataType> = LiteralValueCoercibleTo<TargetDT> | IVExpr<DtypesComparableTo<TargetDT>, any> | IVOp<DtypesComparableTo<TargetDT>, any>;

type VExpr<DT extends DataType = DataType, DS extends DataShape = DataShape> = DT extends {
    typecode: 'null';
} ? NullExpr<DS> : DT extends {
    typecode: 'string';
} ? StringExpr<DS> : DT extends NumericDataType ? NumericExpr<DT, DS> : DT extends {
    typecode: 'boolean';
} ? BooleanExpr<DS> : DT extends {
    typecode: 'date';
} ? DateExpr<DS> : DT extends {
    typecode: 'time';
} ? TimeExpr<DS> : DT extends {
    typecode: 'datetime';
} ? DateTimeExpr<DS> : DT extends {
    typecode: 'uuid';
} ? UUIDExpr<DS> : DT extends {
    typecode: 'interval';
} ? IntervalExpr<DS> : never;
declare function vOpToVExpr<DT extends DataType, DS extends DataShape>(op: IVOp<DT, DS>): VExpr<DT, DS>;
declare abstract class BaseVExpr<DT extends DataType = DataType, DS extends DataShape = DataShape> implements IVExpr<DT, DS> {
    private readonly _op;
    constructor(_op: IVOp<DT, DS>);
    [IsVExprSymbol]: true;
    dtype(): DT;
    dshape(): DS;
    toOp(): IVOp<DT, DS, string>;
}
declare class GenericVExpr<DT extends DataType = DataType, DS extends DataShape = DataShape> extends BaseVExpr<DT, DS> {
    isNotNull(): BooleanExpr<DS>;
    isNull(): BooleanExpr<DS>;
    eq<O extends IntoValueComparableTo<DT>>(other: O): BooleanExpr<"columnar" extends DS | InferDataShape<O> ? (DS | InferDataShape<O>) & "columnar" : "scalar">;
    gt<O extends IntoValueComparableTo<DT>>(other: O): BooleanExpr<"columnar" extends DS | InferDataShape<O> ? (DS | InferDataShape<O>) & "columnar" : "scalar">;
    gte<O extends IntoValueComparableTo<DT>>(other: O): BooleanExpr<"columnar" extends DS | InferDataShape<O> ? (DS | InferDataShape<O>) & "columnar" : "scalar">;
    lt<O extends IntoValueComparableTo<DT>>(other: O): BooleanExpr<"columnar" extends DS | InferDataShape<O> ? (DS | InferDataShape<O>) & "columnar" : "scalar">;
    lte<O extends IntoValueComparableTo<DT>>(other: O): BooleanExpr<"columnar" extends DS | InferDataShape<O> ? (DS | InferDataShape<O>) & "columnar" : "scalar">;
    min(): VExpr<DT, "scalar">;
    max(): VExpr<DT, "scalar">;
    desc(): SortExpr;
    asc(): SortExpr;
}
declare class NullExpr<DS extends DataShape = DataShape> extends GenericVExpr<DTNull, DS> {
}
declare class NumericExpr<DT extends NumericDataType = NumericDataType, DS extends DataShape = DataShape> extends GenericVExpr<DT, DS> {
    add<O extends number | IVExpr<NumericDataType, any>>(other: O): VExpr<DTFloat<64> extends DT | (O extends InferrableJsType ? InferDtypeFromJs<O> : O extends IntoDtype ? InferDtype<O> : never) ? (DT | (O extends InferrableJsType ? InferDtypeFromJs<O> : O extends IntoDtype ? InferDtype<O> : never)) & DTFloat<64> : DTFloat<32> extends DT | (O extends InferrableJsType ? InferDtypeFromJs<O> : O extends IntoDtype ? InferDtype<O> : never) ? (DT | (O extends InferrableJsType ? InferDtypeFromJs<O> : O extends IntoDtype ? InferDtype<O> : never)) & DTFloat<32> : DTFloat<16> extends DT | (O extends InferrableJsType ? InferDtypeFromJs<O> : O extends IntoDtype ? InferDtype<O> : never) ? (DT | (O extends InferrableJsType ? InferDtypeFromJs<O> : O extends IntoDtype ? InferDtype<O> : never)) & DTFloat<16> : DTFloat<8> extends DT | (O extends InferrableJsType ? InferDtypeFromJs<O> : O extends IntoDtype ? InferDtype<O> : never) ? (DT | (O extends InferrableJsType ? InferDtypeFromJs<O> : O extends IntoDtype ? InferDtype<O> : never)) & DTFloat<8> : DTInt<64> extends DT | (O extends InferrableJsType ? InferDtypeFromJs<O> : O extends IntoDtype ? InferDtype<O> : never) ? (DT | (O extends InferrableJsType ? InferDtypeFromJs<O> : O extends IntoDtype ? InferDtype<O> : never)) & DTInt<64> : DTInt<32> extends DT | (O extends InferrableJsType ? InferDtypeFromJs<O> : O extends IntoDtype ? InferDtype<O> : never) ? (DT | (O extends InferrableJsType ? InferDtypeFromJs<O> : O extends IntoDtype ? InferDtype<O> : never)) & DTInt<32> : DTInt<16> extends DT | (O extends InferrableJsType ? InferDtypeFromJs<O> : O extends IntoDtype ? InferDtype<O> : never) ? (DT | (O extends InferrableJsType ? InferDtypeFromJs<O> : O extends IntoDtype ? InferDtype<O> : never)) & DTInt<16> : DTInt<8> extends DT | (O extends InferrableJsType ? InferDtypeFromJs<O> : O extends IntoDtype ? InferDtype<O> : never) ? (DT | (O extends InferrableJsType ? InferDtypeFromJs<O> : O extends IntoDtype ? InferDtype<O> : never)) & DTInt<8> : never, "columnar" extends DS | InferDataShape<O> ? (DS | InferDataShape<O>) & "columnar" : "scalar">;
    sub<O extends number | IVExpr<NumericDataType, any>>(other: O): VExpr<DTFloat<64> extends DT | (O extends InferrableJsType ? InferDtypeFromJs<O> : O extends IntoDtype ? InferDtype<O> : never) ? (DT | (O extends InferrableJsType ? InferDtypeFromJs<O> : O extends IntoDtype ? InferDtype<O> : never)) & DTFloat<64> : DTFloat<32> extends DT | (O extends InferrableJsType ? InferDtypeFromJs<O> : O extends IntoDtype ? InferDtype<O> : never) ? (DT | (O extends InferrableJsType ? InferDtypeFromJs<O> : O extends IntoDtype ? InferDtype<O> : never)) & DTFloat<32> : DTFloat<16> extends DT | (O extends InferrableJsType ? InferDtypeFromJs<O> : O extends IntoDtype ? InferDtype<O> : never) ? (DT | (O extends InferrableJsType ? InferDtypeFromJs<O> : O extends IntoDtype ? InferDtype<O> : never)) & DTFloat<16> : DTFloat<8> extends DT | (O extends InferrableJsType ? InferDtypeFromJs<O> : O extends IntoDtype ? InferDtype<O> : never) ? (DT | (O extends InferrableJsType ? InferDtypeFromJs<O> : O extends IntoDtype ? InferDtype<O> : never)) & DTFloat<8> : DTInt<64> extends DT | (O extends InferrableJsType ? InferDtypeFromJs<O> : O extends IntoDtype ? InferDtype<O> : never) ? (DT | (O extends InferrableJsType ? InferDtypeFromJs<O> : O extends IntoDtype ? InferDtype<O> : never)) & DTInt<64> : DTInt<32> extends DT | (O extends InferrableJsType ? InferDtypeFromJs<O> : O extends IntoDtype ? InferDtype<O> : never) ? (DT | (O extends InferrableJsType ? InferDtypeFromJs<O> : O extends IntoDtype ? InferDtype<O> : never)) & DTInt<32> : DTInt<16> extends DT | (O extends InferrableJsType ? InferDtypeFromJs<O> : O extends IntoDtype ? InferDtype<O> : never) ? (DT | (O extends InferrableJsType ? InferDtypeFromJs<O> : O extends IntoDtype ? InferDtype<O> : never)) & DTInt<16> : DTInt<8> extends DT | (O extends InferrableJsType ? InferDtypeFromJs<O> : O extends IntoDtype ? InferDtype<O> : never) ? (DT | (O extends InferrableJsType ? InferDtypeFromJs<O> : O extends IntoDtype ? InferDtype<O> : never)) & DTInt<8> : never, "columnar" extends DS | InferDataShape<O> ? (DS | InferDataShape<O>) & "columnar" : "scalar">;
    mul<O extends number | IVExpr<NumericDataType, any>>(other: O): VExpr<DTFloat<64> extends DT | (O extends InferrableJsType ? InferDtypeFromJs<O> : O extends IntoDtype ? InferDtype<O> : never) ? (DT | (O extends InferrableJsType ? InferDtypeFromJs<O> : O extends IntoDtype ? InferDtype<O> : never)) & DTFloat<64> : DTFloat<32> extends DT | (O extends InferrableJsType ? InferDtypeFromJs<O> : O extends IntoDtype ? InferDtype<O> : never) ? (DT | (O extends InferrableJsType ? InferDtypeFromJs<O> : O extends IntoDtype ? InferDtype<O> : never)) & DTFloat<32> : DTFloat<16> extends DT | (O extends InferrableJsType ? InferDtypeFromJs<O> : O extends IntoDtype ? InferDtype<O> : never) ? (DT | (O extends InferrableJsType ? InferDtypeFromJs<O> : O extends IntoDtype ? InferDtype<O> : never)) & DTFloat<16> : DTFloat<8> extends DT | (O extends InferrableJsType ? InferDtypeFromJs<O> : O extends IntoDtype ? InferDtype<O> : never) ? (DT | (O extends InferrableJsType ? InferDtypeFromJs<O> : O extends IntoDtype ? InferDtype<O> : never)) & DTFloat<8> : DTInt<64> extends DT | (O extends InferrableJsType ? InferDtypeFromJs<O> : O extends IntoDtype ? InferDtype<O> : never) ? (DT | (O extends InferrableJsType ? InferDtypeFromJs<O> : O extends IntoDtype ? InferDtype<O> : never)) & DTInt<64> : DTInt<32> extends DT | (O extends InferrableJsType ? InferDtypeFromJs<O> : O extends IntoDtype ? InferDtype<O> : never) ? (DT | (O extends InferrableJsType ? InferDtypeFromJs<O> : O extends IntoDtype ? InferDtype<O> : never)) & DTInt<32> : DTInt<16> extends DT | (O extends InferrableJsType ? InferDtypeFromJs<O> : O extends IntoDtype ? InferDtype<O> : never) ? (DT | (O extends InferrableJsType ? InferDtypeFromJs<O> : O extends IntoDtype ? InferDtype<O> : never)) & DTInt<16> : DTInt<8> extends DT | (O extends InferrableJsType ? InferDtypeFromJs<O> : O extends IntoDtype ? InferDtype<O> : never) ? (DT | (O extends InferrableJsType ? InferDtypeFromJs<O> : O extends IntoDtype ? InferDtype<O> : never)) & DTInt<8> : never, "columnar" extends DS | InferDataShape<O> ? (DS | InferDataShape<O>) & "columnar" : "scalar">;
    div<O extends number | IVExpr<NumericDataType, any>>(other: O): VExpr<DTFloat<64> extends DT | (O extends InferrableJsType ? InferDtypeFromJs<O> : O extends IntoDtype ? InferDtype<O> : never) ? (DT | (O extends InferrableJsType ? InferDtypeFromJs<O> : O extends IntoDtype ? InferDtype<O> : never)) & DTFloat<64> : DTFloat<32> extends DT | (O extends InferrableJsType ? InferDtypeFromJs<O> : O extends IntoDtype ? InferDtype<O> : never) ? (DT | (O extends InferrableJsType ? InferDtypeFromJs<O> : O extends IntoDtype ? InferDtype<O> : never)) & DTFloat<32> : DTFloat<16> extends DT | (O extends InferrableJsType ? InferDtypeFromJs<O> : O extends IntoDtype ? InferDtype<O> : never) ? (DT | (O extends InferrableJsType ? InferDtypeFromJs<O> : O extends IntoDtype ? InferDtype<O> : never)) & DTFloat<16> : DTFloat<8> extends DT | (O extends InferrableJsType ? InferDtypeFromJs<O> : O extends IntoDtype ? InferDtype<O> : never) ? (DT | (O extends InferrableJsType ? InferDtypeFromJs<O> : O extends IntoDtype ? InferDtype<O> : never)) & DTFloat<8> : DTInt<64> extends DT | (O extends InferrableJsType ? InferDtypeFromJs<O> : O extends IntoDtype ? InferDtype<O> : never) ? (DT | (O extends InferrableJsType ? InferDtypeFromJs<O> : O extends IntoDtype ? InferDtype<O> : never)) & DTInt<64> : DTInt<32> extends DT | (O extends InferrableJsType ? InferDtypeFromJs<O> : O extends IntoDtype ? InferDtype<O> : never) ? (DT | (O extends InferrableJsType ? InferDtypeFromJs<O> : O extends IntoDtype ? InferDtype<O> : never)) & DTInt<32> : DTInt<16> extends DT | (O extends InferrableJsType ? InferDtypeFromJs<O> : O extends IntoDtype ? InferDtype<O> : never) ? (DT | (O extends InferrableJsType ? InferDtypeFromJs<O> : O extends IntoDtype ? InferDtype<O> : never)) & DTInt<16> : DTInt<8> extends DT | (O extends InferrableJsType ? InferDtypeFromJs<O> : O extends IntoDtype ? InferDtype<O> : never) ? (DT | (O extends InferrableJsType ? InferDtypeFromJs<O> : O extends IntoDtype ? InferDtype<O> : never)) & DTInt<8> : never, "columnar" extends DS | InferDataShape<O> ? (DS | InferDataShape<O>) & "columnar" : "scalar">;
    sum(): VExpr<DT, "scalar">;
    mean(): NumericExpr<DTFloat<64>, "scalar">;
}
declare class StringExpr<DS extends DataShape = DataShape> extends GenericVExpr<DTString, DS> {
    upper(): StringExpr<DS>;
    lower(): StringExpr<DS>;
    contains<O extends IntoValueOfType<'string', any>>(pattern: O): BooleanExpr<"columnar" extends DS | InferDataShape<O> ? (DS | InferDataShape<O>) & "columnar" : "scalar">;
    startsWith<O extends IntoValueOfType<'string', any>>(prefix: O): BooleanExpr<"columnar" extends DS | InferDataShape<O> ? (DS | InferDataShape<O>) & "columnar" : "scalar">;
}
type IntoValueOfType<DT extends IntoDtype, DS extends DataShape = DataShape> = AcceptableJsVal<DT> | IVExpr<InferDtype<DT>, DS> | IVOp<InferDtype<DT>, DS, any>;
declare class BooleanExpr<DS extends DataShape = DataShape> extends GenericVExpr<DTBoolean, DS> {
    and<O extends boolean | IVExpr<DTBoolean, any>>(other: O): BooleanExpr<"columnar" extends DS | InferDataShape<O> ? (DS | InferDataShape<O>) & "columnar" : "scalar">;
    or<O extends boolean | IVExpr<DTBoolean, any>>(other: O): BooleanExpr<"columnar" extends DS | InferDataShape<O> ? (DS | InferDataShape<O>) & "columnar" : "scalar">;
    not(): BooleanExpr<DS>;
}
declare class DateExpr<DS extends DataShape = DataShape> extends GenericVExpr<DTDate, DS> {
    toString(format: string): StringExpr<DS>;
}
declare class TimeExpr<DS extends DataShape = DataShape> extends GenericVExpr<DTTime, DS> {
    toString(format: string): StringExpr<DS>;
}
declare class DateTimeExpr<DS extends DataShape = DataShape> extends GenericVExpr<DTDateTime, DS> {
    toString(format: string): StringExpr<DS>;
}
declare class IntervalExpr<DS extends DataShape = DataShape> extends GenericVExpr<DTInterval, DS> {
}
declare class UUIDExpr<DS extends DataShape = DataShape> extends GenericVExpr<DTUUID, DS> {
}
declare function col<N extends string, DT extends IntoDtype>(name: N, dtype: DT): VExpr<InferDtype<DT>, "columnar">;
declare class SortExpr {
    readonly expr: BaseVExpr;
    readonly direction: 'asc' | 'desc';
    constructor(expr: BaseVExpr, direction: 'asc' | 'desc');
    toSortSpec(): SortSpec;
}
/**
 * Counts the number of rows. Analogous to SQL's COUNT(*). Returns a NumericExpr with dtype=int64 and dshape='scalar'.
 */
declare function count(): NumericExpr<DTInt<64>, "scalar">;
/**
 * Create a scalar value expression that represents a single literal value, eg \`ty.lit(42)\` or \`ty.lit("hello")\`.
 *
 * The dtype can be inferred from the value, or explicitly provided if needed.
 *
 * Note how \`ty.lit("name")\` represents a string literal value, which is different from \`myrelation.cols.name\`, which represents a reference to a column named "name".
 *
 * @param value The literal value to use.
 * @param dtype The optional data type of the literal. If not provided, it will be inferred from the value.
 * @returns A VExpr representing the literal value.
 */
declare function lit<JS extends AcceptableJsVal<DT>, DT extends IntoDtype | undefined = undefined>(value: JS, dtype?: DT): VExpr<ExplicitOrInferredDtype<JS, DT>, "scalar">;

type Col<DT extends DataType = DataType> = VExpr<DT, 'columnar'>;
/**
 * A flat namespace of column expressions for a given schema.
 *
 * \`cols.species\` returns a columnar expression for the \`species\` column.
 * Bracket access (\`cols["first name"]\`) works for column names that aren't valid identifiers.
 * Accessing an unknown column throws an error (with a typo suggestion when applicable).
 */
type Cols<S extends Schema> = {
    readonly [K in keyof S & string]: Col<S[K]>;
};
type AggResultSchema<A extends Record<string, IVExpr<any, 'scalar'>>> = {
    [K in keyof A]: A[K] extends IVExpr<infer T, 'scalar'> ? T : never;
};
type DeriveSchema<S extends Schema, D extends Record<string, IVExpr<any, any>>> = Omit<S, keyof D> & {
    [K in keyof D]: D[K] extends IVExpr<infer T, any> ? T : never;
};
type SelectInput<S extends Schema, D> = {
    [K in keyof D]: K extends keyof S ? (IVExpr<any, any> | boolean) : IVExpr<any, any>;
};
type SelectSchema<S extends Schema, D> = {
    [K in keyof D as D[K] extends false ? never : K]: D[K] extends IVExpr<infer T, any> ? T : D[K] extends boolean ? (K extends keyof S ? S[K] : never) : never;
};
declare class Relation<S extends Schema = Schema, O extends IROp<S> = IROp<S>> {
    /** @internal */ readonly _op: O;
    /**
     * A flat namespace of every column in the relation as a property.
     * @example penguins.cols.bill_length_mm.mean()
     * @example penguins.cols["first name"]  // bracket access for non-identifier names
     */
    readonly cols: Cols<S>;
    constructor(
    /** @internal */ _op: O);
    /**
     * The schema of the relation, i.e. the mapping of column names to their data types.
     * @example
     * const penguins = ty.table('penguins', { species: 'string', bill_length_mm: 'float64' })
     * penguins.derive(r => ({ bill_length_cm: r.bill_length_mm.div(10) })).schema
     */
    get schema(): S;
    /**
     * Filter rows using a boolean expression.
     * @example penguins.filter(r => r.bill_length_mm.gt(40))
     */
    filter(cb: (r: Cols<S>) => BooleanExpr): Relation<S, FilterOp<S>>;
    /**
     * Group rows by key columns, returning a {@link GroupedRelation} for aggregation.
     * @example
     * penguins.groupBy(r => ({ species: true, year: true }))
     *   .agg(r => ({ count: ty.count(), mean_bill: r.bill_length_mm.mean() }))
     */
    groupBy<K extends SelectInput<S, K>>(keys: (r: Cols<S>) => K & (keyof K extends never ? "At least one grouping key is required" : K)): GroupedRelation<S, SelectSchema<S, K>>;
    /**
     * Add computed columns to each row.
     * @example penguins.derive(r => ({ ratio: r.bill_length_mm.div(40) }))
     * @example penguins.derive({ year_offset: lit(2000) })
     */
    derive<D extends Record<string, IVExpr<any, any>>>(input: D | ((r: Cols<S>) => D)): Relation<DeriveSchema<S, D>>;
    /**
     * Replace existing columns with a new set of expressions.
     * @example penguins.select(r => ({ species: r.species, age: r.year.sub(2000) }))
     * @example penguins.select({ species: true }) // Keep existing column
     */
    select<D extends SelectInput<S, D>>(input: D | ((r: Cols<S>) => D)): Relation<SelectSchema<S, D>, SelectOp<SelectSchema<S, D>>>;
    /**
     * Sort rows by one or more keys.
     * @example penguins.sort(r => r.count.desc())
     * @example penguins.sort(r => [r.species, r.year.desc()])
     */
    sort(cb: (r: Cols<S>) => SortExpr | IVExpr<any, any> | (SortExpr | IVExpr<any, any>)[]): Relation<S, SortOp<S>>;
    /**
     * Take the first n rows.
     * @example penguins.take(10)
     */
    take(n: number): Relation<S, TakeOp<S>>;
    compile<R>(compiler: RCompiler<R, O>): R;
}
/**
 * The result of calling {@link Relation.groupBy}. Use {@link GroupedRelation.agg}
 * to produce a new aggregated {@link Relation}.
 */
declare class GroupedRelation<S extends Schema, KS extends Schema> {
    private readonly _source;
    private readonly _keyPairs;
    /** @internal */ readonly _keySchema: KS;
    constructor(_source: Relation<S>, _keyPairs: [string, IVOp][], 
    /** @internal */ _keySchema: KS);
    /**
     * Aggregate the group with a record of scalar expressions.
     * @example
     * penguins.groupBy(r => ({ species: true }))
     *   .agg(r => ({ count: ty.count(), mean_bill: r.bill_length_mm.mean() }))
     */
    agg<A extends Record<string, IVExpr<any, 'scalar'>>>(input: A | ((r: Cols<S>) => A)): Relation<KS & AggResultSchema<A>, GroupOp<KS & AggResultSchema<A>>>;
}
/**
 * Define a relation backed by a database table or view.
 * @param name The name of the table or view.
 * @param sch An object describing the schema, where keys are column names and values are data types.
 * @example
 * const penguins = table('penguins', {
 *   species: DT.string,
 *   year: DT.int32,
 *   bill_length_mm: DT.float64,
 * })
 */
declare function table<S extends IntoSchema>(name: string, sch: S): Relation<InferSchema<S>, FromOp<InferSchema<S>>>;

export { BaseVOp, type BuiltinROp, type BuiltinVOp, type Compiler, DTBoolean, DTCustom, DTDate, DTDateTime, DTFloat, DTInt, DTInterval, DTNull, DTString, DTTime, DTUUID, type DataShape, type DataType, type IROp, type IVExpr, type IVOp, type InferSchema, type JSTypeFromDtype, Relation, type Schema, type VExpr, col, count, dtype, lit, schema, table, vOpToVExpr };
 }`

export const TYBIS_SQL_COMPILER_DTS = /* ts */ `declare module "tybis-sql-compiler" { import * as tybis from 'tybis';
import { BuiltinROp, Schema, Compiler, BuiltinVOp, IROp, DataType, DataShape, Relation } from 'tybis';
import { RawSqlOp } from './ops.js';

/**
 * Fragment-based SQL representation.
 *
 * A {@link Sql} value is a flat array of {@link SqlFragment}s — each one is
 * either a string of literal SQL text or a {@link Param} placeholder for a
 * runtime value. The placeholders are resolved into the dialect's parameter
 * marker (\$1, ?, etc.) by {@link SqlCompiler.finalize}.
 */
type Param = {
    readonly value: unknown;
};
type SqlFragment = string | Param;
type Sql = SqlFragment[];
/** Final compiled output: a SQL string plus an ordered array of parameter values. */
type CompiledQuery = {
    sql: string;
    params: unknown[];
};
/** Wrap an arbitrary JS value as a parameter placeholder. */
declare const param: (value: unknown) => Param;
/**
 * Tagged template for composing Sql fragments naturally.
 *
 * @example
 * f\`strpos(\${this.compileVOp(op.operand)}, \${this.compileVOp(op.pattern)}) > 0\`
 */
declare function f(strings: TemplateStringsArray, ...values: Sql[]): Sql;

type IVOpLike = {
    readonly kind: string;
};
interface SortSpecLike {
    readonly op: IVOpLike;
    readonly direction: 'asc' | 'desc';
}
/**
 * Full op set the SQL compilers know how to compile: every builtin tybis op
 * plus the SQL-specific {@link RawSqlOp} escape hatch.
 */
type SqlVOp = BuiltinVOp | RawSqlOp;

/**
 * Handler record keyed by the \`kind\` discriminator of {@link SqlVOp}.
 *
 * Each handler receives the *full typed op object* — renaming a field on the
 * op class breaks the corresponding handler immediately. Adding a new op kind
 * to {@link SqlVOp} surfaces as a missing-key error wherever the handler
 * record is \`satisfies\`-checked (see \`ANSI_V_HANDLERS\`).
 */
type VOpHandlers<Self> = {
    [K in SqlVOp['kind']]: (this: Self, op: Extract<SqlVOp, {
        kind: K;
    }>) => Sql;
};
/**
 * Handler record keyed by the \`kind\` discriminator of {@link BuiltinROp}.
 *
 * Each handler is responsible for either merging the incoming op into the
 * current {@link QueryLevel} or closing the level and opening a new one.
 */
type ROpPlanHandlers<Self> = {
    [K in BuiltinROp['kind']]: (this: Self, op: Extract<BuiltinROp, {
        kind: K;
    }>, ctx: PlannerCtx) => void;
};
interface QueryLevel {
    from: string;
    /** Schema visible at the start of this level — used for derive-shadow detection. */
    derivesSourceSchema?: Schema;
    filters: IVOpLike[];
    derives: [string, IVOpLike][];
    select?: [string, IVOpLike][];
    group?: {
        keys: [string, IVOpLike][];
        aggs: [string, IVOpLike][];
    };
    sort?: SortSpecLike[];
    limit?: number;
}
interface PlannerCtx {
    /** Already-closed levels, in order. Each becomes a CTE. */
    levels: QueryLevel[];
    /** The level currently being built. */
    current: QueryLevel;
    /** Monotonically increasing counter used to mint CTE names. */
    cteCounter: number;
}
/**
 * Close the current level, push it onto the completed list, and start a new
 * level whose \`from\` is the just-closed level's CTE name.
 */
declare function closeLevel(ctx: PlannerCtx, sourceSchema: Schema): string;
declare abstract class SqlCompiler implements Compiler<Sql, CompiledQuery, SqlVOp, IROp> {
    abstract readonly vHandlers: VOpHandlers<SqlCompiler>;
    abstract readonly rHandlers: ROpPlanHandlers<SqlCompiler>;
    /** Compile a value op to a {@link Sql} fragment array. */
    compileVOp(op: SqlVOp): Sql;
    /**
     * Plan an ROp chain into levels, then compile and finalize.
     *
     * Returns a {@link CompiledQuery} so that this method satisfies the public
     * \`Compiler<CompiledQuery>\` interface.
     */
    compileROp(op: IROp): CompiledQuery;
    /**
     * Walk the op chain leaf-first and produce a populated {@link PlannerCtx}.
     */
    protected planROp(rootOp: BuiltinROp): PlannerCtx;
    /** Compile a single {@link QueryLevel} into a SELECT statement (no semicolon). */
    protected emitLevel(level: QueryLevel): Sql;
    /** Stitch the closed levels and the current level into a final SQL fragment array. */
    protected emitLevels(ctx: PlannerCtx): Sql;
    /** Convenience: emit either a quoted identifier or, for an internal \`_cte_N\` ref, leave unquoted. */
    protected quoteIdentIfNotCte(name: string): string;
    /**
     * Wrap an expression as \`expr AS alias\` when the expression isn't already a
     * bare reference to that same identifier. Avoids redundant \`name AS name\`.
     */
    protected aliasIfNeeded(expr: Sql, alias: string): Sql;
    /** Default placeholder style: \`\$1, \$2, …\` (postgres). Override per dialect. */
    protected placeholder(n: number): string;
    /** Default identifier quoting: ANSI double-quotes. Override per dialect. */
    protected quoteIdent(name: string): string;
    /** Collapse a {@link Sql} fragment array into a finished {@link CompiledQuery}. */
    protected finalize(sql: Sql): CompiledQuery;
}

declare class DuckDbSqlCompiler extends SqlCompiler {
    readonly vHandlers: VOpHandlers<SqlCompiler>;
    readonly rHandlers: ROpPlanHandlers<SqlCompiler>;
}

declare class MySqlSqlCompiler extends SqlCompiler {
    readonly vHandlers: VOpHandlers<SqlCompiler>;
    readonly rHandlers: ROpPlanHandlers<SqlCompiler>;
    protected placeholder(_n: number): string;
    protected quoteIdent(name: string): string;
}

declare class PostgresSqlCompiler extends SqlCompiler {
    readonly vHandlers: VOpHandlers<SqlCompiler>;
    readonly rHandlers: ROpPlanHandlers<SqlCompiler>;
}

declare class SqliteSqlCompiler extends SqlCompiler {
    readonly vHandlers: VOpHandlers<SqlCompiler>;
    readonly rHandlers: ROpPlanHandlers<SqlCompiler>;
    protected placeholder(_n: number): string;
}

declare const ANSI_V_HANDLERS: VOpHandlers<SqlCompiler>;
declare const ANSI_R_HANDLERS: ROpPlanHandlers<SqlCompiler>;

/**
 * Creates a raw SQL expression. The caller must provide the raw SQL string, as well as the expected dtype and dshape of the result.
 * This is an escape hatch for when you need to use a function or expression that isn't natively supported by Tybis.
 *
 * The provided dtype and dshape will ONLY be used for type-checking and expression-building purposes,
 * and will have no effect at runtime.
 * So if you pass the wrong dtype/dshape, your code might type-check but then fail at runtime, or return incorrect results.
 * Use with caution!
 *
 * @param rawSql The raw SQL string to use.
 * @param dtype The expected data type of the result.
 * @param dshape The expected data shape of the result.
 * @returns A VExpr representing the raw SQL expression.
 */
declare function sql<DT extends DataType, DS extends DataShape>(rawSql: string, dtype: DT, dshape: DS): tybis.VExpr<DT, DS>;

declare const DIALECT_TO_COMPILER_CLASS: {
    readonly duckdb: typeof DuckDbSqlCompiler;
    readonly postgres: typeof PostgresSqlCompiler;
    readonly mysql: typeof MySqlSqlCompiler;
    readonly sqlite: typeof SqliteSqlCompiler;
};
declare const DIALECTS: (keyof typeof DIALECT_TO_COMPILER_CLASS)[];
type Dialect = typeof DIALECTS[number];
/** Compile a {@link Relation} to a SQL string and params. */
declare function toSql(relation: Relation<Schema, BuiltinROp>, dialect?: Dialect): CompiledQuery;

export { ANSI_R_HANDLERS, ANSI_V_HANDLERS, type CompiledQuery, DIALECTS, DIALECT_TO_COMPILER_CLASS, type Dialect, DuckDbSqlCompiler, MySqlSqlCompiler, type Param, type PlannerCtx, PostgresSqlCompiler, type QueryLevel, type ROpPlanHandlers, type Sql, SqlCompiler, type SqlFragment, type SqlVOp, SqliteSqlCompiler, type VOpHandlers, closeLevel, f, param, sql, toSql };
 }`
