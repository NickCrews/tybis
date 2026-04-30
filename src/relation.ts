import { type DataType } from './datatype.js'
import { schema, type Schema, type InferSchema, type IntoSchema } from './schema.js'
import type { IROp } from './irop.js'
import { FilterOp, GroupOp, DeriveOp, SelectOp, SortOp, TakeOp, FromOp, type BuiltinROp } from './rop.js'
import type { Compiler } from './compilers/base.js'
import { type IVOp, type IVExpr } from './value/core.js'
import { SortSpec } from './value/ops.js'
import {
    BaseVExpr, BooleanExpr, SortExpr,
    col,
    VExpr,
} from './value/expr.js'
import { PrqlCompiler } from './compilers/prql-compiler.js'
import { SqlCompiler } from './compilers/sql-compiler.js'
import { suggestColumnName } from './typo.js'

// ---------------------------------------------------------------------------
// Row and group accessors
// ---------------------------------------------------------------------------

type Col<K extends string = string, T extends DataType = DataType> = VExpr<T, 'columnar'>

function _colWithSchemaCheck<S extends Schema, K extends keyof S & string>(schema: S, name: K): Col<K, S[K]> {
    if (!(name in schema)) {
        const suggestion = suggestColumnName(name, Object.keys(schema))
        throw new Error(`Column '${name}' does not exist.${suggestion ? ` Did you mean '${suggestion}'?` : ''}`)
    }
    return col(name, schema[name] as S[K]) as Col<K, S[K]>
}

class RowAccessor<S extends Schema> {
    constructor(private readonly _schema: S) { }

    col<K extends keyof S & string>(name: K): Col<K, S[K]> {
        return _colWithSchemaCheck(this._schema, name)
    }
}

/** Result of calling g.agg({...}) inside a group() callback. */
class GroupResult<A extends Record<string, BaseVExpr<DataType, 'scalar'>>> {
    constructor(readonly aggregations: A) { }
}

class GroupAccessor<S extends Schema> extends RowAccessor<S> {
    agg<A extends Record<string, BaseVExpr<DataType, 'scalar'>>>(
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

type ColName<C> = C extends Col<infer N, DataType> ? N : never
type ColArrayNames<KC> = KC extends Array<infer C> ? ColName<C> : never

type AggResultSchema<A extends Record<string, BaseVExpr<DataType, 'scalar'>>> = {
    [K in keyof A]: A[K] extends BaseVExpr<infer T, 'scalar'> ? T : never
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

    get schema(): S {
        return this._op.schema()
    }

    /**
     * Get a column expression by name.
     * @example penguins.col("bill_length_mm")
     */
    col<K extends keyof S & string>(name: K): Col<K, S[K]> {
        return _colWithSchemaCheck(this.schema, name)
    }

    /**
     * Filter rows using a boolean expression.
     * @example penguins.filter(r => r.col("bill_length_mm").gt(40))
     */
    filter(cb: (r: RowAccessor<S>) => BooleanExpr): Relation<S, FilterOp<S>> {
        const accessor = new RowAccessor(this.schema)
        const condition = cb(accessor)
        return new FilterOp(this._op, condition.toOp()).toRelation()
    }

    /**
     * Group rows by key columns and apply aggregations.
     * @example
     * penguins.group(
     *   r => [r.col("species"), r.col("year")],
     *   g => g.agg({ count: count(), mean_bill: g.col("bill_length_mm").mean() })
     * )
     */
    group<
        KC extends Col[],
        A extends Record<string, BaseVExpr<DataType, 'scalar'>>
    >(
        keys: (r: RowAccessor<S>) => KC,
        transform: (g: GroupAccessor<S>) => GroupResult<A>
    ): Relation<
        Pick<S, ColArrayNames<KC> & keyof S> & AggResultSchema<A>,
        GroupOp<Pick<S, ColArrayNames<KC> & keyof S> & AggResultSchema<A>>
    > {
        const accessor = new RowAccessor(this.schema)
        const keyCols = keys(accessor)
        const groupAccessor = new GroupAccessor(this.schema)
        const result = transform(groupAccessor)

        const keyNames = keyCols.map(c => c.toOp().getName())
        const aggregations = Object.entries(result.aggregations).map(
            ([k, v]) => [k, v.toOp()] as [string, IVOp]
        )

        return new GroupOp(this._op, keyNames, aggregations).toRelation() as any
    }



    /**
     * Add computed columns to each row.
     * @example penguins.derive(r => ({ ratio: r.col("bill_length_mm").div(40) }))
     */
    derive<D extends Record<string, IVExpr<any, any>>>(
        cb: (r: RowAccessor<S>) => D
    ): Relation<DeriveSchema<S, D>, DeriveOp<DeriveSchema<S, D>, Record<string, IVOp>>> {
        const accessor = new RowAccessor(this.schema)
        const derivations = cb(accessor)
        const pairs = Object.entries(derivations).map(([k, v]) => [k, v.toOp()] as [string, IVOp])

        return new DeriveOp(this._op, pairs).toRelation() as any
    }

    /**
     * Replace existing columns with a new set of expressions.
     * @example penguins.select(r => ({ species: r.col("species"), age: r.col("year").sub(2000) }))
     * @example penguins.select(r => ({ species: true })) // Keep existing column
     */
    select<D extends SelectInput<S, D>>(
        cb: (r: RowAccessor<S>) => D
    ): Relation<SelectSchema<S, D>, SelectOp<SelectSchema<S, D>>> {
        if (!cb) {
            throw new Error("select() requires a callback returning an object map of columns. For example: .select(r => ({ species: true }))")
        }

        const accessor = new RowAccessor(this.schema)
        const selections = cb(accessor)

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

        return new SelectOp(this._op, pairs).toRelation() as any
    }

    /**
     * Sort rows by one or more keys.
     * @example penguins.sort(r => r.col("count").desc())
     * @example penguins.sort(r => [r.col("species"), r.col("year").desc()])
     */
    sort(
        cb: (r: RowAccessor<S>) => SortExpr | IVExpr<any, any> | (SortExpr | IVExpr<any, any>)[]
    ): Relation<S, SortOp<S>> {
        const accessor = new RowAccessor(this.schema)
        const result = cb(accessor)
        const keysList = Array.isArray(result) ? result : [result]
        const sortKeys = keysList.map(k =>
            k instanceof SortExpr ? k.toSortSpec() : new SortSpec(k.toOp(), 'asc')
        )
        return new SortOp(this._op, sortKeys).toRelation()
    }

    /**
     * Take the first n rows.
     * @example penguins.take(10)
     */
    take(n: number): Relation<S, TakeOp<S>> {
        return new TakeOp(this._op, n).toRelation()
    }

    compile(compiler: Compiler<any>): string {
        return compiler.compileROp(this._op as unknown as BuiltinROp)
    }

    /** Compile to a PRQL query string. */
    toPrql(): string {
        return this.compile(new PrqlCompiler())
    }

    /** Compile to SQL using the PRQL compiler. */
    toSql(): string {
        return this.compile(new SqlCompiler())
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
    return new FromOp(name, schema(sch)).toRelation()
}
