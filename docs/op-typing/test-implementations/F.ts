// --- CORE PACKAGE ------------------------------------------------------------

type DataType = 'string' | 'int' | 'float' | 'boolean' | 'date' | 'time' | 'datetime' | 'interval' | 'uuid'
type DataShape = 'scalar' | 'columnar'

// statically typed info that can be known at expression construction time,
// without needing to evaluate the expression eg against any data.
interface OpSpec {
    readonly thisKind: string
    readonly dataType: DataType
    readonly dataShape: DataShape
    readonly childSpecs: OpSpec[]
    readonly description?: string
    readonly version: number
}

interface IVOp<T extends OpSpec = OpSpec> {
    readonly spec: T
    /** The {@link DataType} of this expression. */
    dtype(): T['dataType']
    /** The {@link DataShape} of this expression, which can be 'scalar' or 'columnar'. */
    dshape(): T['dataShape']
}

// --- Core ops---
// Define two core ops: a literal and an addition:

type LitSpec<DT extends DataType> = {
    thisKind: 'lit',
    dataType: DT,
    dataShape: 'scalar',
    childSpecs: [],
    version: 1,
    description: string,
}
function makeLitSpec<DT extends DataType>(dataType: DT): LitSpec<DT> {
    return {
        thisKind: 'lit',
        dataType,
        dataShape: 'scalar',
        childSpecs: [],
        version: 1,
        description: `${dataType} literal`,
    }
}


class LitInt<DT extends DataType> implements IVOp<LitSpec<DT>> {
    readonly spec: LitSpec<DT>
    constructor(readonly value: number, dtype: DT) {
        this.spec = makeLitSpec(dtype)
    }
    dtype() { return this.spec.dataType }
    dshape() { return this.spec.dataShape }
}

// dummy implementation for now
type HighestDataType<A extends DataType, B extends DataType> = 'float'
function highestDataType<A extends DataType, B extends DataType>(a: A, b: B): HighestDataType<A, B> {
    return 'float' // placeholder
}

type HighestDataShape<A extends DataShape, B extends DataShape> = 'columnar'
function highestDataShape<A extends DataShape, B extends DataShape>(a: A, b: B): HighestDataShape<A, B> {
    return 'columnar' // placeholder
}

type CombineSpecs<L extends OpSpec, R extends OpSpec> = [...L['childSpecs'], ...R['childSpecs'], L, R]
function combineSpecs<L extends OpSpec, R extends OpSpec>(left: L, right: R): CombineSpecs<L, R> {
    return [...left.childSpecs, ...right.childSpecs, left, right] as CombineSpecs<L, R>
}

type AddSpec<L extends OpSpec, R extends OpSpec> = {
    thisKind: 'add',
    dataType: HighestDataType<L['dataType'], R['dataType']>,
    dataShape: HighestDataShape<L['dataShape'], R['dataShape']>,
    childSpecs: CombineSpecs<L, R>,
    version: 1,
    description: 'Binary addition',
}
function makeAddSpec<L extends OpSpec, R extends OpSpec>(left: L, right: R): AddSpec<L, R> {
    return {
        thisKind: 'add',
        dataType: highestDataType(left.dataType, right.dataType),
        dataShape: highestDataShape(left.dataShape, right.dataShape),
        childSpecs: combineSpecs(left, right),
        version: 1,
        description: 'Binary addition',
    }
}

class Add<L extends OpSpec, R extends OpSpec> implements IVOp<AddSpec<L, R>> {
    readonly spec: AddSpec<L, R>
    constructor(readonly left: IVOp<L>, readonly right: IVOp<R>) {
        this.spec = makeAddSpec(left.spec, right.spec)
    }
    dtype() { return this.spec.dataType }
    dshape() { return this.spec.dataShape }
}

// ---- core compilers ----
// The core implements two builtin compilers:
// - a SerializableCompiler that provides a toSerializable() method that turns an expression tree into something that is JSON-serializable (eg removing circular references or methods)
// - a StringCompiler that provides a toString() method that gives eg `5 + 10`
// 
// To make this trickier, there are two different sorts of paramaterization we need to
// think about during this compilation step:
// - The parameters of the compiler:
//      The stringCompiler has an additional option of `precision` that
//      determines how many decimal places to include when compiling float literals.
// - The parameters of the expression:
//      The SerializableCompiler doesn't know how to compile UUIDs! So if it encounters a UUID literal, it should throw an error.

// TODO

// This is in some 3rd party stats library that wants to provide a covariance op.

type CovSpec<L extends OpSpec, R extends OpSpec> = {
    thisKind: 'mul',
    dataType: HighestDataType<L['dataType'], R['dataType']>,
    dataShape: HighestDataShape<L['dataShape'], R['dataShape']>,
    childSpecs: CombineSpecs<L, R>,
    version: 1,
    description: 'Binary multiplication',
}
function makeCovSpec<L extends OpSpec, R extends OpSpec>(left: L, right: R): CovSpec<L, R> {
    return {
        thisKind: 'mul',
        dataType: highestDataType(left.dataType, right.dataType),
        dataShape: highestDataShape(left.dataShape, right.dataShape),
        childSpecs: combineSpecs(left, right),
        version: 1,
        description: 'Binary multiplication',
    }
}

class Cov<L extends OpSpec, R extends OpSpec> implements IVOp<CovSpec<L, R>> {
    readonly spec: CovSpec<L, R>
    constructor(readonly left: IVOp<L>, readonly right: IVOp<R>) {
        this.spec = makeCovSpec(left.spec, right.spec)
    }
    dtype() { return this.spec.dataType }
    dshape() { return this.spec.dataShape }
}

// And in a DIFFERENT 3rd party library, they provide a sql compiler.
// They define how to compile the core ops to SQL,
// but they don't know about the covariance op, so they don't define how to compile that.
// The sql compiler should take a dialect parameter.
// But sqlite has no way to represent datetimes, so if it encounters a datetime literal, it should throw an error.

// TODO

// Finally, a user wants to be able to use all of these together,
// and add a compilation rule for how to compile the covariance op to SQL
// without needing to modify the core library or the stats library.