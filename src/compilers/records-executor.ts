import type { ITableOp } from '../ir.js'
import {
    FromOp, FilterOp, DeriveOp, GroupOp, SortOp, TakeOp,
} from '../ir.js'
import type { IOp } from '../value/core.js'
import type { BuiltinOp } from '../value/ops.js'

type Row = Record<string, any>

/**
 * A zero-dependency execution backend that operates on arrays of JS records.
 *
 * Supports all built-in {@link ITableOp} and {@link IOp} kinds out of the box.
 *
 * To support custom operations, subclass `RecordsExecutor` and override
 * {@link execute} and/or {@link evalOp}. Delegate to `super` for built-in ops.
 *
 * @example
 * ```ts
 * class MyExecutor extends RecordsExecutor {
 *     execute(op: ITableOp): Record<string, any>[] {
 *         if (op.kind === 'sample') {
 *             const source = this.execute((op as SampleOp).source)
 *             return source.slice(0, (op as SampleOp).n)
 *         }
 *         return super.execute(op)
 *     }
 * }
 * ```
 */
export class RecordsExecutor {
    /**
     * Execute a table op tree and return the resulting rows.
     * Override this method in a subclass to handle custom table ops.
     */
    execute(op: ITableOp): Row[] {
        switch (op.kind) {
            case 'from':
                throw new Error(
                    `Cannot execute 'from' table op for '${(op as FromOp).name}'. ` +
                    `The RecordsExecutor only operates on in-memory data. ` +
                    `Use RecordsOp as your data source instead.`
                )
            case 'records':
                return (op as RecordsOp).records
            case 'filter':
                return this.executeFilter(op as FilterOp)
            case 'derive':
                return this.executeDerive(op as DeriveOp)
            case 'group':
                return this.executeGroup(op as GroupOp)
            case 'sort':
                return this.executeSort(op as SortOp)
            case 'take':
                return this.executeTake(op as TakeOp)
            default:
                throw new Error(`Unknown table op kind '${op.kind}'.`)
        }
    }

    /**
     * Evaluate a value op against a single row, returning the JS value.
     * Override this method in a subclass to handle custom value ops.
     */
    evalOp(op: IOp, row: Row): any {
        const builtinOp = op as BuiltinOp
        const kind = builtinOp.kind
        switch (kind) {
            case 'col_ref': return row[builtinOp.name]
            case 'int_literal': return builtinOp.value
            case 'float_literal': return builtinOp.value
            case 'string_literal': return builtinOp.value
            case 'boolean_literal': return builtinOp.value
            case 'null_literal': return null
            case 'datetime_literal': return builtinOp.value
            case 'date_literal': return builtinOp.value
            case 'time_literal': return builtinOp.value

            case 'eq': return this.evalOp(builtinOp.left, row) === this.evalOp(builtinOp.right, row)
            case 'gt': return this.evalOp(builtinOp.left, row) > this.evalOp(builtinOp.right, row)
            case 'gte': return this.evalOp(builtinOp.left, row) >= this.evalOp(builtinOp.right, row)
            case 'lt': return this.evalOp(builtinOp.left, row) < this.evalOp(builtinOp.right, row)
            case 'lte': return this.evalOp(builtinOp.left, row) <= this.evalOp(builtinOp.right, row)
            case 'is_not_null': return this.evalOp(builtinOp.operand, row) != null

            case 'not': return !this.evalOp(builtinOp.operand, row)
            case 'and': return this.evalOp(builtinOp.left, row) && this.evalOp(builtinOp.right, row)
            case 'or': return this.evalOp(builtinOp.left, row) || this.evalOp(builtinOp.right, row)

            case 'add': return this.evalOp(builtinOp.left, row) + this.evalOp(builtinOp.right, row)
            case 'sub': return this.evalOp(builtinOp.left, row) - this.evalOp(builtinOp.right, row)
            case 'mul': return this.evalOp(builtinOp.left, row) * this.evalOp(builtinOp.right, row)
            case 'div': return this.evalOp(builtinOp.left, row) / this.evalOp(builtinOp.right, row)

            case 'upper': return String(this.evalOp(builtinOp.operand, row)).toUpperCase()
            case 'lower': return String(this.evalOp(builtinOp.operand, row)).toLowerCase()
            case 'contains': return String(this.evalOp(builtinOp.operand, row)).includes(this.evalOp(builtinOp.pattern as IOp, row))
            case 'starts_with': return String(this.evalOp(builtinOp.operand, row)).startsWith(this.evalOp(builtinOp.prefix as IOp, row))

            case 'temporal_to_string': {
                const date = this.evalOp(builtinOp.operand, row)
                return date instanceof Date ? date.toISOString() : String(date)
            }

            // Aggregation ops should not be called per-row — they're handled in executeGroup
            case 'mean':
            case 'sum':
            case 'min':
            case 'max':
            case 'count':
                throw new Error(`Aggregation op '${kind}' cannot be evaluated per-row. It should only appear inside a group().`)

            case 'raw_sql':
                throw new Error(`Cannot evaluate raw SQL expression in the records executor.`)

            default:
                throw new Error(`Unknown value op kind '${(kind satisfies never) as string}'.`)
        }
    }

