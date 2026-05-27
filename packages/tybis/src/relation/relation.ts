import { type DataType } from '../datatype.js'
import { schema, type Schema, type InferSchema, type IntoSchema } from './schema.js'
import type { IROp } from './irop.js'
import { FilterOp, GroupOp, DeriveOp, SelectOp, SortOp, TakeOp, FromOp } from './rops.js'
import type { RCompiler } from '../compilers/base.js'
import { type IVOp, type IVExpr } from '../value/core.js'
import { SortSpec, type NullsOrder } from '../value/ops.js'
import {
    BooleanExpr,
    SortExpr,
    col,
    VExpr,
} from '../value/expr.js'
import { suggestColumnName } from '../utils/typo.js'

// ---------------------------------------------------------------------------
// Column namespace
// ---------------------------------------------------------------------------

type Col<DT extends DataType = DataType> = VExpr<DT, 'columnar'>

/**
 * A flat namespace of column expressions for a given schema.
 *
 * `cols.species` returns a columnar expression for the `species` column.
 * Bracket access (`cols["first name"]`) works for column names that aren't valid identifiers.
 * Accessing an unknown column throws an error (with a typo suggestion when applicable).
 */
export type Cols<S extends Schema> = {
    readonly [K in keyof S & string]: Col<S[K]>
}

function buildCols<S extends Schema>(sch: S): Cols<S> {
    const target: Record<string, Col> = {}
    for (const name of Object.keys(sch)) {
        target[name] = col(name, sch[name]!) as Col
    }
    return new Proxy(target, {
        get(t, prop) {
            if (typeof prop === 'symbol' || prop in t) {
                return (t as any)[prop]
            }
            const name = prop as string
            const suggestion = suggestColumnName(name, Object.keys(t))
            throw new Error(`Column '${name}' does not exist.${suggestion ? ` Did you mean '${suggestion}'?` : ''}`)
        },
    }) as Cols<S>
}

// ---------------------------------------------------------------------------
// Schema-shape helpers
// ---------------------------------------------------------------------------

// Forces TS to display a computed type as a flat object literal in IDE hovers,
// rather than the raw `A & B` / `Omit<...> & { ... }` expression.
type Prettify<T> = { [K in keyof T]: T[K] } & {}

type AggResultSchema<A extends Record<string, IVExpr<any, 'scalar'>>> = {
    [K in keyof A]: A[K] extends IVExpr<infer T, 'scalar'> ? T : never
}

type DeriveSchema<S extends Schema, D extends Record<string, IVExpr<any, any>>> =
    Prettify<Omit<S, keyof D> & {
        [K in keyof D]: D[K] extends IVExpr<infer T, any> ? T : never
    }>

type SelectInput<S extends Schema, D> = {
    [K in keyof D]: K extends keyof S
    ? (IVExpr<any, any> | boolean)
    : IVExpr<any, any>
}

type SelectSchema<S extends Schema, D> = Prettify<{
    [K in keyof D as D[K] extends false ? never : K]:
    D[K] extends IVExpr<infer T, any> ? T :
    D[K] extends boolean ? (K extends keyof S ? S[K] : never) :
    never
}>

type SortDir = 'asc' | 'desc'
type SortKeyOpts = { dir: SortDir; nulls?: NullsOrder }
type SortKeysObject<S extends Schema> = {
    [K in keyof S & string]?: SortDir | SortKeyOpts
}

// ---------------------------------------------------------------------------
// Relation class
// ---------------------------------------------------------------------------

export class Relation<S extends Schema = Schema, O extends IROp<S> = IROp<S>> {
    /**
     * A flat namespace of every column in the relation as a property.
     * @example penguins.cols.bill_length_mm.mean()
     * @example penguins.cols["first name"]  // bracket access for non-identifier names
     */
    readonly cols: Cols<S>

    constructor(
        /** @internal */ readonly _op: O
    ) {
        this.cols = buildCols(_op.schema())
    }

    /**
     * The schema of the relation, i.e. the mapping of column names to their data types.
     * @example
     * const penguins = ty.table('penguins', { species: 'string', bill_length_mm: 'float64' })
     * penguins.derive(r => ({ bill_length_cm: r.bill_length_mm.div(10) })).schema
     * // Result: { species: 'string', bill_length_mm: 'float64', bill_length_cm: 'float64' }
     */
    get schema(): S {
        return this._op.schema()
    }

