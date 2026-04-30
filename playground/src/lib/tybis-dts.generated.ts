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
type InferDataShape<T extends IntoDataShape> = T extends DataShape ? T : T extends IVExpr<any, infer S> ? S : T extends IVOp<any, infer S> ? S : T extends InferrableJsType ? 'scalar' : never;

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
interface IVOp<T extends DataType = DataType, S extends DataShape = DataShape, K extends string = string> {
    readonly kind: K;
    /** The {@link DataType} of this expression. */
    dtype(): T;
    /** The {@link DataShape} of this expression, which can be 'scalar' or 'columnar'. */
    dshape(): S;
    getName(): string;
    /** Optional symbol to mark this object as an Op. If not present, the object will be checked for the presence of 'kind', 'dtype', and 'dshape' properties. */
    [IsVOpSymbol]?: boolean;
}
interface IVExpr<T extends DataType = DataType, S extends DataShape = DataShape> {
    /** The {@link DataType} of this expression. */
    dtype(): T;
    /** The {@link DataShape} of this expression, which can be 'scalar' or 'columnar'. */
    dshape(): S;
    /** Convert this expression to its internal operation representation. */
    toOp(): IVOp<T, S>;
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
type InferDtype<T extends IntoDtype> = T extends DataType ? T : T extends DTypeShorthands ? InferDtypeFromShorthand<T> : T extends IVExpr<infer D, any> ? D : T extends IVOp<infer D, any, any> ? D : never;
type HighestDataType<Types extends DataType[]> = Types extends [] ? never : Types[number] extends DTFloat64 ? DTFloat64 : Types[number] extends DTFloat32 ? DTFloat32 : Types[number] extends DTFloat16 ? DTFloat16 : Types[number] extends DTFloat8 ? DTFloat8 : Types[number] extends DTInt64 ? DTInt64 : Types[number] extends DTInt32 ? DTInt32 : Types[number] extends DTInt16 ? DTInt16 : Types[number] extends DTInt8 ? DTInt8 : never;

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

declare abstract class BaseOp<T extends DataType = DataType, S extends DataShape = DataShape> implements IVOp<T, S> {
    [IsVOpSymbol]: true;
    abstract readonly kind: string;
    private readonly _dtype;
    private readonly _dshape;
    constructor(dtype: T, dshape: S);
    dtype(): T;
    dshape(): S;
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

declare class ColRefOp<N extends string = string, T extends IntoDtype = DataType> extends BaseOp<InferDtype<T>, 'columnar'> {
    readonly name: N;
    readonly kind: "col_ref";
    constructor(name: N, dtype: T);
    getName(): string;
}
declare class IsNotNullOp<S extends DataShape = DataShape> extends BaseOp<DTBoolean, S> {
    readonly operand: IVOp<DataType, S>;
    readonly kind: "is_not_null";
    constructor(operand: IVOp<DataType, S>);
}
declare class IsNullOp<S extends DataShape = DataShape> extends BaseOp<DTBoolean, S> {
    readonly operand: IVOp<DataType, S>;
    readonly kind: "is_null";
    constructor(operand: IVOp<DataType, S>);
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
    readonly left: IVOp<DataType, S1>;
    readonly right: IVOp<DataType, S2>;
    readonly kind: "eq";
    constructor(left: IVOp<DataType, S1>, right: IVOp<DataType, S2>);
}
declare class GtOp<S1 extends DataShape = DataShape, S2 extends DataShape = DataShape> extends BaseOp<DTBoolean, HighestDataShape<[S1, S2]>> {
    readonly left: IVOp<DataType, S1>;
    readonly right: IVOp<DataType, S2>;
    readonly kind: "gt";
    constructor(left: IVOp<DataType, S1>, right: IVOp<DataType, S2>);
}
declare class GteOp<S1 extends DataShape = DataShape, S2 extends DataShape = DataShape> extends BaseOp<DTBoolean, HighestDataShape<[S1, S2]>> {
    readonly left: IVOp<DataType, S1>;
    readonly right: IVOp<DataType, S2>;
    readonly kind: "gte";
    constructor(left: IVOp<DataType, S1>, right: IVOp<DataType, S2>);
}
declare class LtOp<S1 extends DataShape = DataShape, S2 extends DataShape = DataShape> extends BaseOp<DTBoolean, HighestDataShape<[S1, S2]>> {
    readonly left: IVOp<DataType, S1>;
    readonly right: IVOp<DataType, S2>;
    readonly kind: "lt";
    constructor(left: IVOp<DataType, S1>, right: IVOp<DataType, S2>);
}
declare class LteOp<S1 extends DataShape = DataShape, S2 extends DataShape = DataShape> extends BaseOp<DTBoolean, HighestDataShape<[S1, S2]>> {
    readonly left: IVOp<DataType, S1>;
    readonly right: IVOp<DataType, S2>;
    readonly kind: "lte";
    constructor(left: IVOp<DataType, S1>, right: IVOp<DataType, S2>);
}
declare class MinOp<T extends DataType = DataType> extends BaseOp<T, 'scalar'> {
    readonly operand: IVOp<T, any>;
    readonly kind: "min";
    constructor(operand: IVOp<T, any>);
}
declare class MaxOp<T extends DataType = DataType> extends BaseOp<T, 'scalar'> {
    readonly operand: IVOp<T, any>;
    readonly kind: "max";
    constructor(operand: IVOp<T, any>);
}
declare class LogicalNotOp<S extends DataShape = DataShape> extends BaseOp<DTBoolean, S> {
    readonly operand: IVOp<DTBoolean, S>;
    readonly kind: "not";
    constructor(operand: IVOp<DTBoolean, S>);
}
declare class LogicalAndOp<S1 extends DataShape = DataShape, S2 extends DataShape = DataShape> extends BaseOp<DTBoolean, HighestDataShape<[S1, S2]>> {
    readonly left: IVOp<DTBoolean, S1>;
    readonly right: IVOp<DTBoolean, S2>;
    readonly kind: "and";
    constructor(left: IVOp<DTBoolean, S1>, right: IVOp<DTBoolean, S2>);
}
declare class LogicalOrOp<S1 extends DataShape = DataShape, S2 extends DataShape = DataShape> extends BaseOp<DTBoolean, HighestDataShape<[S1, S2]>> {
    readonly left: IVOp<DTBoolean, S1>;
    readonly right: IVOp<DTBoolean, S2>;
    readonly kind: "or";
    constructor(left: IVOp<DTBoolean, S1>, right: IVOp<DTBoolean, S2>);
}
declare class AddOp<S1 extends DataShape = DataShape, S2 extends DataShape = DataShape, D1 extends DataType = DataType, D2 extends DataType = DataType> extends BaseOp<HighestDataType<[D1, D2]>, HighestDataShape<[S1, S2]>> {
    readonly left: IVOp<D1, S1>;
    readonly right: IVOp<D2, S2>;
    readonly kind: "add";
    constructor(left: IVOp<D1, S1>, right: IVOp<D2, S2>);
}
declare class SubOp<S1 extends DataShape = DataShape, S2 extends DataShape = DataShape, D1 extends DataType = DataType, D2 extends DataType = DataType> extends BaseOp<HighestDataType<[D1, D2]>, HighestDataShape<[S1, S2]>> {
    readonly left: IVOp<D1, S1>;
    readonly right: IVOp<D2, S2>;
    readonly kind: "sub";
    constructor(left: IVOp<D1, S1>, right: IVOp<D2, S2>);
}
declare class MulOp<S1 extends DataShape = DataShape, S2 extends DataShape = DataShape, D1 extends DataType = DataType, D2 extends DataType = DataType> extends BaseOp<HighestDataType<[D1, D2]>, HighestDataShape<[S1, S2]>> {
    readonly left: IVOp<D1, S1>;
    readonly right: IVOp<D2, S2>;
    readonly kind: "mul";
    constructor(left: IVOp<D1, S1>, right: IVOp<D2, S2>);
}
declare class DivOp<S1 extends DataShape = DataShape, S2 extends DataShape = DataShape, D1 extends DataType = DataType, D2 extends DataType = DataType> extends BaseOp<HighestDataType<[D1, D2]>, HighestDataShape<[S1, S2]>> {
    readonly left: IVOp<D1, S1>;
    readonly right: IVOp<D2, S2>;
    readonly kind: "div";
    constructor(left: IVOp<D1, S1>, right: IVOp<D2, S2>);
}
declare class SumOp<T extends DataType = DataType> extends BaseOp<T, 'scalar'> {
    readonly operand: IVOp<T, any>;
    readonly kind: "sum";
    constructor(operand: IVOp<T, any>);
}
declare class MeanOp extends BaseOp<DTFloat64, 'scalar'> {
    readonly operand: IVOp<any, any>;
    readonly kind: "mean";
    constructor(operand: IVOp<any, any>);
}
declare class UpperOp<S extends DataShape = DataShape> extends BaseOp<DTString, S> {
    readonly operand: IVOp<{
        typecode: 'string';
    }, S>;
    readonly kind: "upper";
    constructor(operand: IVOp<{
        typecode: 'string';
    }, S>);
}
declare class LowerOp<S extends DataShape = DataShape> extends BaseOp<DTString, S> {
    readonly operand: IVOp<{
        typecode: 'string';
    }, S>;
    readonly kind: "lower";
    constructor(operand: IVOp<{
        typecode: 'string';
    }, S>);
}
declare class ContainsOp<S1 extends DataShape = DataShape> extends BaseOp<DTBoolean, HighestDataShape<[S1, 'scalar']>> {
    readonly operand: IVOp<{
        typecode: 'string';
    }, S1>;
    readonly pattern: StringLiteralOp;
    readonly kind: "contains";
    constructor(operand: IVOp<{
        typecode: 'string';
    }, S1>, pattern: StringLiteralOp);
}
declare class StartsWithOp<S1 extends DataShape = DataShape> extends BaseOp<DTBoolean, HighestDataShape<[S1, 'scalar']>> {
    readonly operand: IVOp<{
        typecode: 'string';
    }, S1>;
    readonly prefix: StringLiteralOp;
    readonly kind: "starts_with";
    constructor(operand: IVOp<{
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
    readonly operand: IVOp<TemporalDataType, S>;
    readonly format: string;
    readonly kind: "temporal_to_string";
    constructor(operand: IVOp<TemporalDataType, S>, format: string);
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
type IntoValueComparableTo<Target extends DataType> = LiteralValueCoercibleTo<Target> | IVExpr<DtypesComparableTo<Target>, any> | IVOp<DtypesComparableTo<Target>, any>;

type VExpr<T extends DataType = DataType, S extends DataShape = DataShape> = T extends {
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
declare abstract class BaseVExpr<T extends DataType = DataType, S extends DataShape = DataShape> implements IVExpr<T, S> {
    private readonly _op;
    constructor(_op: IVOp<T, S>);
    [IsVExprSymbol]: true;
    dtype(): T;
    dshape(): S;
    toOp(): IVOp<T, S>;
}
declare class GenericVExpr<T extends DataType = DataType, S extends DataShape = DataShape> extends BaseVExpr<T, S> {
    isNotNull(): VExpr<DTBoolean, S>;
    isNull(): VExpr<DTBoolean, S>;
    eq<Value extends IntoValueComparableTo<T>>(value: Value): BooleanExpr<HighestDataShape<[InferDataShape<Value>, S]>>;
    gt<Value extends IntoValueComparableTo<T>>(value: Value): BooleanExpr<HighestDataShape<[InferDataShape<Value>, S]>>;
    gte<Value extends IntoValueComparableTo<T>>(value: Value): BooleanExpr<HighestDataShape<[InferDataShape<Value>, S]>>;
    lt<Value extends IntoValueComparableTo<T>>(value: Value): BooleanExpr<HighestDataShape<[InferDataShape<Value>, S]>>;
    lte<Value extends IntoValueComparableTo<T>>(value: Value): BooleanExpr<HighestDataShape<[InferDataShape<Value>, S]>>;
    min(): VExpr<T, 'scalar'>;
    max(): VExpr<T, 'scalar'>;
    desc(): SortExpr;
    asc(): SortExpr;
}
declare class NullExpr<S extends DataShape = DataShape> extends GenericVExpr<{
    typecode: 'null';
}, S> {
}
declare class NumericExpr<T extends NumericDataType = NumericDataType, S extends DataShape = DataShape> extends GenericVExpr<T, S> {
    add<T extends number | IVExpr<NumericDataType, any>>(value: T): NumericExpr<DTFloat64, HighestDataShape<[InferDataShape<T>, S]>>;
    sub<T extends number | IVExpr<NumericDataType, any>>(value: T): NumericExpr<DTFloat64, HighestDataShape<[InferDataShape<T>, S]>>;
    mul<T extends number | IVExpr<NumericDataType, any>>(value: T): NumericExpr<DTFloat64, HighestDataShape<[InferDataShape<T>, S]>>;
    div<T extends number | IVExpr<NumericDataType, any>>(value: T): NumericExpr<DTFloat64, HighestDataShape<[InferDataShape<T>, S]>>;
    sum(): NumericExpr<DTFloat64, 'scalar'>;
    mean(): NumericExpr<DTFloat64, 'scalar'>;
}
declare class StringExpr<S extends DataShape = DataShape> extends GenericVExpr<DTString, S> {
    upper(): StringExpr<S>;
    lower(): StringExpr<S>;
    contains(pattern: string): BooleanExpr<"columnar" extends "scalar" | S ? S & "columnar" : "scalar">;
    startsWith(prefix: string): BooleanExpr<"columnar" extends "scalar" | S ? S & "columnar" : "scalar">;
}
declare class BooleanExpr<S extends DataShape = DataShape> extends GenericVExpr<DTBoolean, S> {
    and(other: boolean | IVExpr<DTBoolean, any>): BooleanExpr<"columnar">;
    or(other: boolean | IVExpr<DTBoolean, any>): BooleanExpr<"columnar">;
    not(): BooleanExpr<S>;
}
declare class DateExpr<S extends DataShape = DataShape> extends GenericVExpr<DTDate, S> {
    toString(format: string): StringExpr<S>;
}
declare class TimeExpr<S extends DataShape = DataShape> extends GenericVExpr<DTTime, S> {
    toString(format: string): StringExpr<S>;
}
declare class DateTimeExpr<S extends DataShape = DataShape> extends GenericVExpr<DTDateTime, S> {
    toString(format: string): StringExpr<S>;
}
declare class IntervalExpr<S extends DataShape = DataShape> extends GenericVExpr<DTInterval, S> {
}
declare class UUIDExpr<S extends DataShape = DataShape> extends GenericVExpr<DTUUID, S> {
}
declare function col<N extends string, T extends IntoDtype>(name: N, dtype: T): VExpr<InferDtype<T>, "columnar">;
declare class SortExpr {
    readonly expr: BaseVExpr;
    readonly direction: 'asc' | 'desc';
    constructor(expr: BaseVExpr, direction: 'asc' | 'desc');
    toSortSpec(): SortSpec;
}
/**
 * Counts the number of rows. Analogous to SQL's COUNT(*). Returns a NumericExpr with dtype=int64 and dshape='scalar'.
 */
declare function count(): NumericExpr<DTInt64, 'scalar'>;
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
declare function lit<JS extends AcceptableJsVal<DT>, DT extends IntoDtype | undefined = undefined>(value: JS, dtype?: DT): VExpr<ExplicitOrInferredDtype<JS, DT>, 'scalar'>;

type Col<T extends DataType = DataType> = VExpr<T, 'columnar'>;
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
    get schema(): S;
    /**
     * Get a column expression by name.
     * @example penguins.col("bill_length_mm")
     */
    col<K extends keyof S & string>(name: K): Col<S[K]>;
    /**
     * Filter rows using a boolean expression.
     * @example penguins.filter(r => r.col("bill_length_mm").gt(40))
     */
    filter(cb: (r: RowAccessor<S>) => BooleanExpr): Relation<S, FilterOp<S>>;
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
     */
    derive<D extends Record<string, IVExpr<any, any>>>(cb: (r: RowAccessor<S>) => D): Relation<DeriveSchema<S, D>, DeriveOp<DeriveSchema<S, D>, Record<string, IVOp>>>;
    /**
     * Replace existing columns with a new set of expressions.
     * @example penguins.select(r => ({ species: r.col("species"), age: r.col("year").sub(2000) }))
     * @example penguins.select(r => ({ species: true })) // Keep existing column
     */
    select<D extends SelectInput<S, D>>(cb: (r: RowAccessor<S>) => D): Relation<SelectSchema<S, D>, SelectOp<SelectSchema<S, D>>>;
    /**
     * Sort rows by one or more keys.
     * @example penguins.sort(r => r.col("count").desc())
     * @example penguins.sort(r => [r.col("species"), r.col("year").desc()])
     */
    sort(cb: (r: RowAccessor<S>) => SortExpr | IVExpr<any, any> | (SortExpr | IVExpr<any, any>)[]): Relation<S, SortOp<S>>;
    /**
     * Take the first n rows.
     * @example penguins.take(10)
     */
    take(n: number): Relation<S, TakeOp<S>>;
    compile(compiler: Compiler<any>): string;
    /** Compile to a PRQL query string. */
    toPrql(): string;
    /** Compile to SQL using the PRQL compiler. */
    toSql(): string;
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

declare class SqlCompiler implements Compiler {
    private readonly prqlCompiler;
    compileVOp(op: BuiltinVOp): string;
    compileROp(node: BuiltinROp): string;
}

export { type BuiltinROp, type Compiler, type IROp, type IVExpr, type InferSchema, PrqlCompiler, Relation, type Schema, SqlCompiler, type VExpr, col, count, lit, table };
 }`