    /**
     * Evaluate an aggregation op over a group of rows.
     * Override this method in a subclass to handle custom aggregation ops.
     */
    evalAggOp(op: IOp, rows: Row[]): any {
        const builtinOp = op as BuiltinOp
        switch (builtinOp.kind) {
            case 'count':
                return rows.length
            case 'sum': {
                let total = 0
                for (const row of rows) total += this.evalOp(builtinOp.operand, row)
                return total
            }
            case 'mean': {
                if (rows.length === 0) return null
                let total = 0
                for (const row of rows) total += this.evalOp(builtinOp.operand, row)
                return total / rows.length
            }
            case 'min': {
                if (rows.length === 0) return null
                let result = this.evalOp(builtinOp.operand, rows[0]!)
                for (let i = 1; i < rows.length; i++) {
                    const v = this.evalOp(builtinOp.operand, rows[i]!)
                    if (v < result) result = v
                }
                return result
            }
            case 'max': {
                if (rows.length === 0) return null
                let result = this.evalOp(builtinOp.operand, rows[0]!)
                for (let i = 1; i < rows.length; i++) {
                    const v = this.evalOp(builtinOp.operand, rows[i]!)
                    if (v > result) result = v
                }
                return result
            }
            default:
                // Non-aggregation ops: just evaluate against the first row (for key columns etc.)
                return this.evalOp(op, rows[0]!)
        }
    }

    protected executeFilter(op: FilterOp): Row[] {
        const source = this.execute(op.source)
        return source.filter(row => this.evalOp(op.condition, row))
    }

    protected executeDerive(op: DeriveOp): Row[] {
        const source = this.execute(op.source)
        return source.map(row => {
            const newRow = { ...row }
            for (const [k, v] of op.derivations) {
                newRow[k] = this.evalOp(v, row)
            }
            return newRow
        })
    }

    protected executeGroup(op: GroupOp): Row[] {
        const source = this.execute(op.source)

        // Build groups using a string key
        const groups = new Map<string, Row[]>()
        for (const row of source) {
            const keyParts = op.keys.map(k => JSON.stringify(row[k]))
            const key = keyParts.join('\x00')
            let group = groups.get(key)
            if (!group) {
                group = []
                groups.set(key, group)
            }
            group.push(row)
        }

        // Produce one output row per group
        const results: Row[] = []
        for (const groupRows of groups.values()) {
            const outRow: Row = {}
            // Copy key columns from the first row
            for (const k of op.keys) {
                outRow[k] = groupRows[0]![k]
            }
            // Evaluate aggregations
            for (const [name, aggOp] of op.aggregations) {
                outRow[name] = this.evalAggOp(aggOp, groupRows)
            }
            results.push(outRow)
        }
        return results
    }

    protected executeSort(op: SortOp): Row[] {
        const source = this.execute(op.source)
        const sorted = [...source]
        sorted.sort((a, b) => {
            for (const spec of op.keys) {
                const aVal = this.evalOp(spec.op, a)
                const bVal = this.evalOp(spec.op, b)
                let cmp = 0
                if (aVal < bVal) cmp = -1
                else if (aVal > bVal) cmp = 1
                if (cmp !== 0) {
                    return spec.direction === 'desc' ? -cmp : cmp
                }
            }
            return 0
        })
        return sorted
    }

    protected executeTake(op: TakeOp): Row[] {
        const source = this.execute(op.source)
        return source.slice(0, op.n)
    }
}

// ---------------------------------------------------------------------------
// RecordsOp — a data source backed by an in-memory array of records
// ---------------------------------------------------------------------------

import { IsTableOpSymbol } from '../ir.js'
import type { Schema } from '../schema.js'
import { InferSchemaFromRecords, inferSchemaFromRecords } from '../relation.js'

/**
 * A table op backed by an in-memory array of JS records.
 * Use this as the root data source for the {@link RecordsExecutor}.
 *
 * @example
 * ```ts
 * const data = [
 *   { name: 'Alice', age: 30 },
 *   { name: 'Bob', age: 25 },
 * ]
 * const op = new RecordsOp(data, inferSchemaFromRecords(data))
 * const rel = new Relation(op)
 * ```
 */
export class RecordsOp implements ITableOp {
    [IsTableOpSymbol] = true as const
    readonly kind = 'records' as const
    private readonly _schema: Schema

    constructor(
        readonly records: Row[],
        schema?: Schema,
    ) {
        this._schema = schema ?? inferSchemaFromRecords(records)
    }

    schema(): Schema { return this._schema }
}

// ---------------------------------------------------------------------------
// fromRecords — convenience factory for creating a Relation from records
// ---------------------------------------------------------------------------

import { Relation } from '../relation.js'
import type { InferSchema, IntoSchema } from '../schema.js'
import { schema as makeSchema } from '../schema.js'

/**
 * Create a {@link Relation} backed by an in-memory array of JS records.
 *
 * If a schema is provided, it will be used for type-level column tracking.
 * Otherwise, the schema is inferred from the first record at runtime.
 *
 * @example
 * ```ts
 * const penguins = fromRecords([
 *   { species: 'Adelie', bill_length_mm: 39.1 },
 *   { species: 'Chinstrap', bill_length_mm: 48.5 },
 * ], { species: 'string', bill_length_mm: 'float64' })
 *
 * const executor = new RecordsExecutor()
 * const result = executor.execute(penguins._ir)
 * ```
 */
export function fromRecords<S extends IntoSchema>(records: Row[], sch: S): Relation<InferSchema<S>>
export function fromRecords<R extends Row>(records: R[]): Relation<InferSchemaFromRecords<R[]>>
export function fromRecords(records: Row[], sch?: IntoSchema): Relation<Schema> {
    const finalSchema = sch ? makeSchema(sch) : inferSchemaFromRecords(records)
    return new Relation(new RecordsOp(records, finalSchema))
}
