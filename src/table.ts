import type { Schema, DataType } from './datatypes.js'
import type { IRNode } from './ir.js'
import type { Compiler } from './compiler.js'
import {
    Expr, BooleanExpr, AggExpr, SortExpr,
    col, type Col, type NumericDataType,
    StringCol, NumericCol, BooleanCol, ColRef,
} from './expr.js'
import { PrqlCompiler } from './prql-compiler.js'
import { SqlCompiler } from './sql-compiler.js'

// ---------------------------------------------------------------------------
// Row and group accessors
// ---------------------------------------------------------------------------

class RowAccessor<S extends Schema> {
    constructor(private readonly _schema: S) { }

    col<K extends keyof S & string>(name: K): Col<K, S[K], S> {
        return col(name, this._schema[name] as S[K])
    }
}

/** Result of calling g.agg({...}) inside a group() callback. */
class GroupResult<A extends Record<string, AggExpr<DataType>>> {
    constructor(readonly aggregations: A) { }
}

class GroupAccessor<S extends Schema> extends RowAccessor<S> {
    agg<A extends Record<string, AggExpr<DataType>>>(
        aggregations: A
    ): GroupResult<A> {
        return new GroupResult(aggregations)
    }
}

// ---------------------------------------------------------------------------
// Helper types for group() result schema
// ---------------------------------------------------------------------------

type ColName<C> =
    C extends StringCol<infer N> ? N :
    C extends NumericCol<infer N, NumericDataType> ? N :
    C extends BooleanCol<infer N> ? N :
    C extends ColRef<infer N, DataType> ? N :
    never

type ColArrayNames<KC> = KC extends Array<infer C> ? ColName<C> : never

type AggResultSchema<A extends Record<string, AggExpr<DataType>>> = {
    [K in keyof A]: A[K] extends AggExpr<infer T> ? T : never
}

// ---------------------------------------------------------------------------
// Table class
// ---------------------------------------------------------------------------

export class Table<S extends Schema = Schema> {
    constructor(
        readonly schema: S,
        /** @internal */ readonly _ir: IRNode
    ) { }

    /**
     * Filter rows using a boolean expression.
     * @example penguins.filter(r => r.col("bill_length_mm").gt(40))
     */
    filter(cb: (r: RowAccessor<S>) => BooleanExpr): Table<S> {
        const accessor = new RowAccessor(this.schema)
        const condition = cb(accessor)
        return new Table(this.schema, { kind: 'filter', source: this._ir, condition })
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
        KC extends Col<any, any, S>[],
        A extends Record<string, AggExpr<DataType>>
    >(
        keys: (r: RowAccessor<S>) => KC,
        transform: (g: GroupAccessor<S>) => GroupResult<A>
    ): Table<Pick<S, ColArrayNames<KC> & keyof S> & AggResultSchema<A>> {
        const accessor = new RowAccessor(this.schema)
        const keyCols = keys(accessor)
        const groupAccessor = new GroupAccessor(this.schema)
        const result = transform(groupAccessor)

        const keyNames = keyCols.map(c => (c as { name: string }).name)
        const aggregations = Object.entries(result.aggregations).map(
            ([k, v]) => [k, v as Expr] as [string, Expr]
        )

        const resultSchema: Record<string, DataType> = {}
        for (const c of keyCols) {
            const colObj = c as { name: string; dtype: DataType }
            resultSchema[colObj.name] = colObj.dtype
        }
        for (const [k, agg] of Object.entries(result.aggregations)) {
            resultSchema[k] = agg.dtype
        }

        return new Table(resultSchema as any, {
            kind: 'group',
            source: this._ir,
            keys: keyNames,
            aggregations,
        })
    }

    /**
     * Add computed columns to each row.
     * @example penguins.derive(r => ({ ratio: r.col("bill_length_mm").div(40) }))
     */
    derive<D extends Record<string, Expr<DataType>>>(
        cb: (r: RowAccessor<S>) => D
    ): Table<S & { [K in keyof D]: D[K] extends Expr<infer T> ? T : never }> {
        const accessor = new RowAccessor(this.schema)
        const derivations = cb(accessor)
        const pairs = Object.entries(derivations).map(([k, v]) => [k, v] as [string, Expr])

        const newSchema = { ...this.schema } as Record<string, DataType>
        for (const [k, v] of Object.entries(derivations)) {
            newSchema[k] = v.dtype
        }

        return new Table(newSchema as any, {
            kind: 'derive',
            source: this._ir,
            derivations: pairs,
        })
    }

    /**
     * Sort rows by one or more keys.
     * @example penguins.sort(r => r.col("count").desc())
     * @example penguins.sort(r => [r.col("species"), r.col("year").desc()])
     */
    sort(
        cb: (r: RowAccessor<S>) => SortExpr | Expr<DataType> | (SortExpr | Expr<DataType>)[]
    ): Table<S> {
        const accessor = new RowAccessor(this.schema)
        const result = cb(accessor)
        const keysList = Array.isArray(result) ? result : [result]
        const sortKeys = keysList.map(k =>
            k instanceof SortExpr ? k : new SortExpr(k, 'asc')
        )
        return new Table(this.schema, { kind: 'sort', source: this._ir, keys: sortKeys })
    }

    /**
     * Take the first n rows.
     * @example penguins.take(10)
     */
    take(n: number): Table<S> {
        return new Table(this.schema, { kind: 'take', source: this._ir, n })
    }

    /** Compile to a query string using the given compiler. */
    compile(compiler: Compiler): string {
        return compiler.compileIR(this._ir)
    }

    /** Return the PRQL query string for this table expression. */
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
 * Define a table with an explicit name and schema.
 * @example
 * const penguins = table('penguins', {
 *   species: 'string',
 *   year: 'int32',
 *   bill_length_mm: 'float64',
 * })
 */
export function table<S extends Schema>(name: string, schema: S): Table<S> {
    return new Table(schema, { kind: 'table', name })
}
