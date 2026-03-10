import type { Schema, DataType, InferSchema, IntoSchema } from './datatypes.js'
import * as dt from './datatypes.js'
import type { IRNode } from './ir.js'
import type { Compiler } from './compilers/base.js'
import { type IOp } from './core.js'
import { SortSpec } from './ops.js'
import {
    BaseExpr, BooleanExpr, SortExpr,
    col,
    Expr,
} from './expr.js'
import { PrqlCompiler } from './compilers/prql-compiler.js'
import { SqlCompiler } from './compilers/sql-compiler.js'
import { suggestColumnName } from './typo.js'

// ---------------------------------------------------------------------------
// Row and group accessors
// ---------------------------------------------------------------------------

type Col<K extends string = string, T extends DataType = DataType> = Expr<T, 'columnar'>

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
class GroupResult<A extends Record<string, BaseExpr<DataType, 'scalar'>>> {
    constructor(readonly aggregations: A) { }
}

class GroupAccessor<S extends Schema> extends RowAccessor<S> {
    agg<A extends Record<string, BaseExpr<DataType, 'scalar'>>>(
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

type AggResultSchema<A extends Record<string, BaseExpr<DataType, 'scalar'>>> = {
    [K in keyof A]: A[K] extends BaseExpr<infer T, 'scalar'> ? T : never
}

// ---------------------------------------------------------------------------
// Relation class
// ---------------------------------------------------------------------------

export class Relation<S extends Schema = Schema> {
    constructor(
        readonly schema: S,
        /** @internal */ readonly _ir: IRNode
    ) { }

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
    filter(cb: (r: RowAccessor<S>) => BooleanExpr): Relation<S> {
        const accessor = new RowAccessor(this.schema)
        const condition = cb(accessor)
        return new Relation(this.schema, { kind: 'filter', source: this._ir, condition: condition.toOp() })
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
        A extends Record<string, BaseExpr<DataType, 'scalar'>>
    >(
        keys: (r: RowAccessor<S>) => KC,
        transform: (g: GroupAccessor<S>) => GroupResult<A>
    ): Relation<Pick<S, ColArrayNames<KC> & keyof S> & AggResultSchema<A>> {
        const accessor = new RowAccessor(this.schema)
        const keyCols = keys(accessor)
        const groupAccessor = new GroupAccessor(this.schema)
        const result = transform(groupAccessor)

        const keyNames = keyCols.map(c => c.toOp().getName())
        const aggregations = Object.entries(result.aggregations).map(
            ([k, v]) => [k, v.toOp()] as [string, IOp]
        )

        const resultSchema: Record<string, DataType> = {}
        for (const c of keyCols) {
            resultSchema[c.toOp().getName()] = c.dtype()
        }
        for (const [k, agg] of Object.entries(result.aggregations)) {
            resultSchema[k] = agg.dtype()
        }

        return new Relation(resultSchema as any, {
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
    derive<D extends Record<string, BaseExpr>>(
        cb: (r: RowAccessor<S>) => D
    ): Relation<S & { [K in keyof D]: D[K] extends BaseExpr<infer T> ? T : never }> {
        const accessor = new RowAccessor(this.schema)
        const derivations = cb(accessor)
        const pairs = Object.entries(derivations).map(([k, v]) => [k, v.toOp()] as [string, IOp])

        const newSchema = { ...this.schema } as Record<string, DataType>
        for (const [k, v] of Object.entries(derivations)) {
            newSchema[k] = v.dtype()
        }

        return new Relation(newSchema as any, {
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
        cb: (r: RowAccessor<S>) => SortExpr | BaseExpr<DataType> | (SortExpr | BaseExpr<DataType>)[]
    ): Relation<S> {
        const accessor = new RowAccessor(this.schema)
        const result = cb(accessor)
        const keysList = Array.isArray(result) ? result : [result]
        const sortKeys = keysList.map(k =>
            k instanceof SortExpr ? k.toSortSpec() : new SortSpec(k.toOp(), 'asc')
        )
        return new Relation(this.schema, { kind: 'sort', source: this._ir, keys: sortKeys })
    }

    /**
     * Take the first n rows.
     * @example penguins.take(10)
     */
    take(n: number): Relation<S> {
        return new Relation(this.schema, { kind: 'take', source: this._ir, n })
    }

    compile(compiler: Compiler<any>): string {
        return compiler.compileIR(this._ir)
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
 * Define a relation with an explicit name and schema.
 * @example
 * const penguins = relation('penguins', {
 *   species: DT.string,
 *   year: DT.int32,
 *   bill_length_mm: DT.float64,
 * })
 */
export function relation<S extends IntoSchema>(name: string, schema: S): Relation<InferSchema<S>> {
    return new Relation(dt.schema(schema), { kind: 'from', name })
}
