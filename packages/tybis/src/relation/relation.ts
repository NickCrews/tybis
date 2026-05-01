import { type DataType } from '../datatype.js'
import { schema, type Schema, type InferSchema, type IntoSchema } from './schema.js'
import type { IROp } from './irop.js'
import { FilterOp, GroupOp, DeriveOp, SelectOp, SortOp, TakeOp, FromOp, type BuiltinROp } from './rops.js'
import type { Compiler } from '../compilers/base.js'
import { type IVOp, type IVExpr } from '../value/core.js'
import { SortSpec } from '../value/ops.js'
import {
    BooleanExpr,
    SortExpr,
    col,
    VExpr,
} from '../value/expr.js'
import { PrqlCompiler } from '../compilers/prql-compiler.js'
import { suggestColumnName } from '../utils/typo.js'

// ---------------------------------------------------------------------------
// Row and group accessors
// ---------------------------------------------------------------------------

type Col<DT extends DataType = DataType> = VExpr<DT, 'columnar'>

function _colWithSchemaCheck<S extends Schema, K extends keyof S & string>(schema: S, name: K): Col<S[K]> {
    if (!(name in schema)) {
        const suggestion = suggestColumnName(name, Object.keys(schema))
        throw new Error(`Column '${name}' does not exist.${suggestion ? ` Did you mean '${suggestion}'?` : ''}`)
    }
    return col(name, schema[name] as S[K]) as Col<S[K]>
}

class RowAccessor<S extends Schema> {
    constructor(private readonly _schema: S) { }

    col<K extends keyof S & string>(name: K): Col<S[K]> {
        return _colWithSchemaCheck(this._schema, name)
    }
}

/** Result of calling g.agg({...}) inside a group() callback. */
class GroupResult<A extends Record<string, IVExpr<any, 'scalar'>>> {
    constructor(readonly aggregations: A) { }
}

class GroupAccessor<S extends Schema> {
    constructor(private readonly _schema: S) { }

    col<K extends keyof S & string>(name: K): Col<S[K]> {
        return _colWithSchemaCheck(this._schema, name)
    }

    agg<A extends Record<string, IVExpr<any, 'scalar'>>>(
        aggregations: A
    ): GroupResult<A> {
        for (const [key, expr] of Object.entries(aggregations)) {
            if (expr.dshape() !== 'scalar') {
                throw new Error(`Aggregation '${key}' must be a scalar expression, but got dshape='${expr.dshape()}'`)
            }
        }
        return new GroupResult(aggregations)
    }
}

// ---------------------------------------------------------------------------
// Helper types for group() result schema
// ---------------------------------------------------------------------------

type AggResultSchema<A extends Record<string, IVExpr<any, 'scalar'>>> = {
    [K in keyof A]: A[K] extends IVExpr<infer T, 'scalar'> ? T : never
}

type DeriveSchema<S extends Schema, D extends Record<string, IVExpr<any, any>>> =
    Omit<S, keyof D> & {
        [K in keyof D]: D[K] extends IVExpr<infer T, any> ? T : never
    }

type SelectInput<S extends Schema, D> = {
    [K in keyof D]: K extends keyof S
    ? (IVExpr<any, any> | boolean)
    : IVExpr<any, any>
}

type SelectSchema<S extends Schema, D> = {
    [K in keyof D as D[K] extends false ? never : K]:
    D[K] extends IVExpr<infer T, any> ? T :
    D[K] extends boolean ? (K extends keyof S ? S[K] : never) :
    never
}

// ---------------------------------------------------------------------------
// Relation class
// ---------------------------------------------------------------------------

export class Relation<S extends Schema = Schema, O extends IROp<S> = IROp<S>> {
    constructor(
        /** @internal */ readonly _op: O
    ) { }

    /**
     * The schema of the relation, i.e. the mapping of column names to their data types.
     * @example
     * const penguins = ty.table('penguins', { species: 'string', bill_length_mm: 'float64' })
     * penguins.derive({ bill_length_cm: penguins.col('bill_length_mm').div(10) }).schema
     * // Result: { species: { typecode: 'string' }, bill_length_mm: { typecode: 'float', size: 64 }, bill_length_cm: { typecode: 'float', size: 64 } }
     */
    get schema() {
        return this._op.schema()
    }

    /**
     * Get a column expression by name.
     * @example penguins.col("bill_length_mm")
     */
    col<K extends keyof S & string>(name: K) {
        return _colWithSchemaCheck(this.schema, name)
    }

    /**
     * Filter rows using a boolean expression.
     * @example penguins.filter(r => r.col("bill_length_mm").gt(40))
     */
    filter(cb: (r: RowAccessor<S>) => BooleanExpr) {
        const accessor = new RowAccessor(this.schema)
        const condition = cb(accessor)
        return new Relation(new FilterOp(this._op, condition.toOp()))
    }