    /**
     * Filter rows using a boolean expression.
     * @example penguins.filter(r => r.bill_length_mm.gt(40))
     */
    filter(cb: (r: Cols<S>) => BooleanExpr): Relation<S, FilterOp<S>> {
        const condition = cb(this.cols)
        return new Relation(new FilterOp(this._op, condition.toOp()))
    }

    /**
     * Group rows by key columns, returning a {@link GroupedRelation} for aggregation.
     *
     * Use the plain-object form to group by existing columns.
     * @example
     * ```
     * penguins.groupBy({ species: true, year: true })
     * ```
     *
     * Use the callback form when you need to compute derived keys, eg turning the `year` column into a decade:
     * @example
     * ```
     * penguins.groupBy(r => ({ kind: r.species, decade: r.year.div(10) }))
     *   .agg(r => ({ count: ty.count(), mean_bill: r.bill_length_mm.mean() }))
     * ```
     */
    groupBy<K extends SelectInput<S, K>>(
        input: K & (keyof K extends never ? "At least one grouping key is required" : K),
    ): GroupedRelation<S, SelectSchema<S, K>>
    groupBy<K extends SelectInput<S, K>>(
        input: (r: Cols<S>) => K & (keyof K extends never ? "At least one grouping key is required" : K),
    ): GroupedRelation<S, SelectSchema<S, K>>
    groupBy<K extends SelectInput<S, K>>(
        input: K | ((r: Cols<S>) => K),
    ): GroupedRelation<S, SelectSchema<S, K>> {
        const groupingKeys = (typeof input === 'function' ? (input as any)(this.cols) : input) as Record<string, IVExpr<any, any> | boolean>

        const keyPairs: [string, IVOp][] = []
        const keySchema: Record<string, DataType> = {}
        for (const [k, v] of Object.entries(groupingKeys)) {
            if (typeof v === 'boolean') {
                if (v === true) {
                    if (!(k in this.schema)) {
                        const suggestion = suggestColumnName(k, Object.keys(this.schema))
                        throw new Error(`Cannot group by '${k}': column does not exist.${suggestion ? ` Did you mean '${suggestion}'?` : ''}`)
                    }
                    keyPairs.push([k, (this.cols as any)[k].toOp() as IVOp])
                    keySchema[k] = this.schema[k]!
                }
            } else {
                keyPairs.push([k, v.toOp() as unknown as IVOp])
                keySchema[k] = v.dtype()
            }
        }

        // We could extend this to support empty keys (aggregating the whole table) in the future.
        if (keyPairs.length === 0) {
            throw new Error("groupBy() requires at least one grouping key")
        }

        return new GroupedRelation<S, SelectSchema<S, K>>(this, keyPairs, keySchema as SelectSchema<S, K>)
    }

    /**
     * Add computed columns to each row.
     *
     * Use the plain-object form for simple derivations that don't reference existing columns,
     * for example constant values:
     * @example
     * ```
     * penguins.derive({ year_offset: ty.lit(2000) })
     * ```
     * 
     * Use the callback form when you need to compute new column values from existing columns:     
     * @example
     * ```
     * penguins.derive(r => ({ ratio: r.bill_length_mm.div(40) }))
     * ```
     */
    derive<D extends Record<string, IVExpr<any, any>>>(
        input: D | ((r: Cols<S>) => D)
    ): Relation<DeriveSchema<S, D>> {
        const derivations = typeof input === 'function' ? input(this.cols) : input
        const pairs = Object.entries(derivations).map(([k, v]) => [k, v.toOp()] as [string, IVOp])

        return new Relation(new DeriveOp(this._op, pairs)) as any
    }

