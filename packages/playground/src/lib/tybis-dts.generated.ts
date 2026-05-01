/**
 * Type declarations injected into the Monaco editor so users get
 * autocomplete and type-checking for the tybis API and the `preview`
 * sandbox function.
 * 
 * Auto-generated from tybis package types.
 */

export const TYBIS_DTS = /* ts */ `declare module "tybis" { type DataShape = 'scalar' | 'columnar';
type HighestDataShape<Shapes extends DataShape[]> = Shapes extends [] ? never : 'columnar' extends Shapes[number] ? 'columnar' : 'scalar';
type IntoDataShape = DataShape | IVExpr<any, any> | IVOp<any, any> | InferrableJsType;
type InferDataShape<T extends IntoDataShape> = T extends DataShape ? T : T extends IVExpr<any, infer DS> ? DS : T extends IVOp<any, infer DS> ? DS : T extends InferrableJsType ? 'scalar' : never;

declare const IsVOpSymbol: unique symbol;
declare const IsVExprSymbol: unique symbol;
/**
 * An IVOp is an interface for a value-op, for example \`add(5, relation.col('height_cm'))\`.
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
type IntoDtype = DataType | DTypeShorthands | IVExpr<DataType, any> | IVOp<DataType, any, any>;
type InferDtype<DT extends IntoDtype> = DT extends DataType ? DT : DT extends DTypeShorthands ? InferDtypeFromShorthand<DT> : DT extends IVExpr<infer D, any> ? D : DT extends IVOp<infer D, any, any> ? D : never;
type HighestDataType<DTs extends DataType[]> = DTs extends [] ? never : DTFloat64 extends DTs[number] ? DTFloat64 : DTFloat32 extends DTs[number] ? DTFloat32 : DTFloat16 extends DTs[number] ? DTFloat16 : DTFloat8 extends DTs[number] ? DTFloat8 : DTInt64 extends DTs[number] ? DTInt64 : DTInt32 extends DTs[number] ? DTInt32 : DTInt16 extends DTs[number] ? DTInt16 : DTInt8 extends DTs[number] ? DTInt8 : never;

type Schema = Record<string, DataType>;
type IntoSchema = Schema | Record<string, IntoDtype>;
type InferSchema<T extends IntoSchema> = T extends Schema ? T : T extends Record<string, IntoDtype> ? {
    [K in keyof T]: InferDtype<T[K]>;
} : never;

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

declare abstract class BaseOp<DT extends DataType = DataType, DS extends DataShape = DataShape> implements IVOp<DT, DS> {
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
declare class IntLiteralOp<DT extends DTInt = DTInt> extends BaseOp<DT, 'scalar'> {
    readonly raw: IntoIntLiteralValue;
    readonly kind: "int_literal";
    readonly value: number;
    constructor(raw: IntoIntLiteralValue, dtype?: DT);
}
type IntoFloatLiteralValue = number | \`\${number}\` | 'NAN' | 'nan' | 'NaN';
declare class FloatLiteralOp<DT extends DTFloat = DTFloat> extends BaseOp<DT, 'scalar'> {
    readonly raw: IntoFloatLiteralValue;
    readonly kind: "float_literal";
    readonly value: number;
    constructor(raw: IntoFloatLiteralValue, dtype?: DT);
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
type LiteralValueCoercibleTo<DT extends DataType> = DT extends DTInt ? IntoIntLiteralValue : DT extends DTFloat ? IntoFloatLiteralValue : DT extends DTString ? IntoStringLiteralValue : DT extends DTBoolean ? IntoBooleanLiteralValue : DT extends DTDateTime ? IntoDatetimeLiteralValue : DT extends DTDate ? IntoDateLiteralValue : DT extends DTTime ? IntoTimeLiteralValue : DT extends DTInterval ? IntoIntervalLiteralValue : DT extends DTUUID ? IntoUuidLiteralValue : never;
type AcceptableJsVal<DT extends IntoDtype | undefined = undefined> = DT extends IntoDtype ? LiteralValueCoercibleTo<InferDtype<DT>> : InferrableJsType;
type ExplicitOrInferredDtype<JS extends InferrableJsType, DT extends IntoDtype | undefined> = DT extends IntoDtype ? InferDtype<DT> : InferDtypeFromJs<JS>;

declare class ColRefOp<N extends string = string, DT extends IntoDtype = DataType> extends BaseOp<InferDtype<DT>, 'columnar'> {
    readonly name: N;
    readonly kind: "col_ref";
    constructor(name: N, dtype: DT);
    getName(): string;
}
declare class IsNotNullOp<DS extends DataShape = DataShape> extends BaseOp<DTBoolean, DS> {
    readonly operand: IVOp<DataType, DS>;
    readonly kind: "is_not_null";
    constructor(operand: IVOp<DataType, DS>);
}
declare class IsNullOp<DS extends DataShape = DataShape> extends BaseOp<DTBoolean, DS> {
    readonly operand: IVOp<DataType, DS>;
    readonly kind: "is_null";
    constructor(operand: IVOp<DataType, DS>);
}
declare class CountOp extends BaseOp<DTInt<64>, 'scalar'> {
    readonly kind: "count";
    constructor();
}
declare class RawSqlOp<DT extends DataType = DataType, DS extends DataShape = DataShape> extends BaseOp<DT, DS> {
    readonly rawSql: string;
    readonly kind: "raw_sql";
    constructor(rawSql: string, dtype: DT, dshape: DS);
}
declare class EqOp<DS1 extends DataShape = DataShape, DS2 extends DataShape = DataShape> extends BaseOp<DTBoolean, HighestDataShape<[DS1, DS2]>> {
    readonly left: IVOp<DataType, DS1>;
    readonly right: IVOp<DataType, DS2>;
    readonly kind: "eq";
    constructor(left: IVOp<DataType, DS1>, right: IVOp<DataType, DS2>);
}
declare class GtOp<DS1 extends DataShape = DataShape, DS2 extends DataShape = DataShape> extends BaseOp<DTBoolean, HighestDataShape<[DS1, DS2]>> {
    readonly left: IVOp<DataType, DS1>;
    readonly right: IVOp<DataType, DS2>;
    readonly kind: "gt";
    constructor(left: IVOp<DataType, DS1>, right: IVOp<DataType, DS2>);
}
declare class GteOp<DS1 extends DataShape = DataShape, DS2 extends DataShape = DataShape> extends BaseOp<DTBoolean, HighestDataShape<[DS1, DS2]>> {
    readonly left: IVOp<DataType, DS1>;
    readonly right: IVOp<DataType, DS2>;
    readonly kind: "gte";
    constructor(left: IVOp<DataType, DS1>, right: IVOp<DataType, DS2>);
}
declare class LtOp<DS1 extends DataShape = DataShape, DS2 extends DataShape = DataShape> extends BaseOp<DTBoolean, HighestDataShape<[DS1, DS2]>> {
    readonly left: IVOp<DataType, DS1>;
    readonly right: IVOp<DataType, DS2>;
    readonly kind: "lt";
    constructor(left: IVOp<DataType, DS1>, right: IVOp<DataType, DS2>);
}
declare class LteOp<DS1 extends DataShape = DataShape, DS2 extends DataShape = DataShape> extends BaseOp<DTBoolean, HighestDataShape<[DS1, DS2]>> {
    readonly left: IVOp<DataType, DS1>;
    readonly right: IVOp<DataType, DS2>;
    readonly kind: "lte";
    constructor(left: IVOp<DataType, DS1>, right: IVOp<DataType, DS2>);
}
declare class MinOp<DT extends DataType = DataType> extends BaseOp<DT, 'scalar'> {
    readonly operand: IVOp<DT, any>;
    readonly kind: "min";
    constructor(operand: IVOp<DT, any>);
}
declare class MaxOp<DT extends DataType = DataType> extends BaseOp<DT, 'scalar'> {
    readonly operand: IVOp<DT, any>;
    readonly kind: "max";
    constructor(operand: IVOp<DT, any>);
}
declare class LogicalNotOp<DS extends DataShape = DataShape> extends BaseOp<DTBoolean, DS> {
    readonly operand: IVOp<DTBoolean, DS>;
    readonly kind: "not";
    constructor(operand: IVOp<DTBoolean, DS>);
}
declare class LogicalAndOp<DS1 extends DataShape = DataShape, DS2 extends DataShape = DataShape> extends BaseOp<DTBoolean, HighestDataShape<[DS1, DS2]>> {
    readonly left: IVOp<DTBoolean, DS1>;
    readonly right: IVOp<DTBoolean, DS2>;
    readonly kind: "and";
    constructor(left: IVOp<DTBoolean, DS1>, right: IVOp<DTBoolean, DS2>);
}
declare class LogicalOrOp<DS1 extends DataShape = DataShape, DS2 extends DataShape = DataShape> extends BaseOp<DTBoolean, HighestDataShape<[DS1, DS2]>> {
    readonly left: IVOp<DTBoolean, DS1>;
    readonly right: IVOp<DTBoolean, DS2>;
    readonly kind: "or";
    constructor(left: IVOp<DTBoolean, DS1>, right: IVOp<DTBoolean, DS2>);
}
declare class AddOp<DS1 extends DataShape = DataShape, DS2 extends DataShape = DataShape, DT1 extends DataType = DataType, DT2 extends DataType = DataType> extends BaseOp<HighestDataType<[DT1, DT2]>, HighestDataShape<[DS1, DS2]>> {
    readonly left: IVOp<DT1, DS1>;
    readonly right: IVOp<DT2, DS2>;
    readonly kind: "add";
    constructor(left: IVOp<DT1, DS1>, right: IVOp<DT2, DS2>);
}
declare class SubOp<DS1 extends DataShape = DataShape, DS2 extends DataShape = DataShape, DT1 extends DataType = DataType, DT2 extends DataType = DataType> extends BaseOp<HighestDataType<[DT1, DT2]>, HighestDataShape<[DS1, DS2]>> {
    readonly left: IVOp<DT1, DS1>;
    readonly right: IVOp<DT2, DS2>;
    readonly kind: "sub";
    constructor(left: IVOp<DT1, DS1>, right: IVOp<DT2, DS2>);
}
declare class MulOp<DS1 extends DataShape = DataShape, DS2 extends DataShape = DataShape, DT1 extends DataType = DataType, DT2 extends DataType = DataType> extends BaseOp<HighestDataType<[DT1, DT2]>, HighestDataShape<[DS1, DS2]>> {
    readonly left: IVOp<DT1, DS1>;
    readonly right: IVOp<DT2, DS2>;
    readonly kind: "mul";
    constructor(left: IVOp<DT1, DS1>, right: IVOp<DT2, DS2>);
}
declare class DivOp<DS1 extends DataShape = DataShape, DS2 extends DataShape = DataShape, DT1 extends DataType = DataType, DT2 extends DataType = DataType> extends BaseOp<HighestDataType<[DT1, DT2]>, HighestDataShape<[DS1, DS2]>> {
    readonly left: IVOp<DT1, DS1>;
    readonly right: IVOp<DT2, DS2>;
    readonly kind: "div";
    constructor(left: IVOp<DT1, DS1>, right: IVOp<DT2, DS2>);
}
declare class SumOp<DT extends DataType = DataType> extends BaseOp<DT, 'scalar'> {
    readonly operand: IVOp<DT, any>;
    readonly kind: "sum";
    constructor(operand: IVOp<DT, any>);
}
declare class MeanOp extends BaseOp<DTFloat64, 'scalar'> {
    readonly operand: IVOp<any, any>;
    readonly kind: "mean";
    constructor(operand: IVOp<any, any>);
}
declare class UpperOp<DS extends DataShape = DataShape> extends BaseOp<DTString, DS> {
    readonly operand: IVOp<{
        typecode: 'string';
    }, DS>;
    readonly kind: "upper";
    constructor(operand: IVOp<{
        typecode: 'string';
    }, DS>);
}
declare class LowerOp<DS extends DataShape = DataShape> extends BaseOp<DTString, DS> {
    readonly operand: IVOp<{
        typecode: 'string';
    }, DS>;
    readonly kind: "lower";
    constructor(operand: IVOp<{
        typecode: 'string';
    }, DS>);
}
declare class ContainsOp<DS1 extends DataShape = DataShape, DS2 extends DataShape = DataShape> extends BaseOp<DTBoolean, HighestDataShape<[DS1, DS2]>> {
    readonly operand: IVOp<{
        typecode: 'string';
    }, DS1>;
    readonly pattern: IVOp<{
        typecode: 'string';
    }, DS2>;
    readonly kind: "contains";
    constructor(operand: IVOp<{
        typecode: 'string';
    }, DS1>, pattern: IVOp<{
        typecode: 'string';
    }, DS2>);
}
declare class StartsWithOp<DS1 extends DataShape = DataShape, DS2 extends DataShape = DataShape> extends BaseOp<DTBoolean, HighestDataShape<[DS1, DS2]>> {
    readonly operand: IVOp<{
        typecode: 'string';
    }, DS1>;
    readonly prefix: IVOp<{
        typecode: 'string';
    }, DS2>;
    readonly kind: "starts_with";
    constructor(operand: IVOp<{
        typecode: 'string';
    }, DS1>, prefix: IVOp<{
        typecode: 'string';
    }, DS2>);
}
type TemporalDataType = {
    typecode: 'date';
} | {
    typecode: 'time';
} | {
    typecode: 'datetime';
};
declare class TemporalToStringOp<DS extends DataShape = DataShape> extends BaseOp<DTString, DS> {
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
type BuiltinVOp = IntLiteralOp | FloatLiteralOp | StringLiteralOp | BooleanLiteralOp | NullLiteralOp | DatetimeLiteralOp | DateLiteralOp | TimeLiteralOp | ColRefOp | IsNotNullOp | IsNullOp | CountOp | RawSqlOp | EqOp | GtOp | GteOp | LtOp | LteOp | MinOp | MaxOp | LogicalNotOp | LogicalAndOp | LogicalOrOp | AddOp | SubOp | MulOp | DivOp | SumOp | MeanOp | UpperOp | LowerOp | ContainsOp | StartsWithOp | TemporalToStringOp;

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
    readonly condition: IVOp<{
        typecode: 'boolean';
    }>;
    readonly kind: "filter";
    constructor(source: IROp<S>, condition: IVOp<{
        typecode: 'boolean';
    }>);
    protected computeSchema(): S;
}
declare class DeriveOp<S extends Schema, D extends Record<string, IVOp>> extends BaseROp<S & {
    [K in keyof D]: ReturnType<D[K]['dtype']>;
}, 'derive'> {
    readonly source: IROp<S>;
    readonly derivations: [string, IVOp][];
    readonly kind: "derive";
    constructor(source: IROp<S>, derivations: [string, IVOp][]);
    protected computeSchema(): S & {
        [K in keyof D]: ReturnType<D[K]['dtype']>;
    };
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

interface Compiler<V extends IVOp<any, any, string> = BuiltinVOp, R = BuiltinROp> {
    compileVOp(op: V): string;
    compileROp(op: R): string;
}

/** Given a datatype, what are the datatypes that are comparable to it eg with .eq() */
type DtypesComparableTo<DT extends DataType> = DT extends {
    typecode: 'string';
} ? {
    typecode: 'string';
} : DT extends NumericDataType ? NumericDataType : DT extends {
    typecode: 'boolean';
} ? {
    typecode: 'boolean';
} : DT extends {
    typecode: 'date';
} ? {
    typecode: 'date';
} : DT extends {
    typecode: 'time';
} ? {
    typecode: 'time';
} : DT extends {
    typecode: 'datetime';
} ? {
    typecode: 'datetime';
} : DT extends {
    typecode: 'uuid';
} ? {
    typecode: 'uuid';
} : DT extends {
    typecode: 'interval';
} ? {
    typecode: 'interval';
} : never;
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
declare class NullExpr<DS extends DataShape = DataShape> extends GenericVExpr<{
    typecode: 'null';
}, DS> {
}
declare class NumericExpr<DT extends NumericDataType = NumericDataType, DS extends DataShape = DataShape> extends GenericVExpr<DT, DS> {
    add<O extends number | IVExpr<NumericDataType, any>>(other: O): VExpr<DTFloat64 extends DT | (O extends InferrableJsType ? InferDtypeFromJs<O> : O extends IntoDtype ? InferDtype<O> : never) ? (DT | (O extends InferrableJsType ? InferDtypeFromJs<O> : O extends IntoDtype ? InferDtype<O> : never)) & DTFloat64 : DTFloat32 extends DT | (O extends InferrableJsType ? InferDtypeFromJs<O> : O extends IntoDtype ? InferDtype<O> : never) ? (DT | (O extends InferrableJsType ? InferDtypeFromJs<O> : O extends IntoDtype ? InferDtype<O> : never)) & DTFloat32 : DTFloat16 extends DT | (O extends InferrableJsType ? InferDtypeFromJs<O> : O extends IntoDtype ? InferDtype<O> : never) ? (DT | (O extends InferrableJsType ? InferDtypeFromJs<O> : O extends IntoDtype ? InferDtype<O> : never)) & DTFloat16 : DTFloat8 extends DT | (O extends InferrableJsType ? InferDtypeFromJs<O> : O extends IntoDtype ? InferDtype<O> : never) ? (DT | (O extends InferrableJsType ? InferDtypeFromJs<O> : O extends IntoDtype ? InferDtype<O> : never)) & DTFloat8 : DTInt64 extends DT | (O extends InferrableJsType ? InferDtypeFromJs<O> : O extends IntoDtype ? InferDtype<O> : never) ? (DT | (O extends InferrableJsType ? InferDtypeFromJs<O> : O extends IntoDtype ? InferDtype<O> : never)) & DTInt64 : DTInt32 extends DT | (O extends InferrableJsType ? InferDtypeFromJs<O> : O extends IntoDtype ? InferDtype<O> : never) ? (DT | (O extends InferrableJsType ? InferDtypeFromJs<O> : O extends IntoDtype ? InferDtype<O> : never)) & DTInt32 : DTInt16 extends DT | (O extends InferrableJsType ? InferDtypeFromJs<O> : O extends IntoDtype ? InferDtype<O> : never) ? (DT | (O extends InferrableJsType ? InferDtypeFromJs<O> : O extends IntoDtype ? InferDtype<O> : never)) & DTInt16 : DTInt8 extends DT | (O extends InferrableJsType ? InferDtypeFromJs<O> : O extends IntoDtype ? InferDtype<O> : never) ? (DT | (O extends InferrableJsType ? InferDtypeFromJs<O> : O extends IntoDtype ? InferDtype<O> : never)) & DTInt8 : never, "columnar" extends DS | InferDataShape<O> ? (DS | InferDataShape<O>) & "columnar" : "scalar">;
    sub<O extends number | IVExpr<NumericDataType, any>>(other: O): VExpr<DTFloat64 extends DT | (O extends InferrableJsType ? InferDtypeFromJs<O> : O extends IntoDtype ? InferDtype<O> : never) ? (DT | (O extends InferrableJsType ? InferDtypeFromJs<O> : O extends IntoDtype ? InferDtype<O> : never)) & DTFloat64 : DTFloat32 extends DT | (O extends InferrableJsType ? InferDtypeFromJs<O> : O extends IntoDtype ? InferDtype<O> : never) ? (DT | (O extends InferrableJsType ? InferDtypeFromJs<O> : O extends IntoDtype ? InferDtype<O> : never)) & DTFloat32 : DTFloat16 extends DT | (O extends InferrableJsType ? InferDtypeFromJs<O> : O extends IntoDtype ? InferDtype<O> : never) ? (DT | (O extends InferrableJsType ? InferDtypeFromJs<O> : O extends IntoDtype ? InferDtype<O> : never)) & DTFloat16 : DTFloat8 extends DT | (O extends InferrableJsType ? InferDtypeFromJs<O> : O extends IntoDtype ? InferDtype<O> : never) ? (DT | (O extends InferrableJsType ? InferDtypeFromJs<O> : O extends IntoDtype ? InferDtype<O> : never)) & DTFloat8 : DTInt64 extends DT | (O extends InferrableJsType ? InferDtypeFromJs<O> : O extends IntoDtype ? InferDtype<O> : never) ? (DT | (O extends InferrableJsType ? InferDtypeFromJs<O> : O extends IntoDtype ? InferDtype<O> : never)) & DTInt64 : DTInt32 extends DT | (O extends InferrableJsType ? InferDtypeFromJs<O> : O extends IntoDtype ? InferDtype<O> : never) ? (DT | (O extends InferrableJsType ? InferDtypeFromJs<O> : O extends IntoDtype ? InferDtype<O> : never)) & DTInt32 : DTInt16 extends DT | (O extends InferrableJsType ? InferDtypeFromJs<O> : O extends IntoDtype ? InferDtype<O> : never) ? (DT | (O extends InferrableJsType ? InferDtypeFromJs<O> : O extends IntoDtype ? InferDtype<O> : never)) & DTInt16 : DTInt8 extends DT | (O extends InferrableJsType ? InferDtypeFromJs<O> : O extends IntoDtype ? InferDtype<O> : never) ? (DT | (O extends InferrableJsType ? InferDtypeFromJs<O> : O extends IntoDtype ? InferDtype<O> : never)) & DTInt8 : never, "columnar" extends DS | InferDataShape<O> ? (DS | InferDataShape<O>) & "columnar" : "scalar">;
    mul<O extends number | IVExpr<NumericDataType, any>>(other: O): VExpr<DTFloat64 extends DT | (O extends InferrableJsType ? InferDtypeFromJs<O> : O extends IntoDtype ? InferDtype<O> : never) ? (DT | (O extends InferrableJsType ? InferDtypeFromJs<O> : O extends IntoDtype ? InferDtype<O> : never)) & DTFloat64 : DTFloat32 extends DT | (O extends InferrableJsType ? InferDtypeFromJs<O> : O extends IntoDtype ? InferDtype<O> : never) ? (DT | (O extends InferrableJsType ? InferDtypeFromJs<O> : O extends IntoDtype ? InferDtype<O> : never)) & DTFloat32 : DTFloat16 extends DT | (O extends InferrableJsType ? InferDtypeFromJs<O> : O extends IntoDtype ? InferDtype<O> : never) ? (DT | (O extends InferrableJsType ? InferDtypeFromJs<O> : O extends IntoDtype ? InferDtype<O> : never)) & DTFloat16 : DTFloat8 extends DT | (O extends InferrableJsType ? InferDtypeFromJs<O> : O extends IntoDtype ? InferDtype<O> : never) ? (DT | (O extends InferrableJsType ? InferDtypeFromJs<O> : O extends IntoDtype ? InferDtype<O> : never)) & DTFloat8 : DTInt64 extends DT | (O extends InferrableJsType ? InferDtypeFromJs<O> : O extends IntoDtype ? InferDtype<O> : never) ? (DT | (O extends InferrableJsType ? InferDtypeFromJs<O> : O extends IntoDtype ? InferDtype<O> : never)) & DTInt64 : DTInt32 extends DT | (O extends InferrableJsType ? InferDtypeFromJs<O> : O extends IntoDtype ? InferDtype<O> : never) ? (DT | (O extends InferrableJsType ? InferDtypeFromJs<O> : O extends IntoDtype ? InferDtype<O> : never)) & DTInt32 : DTInt16 extends DT | (O extends InferrableJsType ? InferDtypeFromJs<O> : O extends IntoDtype ? InferDtype<O> : never) ? (DT | (O extends InferrableJsType ? InferDtypeFromJs<O> : O extends IntoDtype ? InferDtype<O> : never)) & DTInt16 : DTInt8 extends DT | (O extends InferrableJsType ? InferDtypeFromJs<O> : O extends IntoDtype ? InferDtype<O> : never) ? (DT | (O extends InferrableJsType ? InferDtypeFromJs<O> : O extends IntoDtype ? InferDtype<O> : never)) & DTInt8 : never, "columnar" extends DS | InferDataShape<O> ? (DS | InferDataShape<O>) & "columnar" : "scalar">;
    div<O extends number | IVExpr<NumericDataType, any>>(other: O): VExpr<DTFloat64 extends DT | (O extends InferrableJsType ? InferDtypeFromJs<O> : O extends IntoDtype ? InferDtype<O> : never) ? (DT | (O extends InferrableJsType ? InferDtypeFromJs<O> : O extends IntoDtype ? InferDtype<O> : never)) & DTFloat64 : DTFloat32 extends DT | (O extends InferrableJsType ? InferDtypeFromJs<O> : O extends IntoDtype ? InferDtype<O> : never) ? (DT | (O extends InferrableJsType ? InferDtypeFromJs<O> : O extends IntoDtype ? InferDtype<O> : never)) & DTFloat32 : DTFloat16 extends DT | (O extends InferrableJsType ? InferDtypeFromJs<O> : O extends IntoDtype ? InferDtype<O> : never) ? (DT | (O extends InferrableJsType ? InferDtypeFromJs<O> : O extends IntoDtype ? InferDtype<O> : never)) & DTFloat16 : DTFloat8 extends DT | (O extends InferrableJsType ? InferDtypeFromJs<O> : O extends IntoDtype ? InferDtype<O> : never) ? (DT | (O extends InferrableJsType ? InferDtypeFromJs<O> : O extends IntoDtype ? InferDtype<O> : never)) & DTFloat8 : DTInt64 extends DT | (O extends InferrableJsType ? InferDtypeFromJs<O> : O extends IntoDtype ? InferDtype<O> : never) ? (DT | (O extends InferrableJsType ? InferDtypeFromJs<O> : O extends IntoDtype ? InferDtype<O> : never)) & DTInt64 : DTInt32 extends DT | (O extends InferrableJsType ? InferDtypeFromJs<O> : O extends IntoDtype ? InferDtype<O> : never) ? (DT | (O extends InferrableJsType ? InferDtypeFromJs<O> : O extends IntoDtype ? InferDtype<O> : never)) & DTInt32 : DTInt16 extends DT | (O extends InferrableJsType ? InferDtypeFromJs<O> : O extends IntoDtype ? InferDtype<O> : never) ? (DT | (O extends InferrableJsType ? InferDtypeFromJs<O> : O extends IntoDtype ? InferDtype<O> : never)) & DTInt16 : DTInt8 extends DT | (O extends InferrableJsType ? InferDtypeFromJs<O> : O extends IntoDtype ? InferDtype<O> : never) ? (DT | (O extends InferrableJsType ? InferDtypeFromJs<O> : O extends IntoDtype ? InferDtype<O> : never)) & DTInt8 : never, "columnar" extends DS | InferDataShape<O> ? (DS | InferDataShape<O>) & "columnar" : "scalar">;
    sum(): VExpr<DT, "scalar">;
    mean(): NumericExpr<DTFloat64, "scalar">;
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
 * Creates a raw SQL expression. The caller must provide the raw SQL string, as well as the expected dtype and dshape of the result.
 * This is an escape hatch for when you need to use a function or expression that isn't natively supported by Tybis.
 *
 * The provided dtype and dshape will ONLY be used for type-checking and expression-building purposes,
 * and will have no effect at runtime.
 * So if you pass the wrong dtype/dshape, your code might type-check but then fail at runtime, or return incorrect results.
 * Use with caution!
 *
 * @param rawSql The raw SQL string to use. TODO in the future this should support tagged template literals for better interpolation, eg ty.sql\`DATE_ADD(\${col('my_date')}, INTERVAL 1 DAY)\`
 * @param dtype The expected data type of the result.
 * @param dshape The expected data shape of the result.
 * @returns A VExpr representing the raw SQL expression.
 */
declare function sql<DT extends DataType, DS extends DataShape>(rawSql: string, dtype: DT, dshape: DS): VExpr<DT, DS>;
/**
 * Create a scalar value expression that represents a single literal value, eg \`ty.lit(42)\` or \`ty.lit("hello")\`.
 *
 * The dtype can be inferred from the value, or explicitly provided if needed.
 *
 * Note how \`ty.lit("name")\` represents a string literal value, which is different from \`myrelation.col("name")\`, which represents a reference to a column named "name".
 *
 * @param value The literal value to use.
 * @param dtype The optional data type of the literal. If not provided, it will be inferred from the value.
 * @returns A VExpr representing the literal value.
 */
declare function lit<JS extends AcceptableJsVal<DT>, DT extends IntoDtype | undefined = undefined>(value: JS, dtype?: DT): VExpr<ExplicitOrInferredDtype<JS, DT>, "scalar">;

type Col<DT extends DataType = DataType> = VExpr<DT, 'columnar'>;
declare class RowAccessor<S extends Schema> {
    private readonly _schema;
    constructor(_schema: S);
    col<K extends keyof S & string>(name: K): Col<S[K]>;
}
/** Result of calling g.agg({...}) inside a group() callback. */
declare class GroupResult<A extends Record<string, IVExpr<any, 'scalar'>>> {
    readonly aggregations: A;
    constructor(aggregations: A);
}
declare class GroupAccessor<S extends Schema> {
    private readonly _schema;
    constructor(_schema: S);
    col<K extends keyof S & string>(name: K): Col<S[K]>;
    agg<A extends Record<string, IVExpr<any, 'scalar'>>>(aggregations: A): GroupResult<A>;
}
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
    constructor(
    /** @internal */ _op: O);
    /**
     * The schema of the relation, i.e. the mapping of column names to their data types.
     * @example
     * const penguins = ty.table('penguins', { species: 'string', bill_length_mm: 'float64' })
     * penguins.derive({ bill_length_cm: penguins.col('bill_length_mm').div(10) }).schema
     * // Result: { species: { typecode: 'string' }, bill_length_mm: { typecode: 'float', size: 64 }, bill_length_cm: { typecode: 'float', size: 64 } }
     */
    get schema(): S;
    /**
     * Get a column expression by name.
     * @example penguins.col("bill_length_mm")
     */
    col<K extends keyof S & string>(name: K): VExpr<S[K], "columnar">;
    /**
     * Filter rows using a boolean expression.
     * @example penguins.filter(r => r.col("bill_length_mm").gt(40))
     */
    filter(cb: (r: RowAccessor<S>) => BooleanExpr): Relation<Schema, FilterOp<S>>;
    /**
     * Group rows by key columns and apply aggregations.
     * @example
     * penguins.group(
     *   r => ({ species: true, year: true }),
     *   g => g.agg({ count: count(), mean_bill: g.col("bill_length_mm").mean() })
     * )
     */
    group<K extends SelectInput<S, K>, A extends Record<string, IVExpr<any, 'scalar'>>>(keys: (r: RowAccessor<S>) => K & (keyof K extends never ? "At least one grouping key is required" : K), transform: (g: GroupAccessor<S>) => GroupResult<A>): Relation<SelectSchema<S, K> & AggResultSchema<A>, GroupOp<SelectSchema<S, K> & AggResultSchema<A>>>;
    /**
     * Add computed columns to each row.
     * @example penguins.derive(r => ({ ratio: r.col("bill_length_mm").div(40) }))
     * @example penguins.derive({ year_offset: lit(2000) })
     */
    derive<D extends Record<string, IVExpr<any, any>>>(input: D | ((r: RowAccessor<S>) => D)): Relation<DeriveSchema<S, D>, DeriveOp<DeriveSchema<S, D>, Record<string, IVOp>>>;
    /**
     * Replace existing columns with a new set of expressions.
     * @example penguins.select(r => ({ species: r.col("species"), age: r.col("year").sub(2000) }))
     * @example penguins.select({ species: true }) // Keep existing column
     */
    select<D extends SelectInput<S, D>>(input: D | ((r: RowAccessor<S>) => D)): Relation<SelectSchema<S, D>, SelectOp<SelectSchema<S, D>>>;
    /**
     * Sort rows by one or more keys.
     * @example penguins.sort(r => r.col("count").desc())
     * @example penguins.sort(r => [r.col("species"), r.col("year").desc()])
     */
    sort(cb: (r: RowAccessor<S>) => SortExpr | IVExpr<any, any> | (SortExpr | IVExpr<any, any>)[]): Relation<Schema, SortOp<S>>;
    /**
     * Take the first n rows.
     * @example penguins.take(10)
     */
    take(n: number): Relation<Schema, TakeOp<S>>;
    compile(compiler: Compiler<any>): string;
    /** Compile to a PRQL query string. */
    toPrql(): string;
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

declare class PrqlCompiler implements Compiler {
    compileVOp(op: BuiltinVOp): string;
    compileSortKey(spec: SortSpec): string;
    compileROp(node: BuiltinROp): string;
}

export { type BuiltinROp, type BuiltinVOp, type Compiler, type IROp, type IVExpr, type InferSchema, PrqlCompiler, Relation, type Schema, type VExpr, col, count, lit, sql, table };
 }`