    /**
     * Group rows by key columns and apply aggregations.
     * @example
     * penguins.group(
     *   r => ({ species: true, year: true }),
     *   g => g.agg({ count: count(), mean_bill: g.col("bill_length_mm").mean() })
     * )
     */
    group<
        K extends SelectInput<S, K>,
        A extends Record<string, IVExpr<any, 'scalar'>>
    >(
        keys: (r: RowAccessor<S>) => K & (keyof K extends never ? "At least one grouping key is required" : K),
        transform: (g: GroupAccessor<S>) => GroupResult<A>
    ): Relation<
        SelectSchema<S, K> & AggResultSchema<A>,
        GroupOp<SelectSchema<S, K> & AggResultSchema<A>>
    > {
        const accessor = new RowAccessor(this.schema)
        const groupingKeys = keys(accessor) as Record<string, IVExpr<any, any> | boolean>

        const keyPairs: [string, IVOp][] = []
        for (const [k, v] of Object.entries(groupingKeys)) {
            if (typeof v === 'boolean') {
                if (v === true) {
                    if (!(k in this.schema)) {
                        const suggestion = suggestColumnName(k, Object.keys(this.schema))
                        throw new Error(`Cannot group by '${k}': column does not exist.${suggestion ? ` Did you mean '${suggestion}'?` : ''}`)
                    }
                    keyPairs.push([k, accessor.col(k).toOp() as unknown as IVOp])
                }
            } else {
                keyPairs.push([k, v.toOp() as unknown as IVOp])
            }
        }

        // We could extend this to support empty keys (aggregating the whole table) in the future.
        if (keyPairs.length === 0) {
            throw new Error("group() requires at least one grouping key")
        }

        const groupAccessor = new GroupAccessor(this.schema)
        const result = transform(groupAccessor)

        const aggregations = Object.entries(result.aggregations).map(
            ([k, v]) => [k, v.toOp()] as [string, IVOp]
        )

        return new Relation(new GroupOp(this._op, keyPairs, aggregations)) as any
    }



    /**
     * Add computed columns to each row.
     * @example penguins.derive(r => ({ ratio: r.col("bill_length_mm").div(40) }))
     * @example penguins.derive({ year_offset: lit(2000) })
     */
    derive<D extends Record<string, IVExpr<any, any>>>(
        input: D | ((r: RowAccessor<S>) => D)
    ): Relation<DeriveSchema<S, D>, DeriveOp<DeriveSchema<S, D>, Record<string, IVOp>>> {
        const accessor = new RowAccessor(this.schema)
        const derivations = typeof input === 'function' ? input(accessor) : input
        const pairs = Object.entries(derivations).map(([k, v]) => [k, v.toOp()] as [string, IVOp])

        return new Relation(new DeriveOp(this._op, pairs)) as any
    }

    /**
     * Replace existing columns with a new set of expressions.
     * @example penguins.select(r => ({ species: r.col("species"), age: r.col("year").sub(2000) }))
     * @example penguins.select({ species: true }) // Keep existing column
     */
    select<D extends SelectInput<S, D>>(
        input: D | ((r: RowAccessor<S>) => D)
    ): Relation<SelectSchema<S, D>, SelectOp<SelectSchema<S, D>>> {
        if (!input) {
            throw new Error("select() requires a mapping object or callback. For example: .select({ species: true })")
        }

        const accessor = new RowAccessor(this.schema)
        const selections = typeof input === 'function' ? (input as any)(accessor) : input

        const pairs: [string, IVOp][] = []
        const newSchema: Record<string, DataType> = {}

        for (const [k, v] of Object.entries(selections) as [string, IVExpr<any, any> | boolean][]) {
            if (typeof v === 'boolean') {
                if (v === true) {
                    if (!(k in this.schema)) {
                        const suggestion = suggestColumnName(k, Object.keys(this.schema))
                        throw new Error(`Cannot select '${k}': column does not exist.${suggestion ? ` Did you mean '${suggestion}'?` : ''}`)
                    }
                    newSchema[k] = this.schema[k]!
                    pairs.push([k, accessor.col(k).toOp() as unknown as IVOp])
                } else {
                    continue
                }
            } else {
                newSchema[k] = v.dtype()
                pairs.push([k, v.toOp() as unknown as IVOp])
            }
        }

        if (pairs.length === 0) {
            throw new Error("select() requires at least one expression")
        }

        return new Relation(new SelectOp(this._op, pairs)) as any
    }

    /**
     * Sort rows by one or more keys.
     * @example penguins.sort(r => r.col("count").desc())
     * @example penguins.sort(r => [r.col("species"), r.col("year").desc()])
     */
    sort(
        cb: (r: RowAccessor<S>) => SortExpr | IVExpr<any, any> | (SortExpr | IVExpr<any, any>)[]
    ) {
        const accessor = new RowAccessor(this.schema)
        const result = cb(accessor)
        const keysList = Array.isArray(result) ? result : [result]
        const sortKeys = keysList.map(k =>
            k instanceof SortExpr ? k.toSortSpec() : new SortSpec(k.toOp(), 'asc')
        )
        return new Relation(new SortOp(this._op, sortKeys))
    }

    /**
     * Take the first n rows.
     * @example penguins.take(10)
     */
    take(n: number) {
        return new Relation(new TakeOp(this._op, n))
    }

    compile(compiler: Compiler<any>) {
        return compiler.compileROp(this._op as unknown as BuiltinROp)
    }

    /** Compile to a PRQL query string. */
    toPrql() {
        return this.compile(new PrqlCompiler())
    }
}

// ---------------------------------------------------------------------------
// Public factory function
// ---------------------------------------------------------------------------

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
export function table<S extends IntoSchema>(name: string, sch: S): Relation<InferSchema<S>, FromOp<InferSchema<S>>> {
    return new Relation(new FromOp(name, schema(sch)))
}