    /**
     * Select a subset of columns, optionally computing new ones.
     *
     * Use the plain-object form to pick (or drop) existing columns by name:
     * @example
     * ```
     * penguins.select({ species: true, island: true, bill_length_mm: false })
     * ```
     * 
     * Use the callback form when you need to compute new values from existing columns:
     * @example
     * ```
     * penguins.select(r => ({ species: r.species, age: r.year.sub(2000) }))
     * ```
     */
    select<D extends SelectInput<S, D>>(
        input: D | ((r: Cols<S>) => D)
    ): Relation<SelectSchema<S, D>, SelectOp<SelectSchema<S, D>>> {
        if (!input) {
            throw new Error("select() requires a mapping object or callback. For example: .select({ species: true })")
        }

        const selections = typeof input === 'function' ? (input as any)(this.cols) : input

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
                    pairs.push([k, (this.cols as any)[k].toOp() as IVOp])
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
     *
     * Plain-object form keys are column names; values are `'asc'`, `'desc'`,
     * or `{ dir, nulls? }`.
     *
     * @example penguins.sort({ year: 'desc' })
     * @example penguins.sort({ species: 'asc', year: { dir: 'desc', nulls: 'last' } })
     * @example penguins.sort(r => r.count.desc())
     * @example penguins.sort(r => [r.species, r.year.desc({ nulls: 'last' })])
     */
    sort(
        input:
            | SortKeysObject<S>
            | ((r: Cols<S>) => SortExpr | IVExpr<any, any> | (SortExpr | IVExpr<any, any>)[])
    ): Relation<S, SortOp<S>> {
        const sortKeys: SortSpec[] =
            typeof input === 'function'
                ? this._sortKeysFromCallback(input)
                : this._sortKeysFromObject(input)
        if (sortKeys.length === 0) {
            throw new Error("sort() requires at least one key")
        }
        return new Relation(new SortOp(this._op, sortKeys))
    }

    private _sortKeysFromCallback(
        cb: (r: Cols<S>) => SortExpr | IVExpr<any, any> | (SortExpr | IVExpr<any, any>)[]
    ): SortSpec[] {
        const result = cb(this.cols)
        const keysList = Array.isArray(result) ? result : [result]
        return keysList.map(k =>
            k instanceof SortExpr ? k.toSortSpec() : new SortSpec(k.toOp(), 'asc')
        )
    }

    private _sortKeysFromObject(obj: SortKeysObject<S>): SortSpec[] {
        const out: SortSpec[] = []
        for (const [name, value] of Object.entries(obj) as [string, SortDir | SortKeyOpts][]) {
            if (!(name in this.schema)) {
                const suggestion = suggestColumnName(name, Object.keys(this.schema))
                throw new Error(`Cannot sort by '${name}': column does not exist.${suggestion ? ` Did you mean '${suggestion}'?` : ''}`)
            }
            const colOp = (this.cols as any)[name].toOp() as IVOp
            if (typeof value === 'string') {
                out.push(new SortSpec(colOp, value))
            } else {
                out.push(new SortSpec(colOp, value.dir, value.nulls))
            }
        }
        return out
    }

    /**
     * Take the first n rows.
     * @example penguins.take(10)
     */
    take(n: number): Relation<S, TakeOp<S>> {
        return new Relation(new TakeOp(this._op, n))
    }

    compile<R>(compiler: RCompiler<R, O>): R {
        return compiler.compileROp(this._op)
    }
}

// ---------------------------------------------------------------------------
// GroupedRelation
// ---------------------------------------------------------------------------

/**
 * The result of calling {@link Relation.groupBy}. Use {@link GroupedRelation.agg}
 * to produce a new aggregated {@link Relation}.
 */
export class GroupedRelation<S extends Schema, KS extends Schema> {
    constructor(
        private readonly _source: Relation<S>,
        private readonly _keyPairs: [string, IVOp][],
        /** @internal */ readonly _keySchema: KS,
    ) { }

    /**
     * Aggregate the group with a record of scalar expressions.
     * @example
     * penguins.groupBy({ species: true })
     *   .agg(r => ({ count: ty.count(), mean_bill: r.bill_length_mm.mean() }))
     */
    agg<A extends Record<string, IVExpr<any, 'scalar'>>>(
        input: A | ((r: Cols<S>) => A)
    ): Relation<Prettify<KS & AggResultSchema<A>>, GroupOp<Prettify<KS & AggResultSchema<A>>>> {
        const aggregations = typeof input === 'function' ? input(this._source.cols) : input

        for (const [key, expr] of Object.entries(aggregations)) {
            if (expr.dshape() !== 'scalar') {
                throw new Error(`Aggregation '${key}' must be a scalar expression, but got dshape='${expr.dshape()}'`)
            }
        }

        const pairs = Object.entries(aggregations).map(
            ([k, v]) => [k, v.toOp()] as [string, IVOp]
        )

        return new Relation(new GroupOp(this._source._op, this._keyPairs, pairs)) as any
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
