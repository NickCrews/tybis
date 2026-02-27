import type { Schema, DataType } from './datatypes.js'
import { Col, Expr, BoolExpr, AggExpr, SortExpr } from './expr.js'
import { compile, CompileOptions } from 'prqlc'

// ---------------------------------------------------------------------------
// Internal IR
// ---------------------------------------------------------------------------

type IRNode =
    | { kind: 'table'; name: string }
    | { kind: 'filter'; source: IRNode; condition: string }
    | { kind: 'derive'; source: IRNode; derivations: [string, string][] }
    | { kind: 'group'; source: IRNode; keys: string[]; aggregations: [string, string][] }
    | { kind: 'sort'; source: IRNode; keys: string[] }
    | { kind: 'take'; source: IRNode; n: number }

function toPRQL(node: IRNode): string {
    switch (node.kind) {
        case 'table':
            return `from ${node.name}`
        case 'filter':
            return `${toPRQL(node.source)}\nfilter ${node.condition}`
        case 'derive': {
            const dervs = node.derivations.map(([k, v]) => `  ${k} = ${v}`).join(',\n')
            return `${toPRQL(node.source)}\nderive {\n${dervs}\n}`
        }
        case 'group': {
            const keys = node.keys.join(', ')
            const aggs = node.aggregations.map(([k, v]) => `    ${k} = ${v}`).join(',\n')
            return `${toPRQL(node.source)}\ngroup {${keys}} (\n  aggregate {\n${aggs}\n  }\n)`
        }
        case 'sort': {
            const keys = node.keys.join(', ')
            return `${toPRQL(node.source)}\nsort {${keys}}`
        }
        case 'take':
            return `${toPRQL(node.source)}\ntake ${node.n}`
    }
}

// ---------------------------------------------------------------------------
// Row and group accessors
// ---------------------------------------------------------------------------

class RowAccessor<S extends Schema> {
    constructor(private readonly _schema: S) { }

    col<K extends keyof S & string>(name: K): Col<K, S[K], S> {
        return new Col(name, this._schema[name] as S[K])
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

type ColArrayNames<KC> = KC extends Array<Col<infer N, DataType, Schema>> ? N : never

type AggResultSchema<A extends Record<string, AggExpr<DataType>>> = {
    [K in keyof A]: A[K] extends AggExpr<infer T> ? T : never
}

// ---------------------------------------------------------------------------
// Table class
// ---------------------------------------------------------------------------

export class Table<S extends Schema = Schema> {
    constructor(
        readonly schema: S,
        private readonly _ir: IRNode
    ) { }

    /**
     * Filter rows using a boolean expression.
     * @example penguins.filter(r => r.col("bill_length_mm").gt(40))
     */
    filter(cb: (r: RowAccessor<S>) => BoolExpr): Table<S> {
        const accessor = new RowAccessor(this.schema)
        const condition = cb(accessor).prql()
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

        const keyNames = keyCols.map(c => c.name as string)
        const aggregations = Object.entries(result.aggregations).map(
            ([k, v]) => [k, v.prql()] as [string, string]
        )

        const resultSchema: Record<string, DataType> = {}
        for (const col of keyCols) {
            resultSchema[col.name as string] = col.dtype
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
        const pairs = Object.entries(derivations).map(([k, v]) => [k, v.prql()] as [string, string])

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
        const prqlKeys = keysList.map(k => k instanceof SortExpr ? k._prql : k.prql())
        return new Table(this.schema, { kind: 'sort', source: this._ir, keys: prqlKeys })
    }

    /**
     * Take the first n rows.
     * @example penguins.take(10)
     */
    take(n: number): Table<S> {
        return new Table(this.schema, { kind: 'take', source: this._ir, n })
    }

    /** Return the PRQL query string for this table expression. */
    to_prql(): string {
        return toPRQL(this._ir)
    }

    /** Compile to SQL using the PRQL compiler. */
    to_sql(): string {
        const prqlText = this.to_prql()
        const opts = new CompileOptions()
        opts.format = false
        opts.signature_comment = false
        const result = compile(prqlText, opts)
        if (result === undefined) {
            throw new Error(`PRQL compilation failed for query:\n${prqlText}`)
        }
        return result
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
