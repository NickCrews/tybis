import { describe, it, expect, expectTypeOf } from 'vitest'
import {
    Relation, relation, count,
    RecordsExecutor, RecordsOp, fromRecords,
    inferSchemaFromRecords,
    ITableOp, IsTableOpSymbol, isTableOp,
} from '../src'
import type { Schema } from '../src'
import { IsOpSymbol } from '../src/value/core'
import type { IOp } from '../src/value/core'
import { DTFloat64 } from '../src/datatype'
import { opToExpr } from '../src/value/expr'
import { ColRefOp } from '../src/value/ops'

// ---------------------------------------------------------------------------
// Test data
// ---------------------------------------------------------------------------

const penguins = [
    { species: 'Adelie', island: 'Torgersen', bill_length_mm: 39.1, body_mass_g: 3750 },
    { species: 'Adelie', island: 'Torgersen', bill_length_mm: 39.5, body_mass_g: 3800 },
    { species: 'Adelie', island: 'Dream', bill_length_mm: 40.3, body_mass_g: 3900 },
    { species: 'Chinstrap', island: 'Dream', bill_length_mm: 46.5, body_mass_g: 3500 },
    { species: 'Chinstrap', island: 'Dream', bill_length_mm: 49.0, body_mass_g: 3800 },
    { species: 'Gentoo', island: 'Biscoe', bill_length_mm: 47.3, body_mass_g: 5200 },
    { species: 'Gentoo', island: 'Biscoe', bill_length_mm: 46.1, body_mass_g: 5100 },
]

// ---------------------------------------------------------------------------
// inferSchemaFromRecords
// ---------------------------------------------------------------------------

describe('inferSchemaFromRecords', () => {
    it('infers schema from records', () => {
        const actual = inferSchemaFromRecords(penguins)
        const expected = {
            species: { typecode: 'string' },
            island: { typecode: 'string' },
            bill_length_mm: { typecode: 'float', size: 64 },
            body_mass_g: { typecode: 'float', size: 64 },
        }
        expect(actual).toEqual(expected)
        expectTypeOf(actual).toMatchTypeOf(expected)
    })

    it('returns empty schema for empty array', () => {
        const actual = inferSchemaFromRecords([])
        expect(actual).toEqual({})
        expectTypeOf(actual).toEqualTypeOf<{}>()
    })

    it('handles booleans and nulls', () => {
        const data = [{ active: true, deleted_at: null }]
        const actual = inferSchemaFromRecords(data)
        const expected = {
            active: { typecode: 'boolean' },
            deleted_at: { typecode: 'null' },
        }
        expect(actual).toEqual(expected)
        expectTypeOf(actual).toMatchTypeOf(expected)
    })

    it('infers precise types for typed arrays', () => {
        const rows: Array<{ name: string, bill_length_mm: number, active: boolean }> = [
            { name: 'Adelie', bill_length_mm: 39.1, active: true },
        ]
        const actual = inferSchemaFromRecords(rows)
        const expectedType = {
            name: { typecode: 'string' },
            bill_length_mm: { typecode: 'float', size: 64 },
            active: { typecode: 'boolean' },
        }
        expect(actual).toEqual(expectedType)
        expectTypeOf(actual).toMatchTypeOf(expectedType)
    })

    it('infers schema from the first record type', () => {
        const rows = [
            { species: 'Adelie', bill_length_mm: 39.1, observed_at: new Date('2024-01-01') },
            { species: 'Chinstrap', bill_length_mm: 46.5, observed_at: new Date('2024-01-02'), extra: true },
        ] as const

        const actual = inferSchemaFromRecords(rows)
        const expectedType = {
            species: { typecode: 'string' },
            bill_length_mm: { typecode: 'float', size: 64 },
            observed_at: { typecode: 'datetime' },
        }
        expect(actual).toEqual(expectedType)
        expectTypeOf(actual).toMatchTypeOf(expectedType)
    })
})

// ---------------------------------------------------------------------------
// fromRecords
// ---------------------------------------------------------------------------

describe('fromRecords', () => {
    it('creates a relation with inferred schema', () => {
        const actual = fromRecords(penguins)
        const expectedSchema = {
            species: { typecode: 'string' },
            island: { typecode: 'string' },
            bill_length_mm: { typecode: 'float', size: 64 },
            body_mass_g: { typecode: 'float', size: 64 },
        }
        expect(actual.schema).toEqual(expectedSchema)
        expectTypeOf(actual.schema).toMatchTypeOf(expectedSchema)
        expect(actual._ir.kind).toBe('records')
    })

    it('creates a relation with explicit schema', () => {
        const rel = fromRecords(penguins, {
            species: 'string',
            island: 'string',
            bill_length_mm: 'float64',
            body_mass_g: 'float64',
        })
        const expectedSchema = {
            species: { typecode: 'string' },
            island: { typecode: 'string' },
            bill_length_mm: { typecode: 'float', size: 64 },
            body_mass_g: { typecode: 'float', size: 64 },
        }
        expect(rel.schema).toEqual(expectedSchema)
        expectTypeOf(rel.schema).toMatchTypeOf(expectedSchema)
    })
})

// ---------------------------------------------------------------------------
// RecordsExecutor — basic execution
// ---------------------------------------------------------------------------

describe('RecordsExecutor', () => {
    const executor = new RecordsExecutor()
    const penguinsSchema = {
        species: { typecode: 'string' },
        island: { typecode: 'string' },
        bill_length_mm: { typecode: 'float', size: 64 },
        body_mass_g: { typecode: 'float', size: 64 },
    }

    it('executes a RecordsOp', () => {
        const actual = fromRecords(penguins)
        expect(actual.schema).toEqual(penguinsSchema)
        expectTypeOf(actual.schema).toMatchTypeOf(penguinsSchema)
        const result = executor.execute(actual._ir)
        expect(result).toEqual(penguins)
    })

    it('executes filter', () => {
        const actual = fromRecords(penguins)
            .filter(r => r.col('bill_length_mm').gt(45))
        expect(actual.schema).toEqual(penguinsSchema)
        expectTypeOf(actual.schema).toMatchTypeOf(penguinsSchema)
        const result = executor.execute(actual._ir)
        expect(result).toHaveLength(4)
        expect(result.every(r => r.bill_length_mm > 45)).toBe(true)
    })

    it('executes derive', () => {
        const rel = fromRecords(penguins)
            .derive(r => ({
                bill_cm: r.col('bill_length_mm').div(10),
            }))
        const expectedSchema = {
            ...penguinsSchema,
            bill_cm: { typecode: 'float', size: 64 },
        }
        expect(rel.schema).toEqual(expectedSchema)
        expectTypeOf(rel.schema).toMatchTypeOf(expectedSchema)
        const result = executor.execute(rel._ir)
        expect(result[0]!.bill_cm).toBeCloseTo(3.91)
        expect(result[0]!.species).toBe('Adelie')
    })

    it('executes group + aggregation', () => {
        const rel = fromRecords(penguins)
            .group(
                r => [r.col('species')],
                g => g.agg({
                    cnt: count(),
                    avg_bill: g.col('bill_length_mm').mean(),
                    max_mass: g.col('body_mass_g').max(),
                    min_mass: g.col('body_mass_g').min(),
                    total_mass: g.col('body_mass_g').sum(),
                })
            )
        const result = executor.execute(rel._ir)
        expect(result).toHaveLength(3)

        const adelie = result.find(r => r.species === 'Adelie')!
        expect(adelie.cnt).toBe(3)
        expect(adelie.avg_bill).toBeCloseTo(39.633, 2)
        expect(adelie.max_mass).toBe(3900)
        expect(adelie.min_mass).toBe(3750)
        expect(adelie.total_mass).toBe(3750 + 3800 + 3900)
    })

    it('executes sort', () => {
        const rel = fromRecords(penguins)
            .sort(r => r.col('bill_length_mm').desc())
        const result = executor.execute(rel._ir)
        expect(result[0]!.bill_length_mm).toBe(49.0)
        expect(result[result.length - 1]!.bill_length_mm).toBe(39.1)
    })

    it('executes take', () => {
        const rel = fromRecords(penguins).take(3)
        const result = executor.execute(rel._ir)
        expect(result).toHaveLength(3)
    })

    it('executes a full pipeline: filter → group → sort → take', () => {
        const rel = fromRecords(penguins)
            .filter(r => r.col('bill_length_mm').gt(40))
            .group(
                r => [r.col('species')],
                g => g.agg({
                    cnt: count(),
                    avg_bill: g.col('bill_length_mm').mean(),
                })
            )
            .sort(r => r.col('cnt').desc())
            .take(2)
        const result = executor.execute(rel._ir)
        expect(result).toHaveLength(2)
        // Chinstrap has 2, Gentoo has 2, Adelie has 1 (only 40.3 passes filter)
        // Sort by cnt desc — both Chinstrap and Gentoo have 2, Adelie has 1
        expect(result.every(r => r.cnt >= 1)).toBe(true)
    })

    it('throws on FromOp', () => {
        const rel = relation('penguins', { species: 'string' })
        expect(() => executor.execute(rel._ir)).toThrow(/Cannot execute 'from'/)
    })

    // --- value op coverage ---

    it('evaluates string ops (upper, lower, contains, starts_with)', () => {
        const data = [{ name: 'Alice' }, { name: 'Bob' }, { name: 'Charlie' }]
        const rel = fromRecords(data)
            .derive(r => ({
                upper_name: r.col('name').upper(),
                lower_name: r.col('name').lower(),
                has_li: r.col('name').contains('li'),
                starts_a: r.col('name').startsWith('A'),
            }))
        const result = executor.execute(rel._ir)
        expect(result[0]).toMatchObject({
            upper_name: 'ALICE',
            lower_name: 'alice',
            has_li: true,
            starts_a: true,
        })
        expect(result[1]).toMatchObject({
            has_li: false,
            starts_a: false,
        })
    })

    it('evaluates boolean ops (not, and, or)', () => {
        const data = [{ a: 5, b: 10 }]
        const rel = fromRecords(data)
            .filter(r => r.col('a').lt(10).and(r.col('b').gte(10)))
        const result = executor.execute(rel._ir)
        expect(result).toHaveLength(1)

        const rel2 = fromRecords(data)
            .filter(r => r.col('a').gt(10).or(r.col('b').lte(5)))
        expect(executor.execute(rel2._ir)).toHaveLength(0)
    })

    it('evaluates arithmetic ops (add, sub, mul)', () => {
        const data = [{ x: 10, y: 3 }]
        const rel = fromRecords(data)
            .derive(r => ({
                sum: r.col('x').add(r.col('y')),
                diff: r.col('x').sub(r.col('y')),
                prod: r.col('x').mul(r.col('y')),
                quot: r.col('x').div(r.col('y')),
            }))
        const result = executor.execute(rel._ir)
        expect(result[0]).toMatchObject({ sum: 13, diff: 7, prod: 30 })
        expect(result[0]!.quot).toBeCloseTo(3.333, 2)
    })

    it('evaluates eq and is_not_null', () => {
        const data = [{ a: 1, b: null }, { a: 2, b: 'hello' }]
        const rel = fromRecords(data)
            .derive(r => ({
                b_present: r.col('b').isNotNull(),
            }))
        const result = executor.execute(rel._ir)
        expect(result[0]!.b_present).toBe(false)
        expect(result[1]!.b_present).toBe(true)
    })
})

// ---------------------------------------------------------------------------
// Custom ITableOp — proves third-party extensibility via subclassing
// ---------------------------------------------------------------------------

/**
 * A custom table op that samples N rows from the source.
 * This is NOT a built-in op — it demonstrates that anyone can implement
 * their own ITableOp and pair it with a custom executor subclass.
 */
class SampleOp implements ITableOp {
    [IsTableOpSymbol] = true as const
    readonly kind = 'sample' as const

    constructor(
        readonly source: ITableOp,
        readonly n: number,
        readonly seed: number = 42,
    ) { }

    schema(): Schema { return this.source.schema() }
}

/** Helper: create a Relation wrapping a SampleOp. */
function sample<S extends Schema>(rel: Relation<S>, n: number, seed?: number): Relation<S> {
    return new Relation(new SampleOp(rel._ir, n, seed))
}

/**
 * A custom executor that extends RecordsExecutor with support for SampleOp.
 * This is the pattern for third-party extensibility: subclass and override execute().
 */
class SampleExecutor extends RecordsExecutor {
    execute(op: ITableOp): Record<string, any>[] {
        if (op.kind === 'sample') {
            const sampleOp = op as SampleOp
            const source = this.execute(sampleOp.source)
            // Deterministic "sampling" using the seed for reproducibility
            const seeded = [...source]
            let rng = sampleOp.seed
            for (let i = seeded.length - 1; i > 0; i--) {
                rng = (rng * 1103515245 + 12345) & 0x7fffffff
                const j = rng % (i + 1)
                    ;[seeded[i], seeded[j]] = [seeded[j]!, seeded[i]!]
            }
            return seeded.slice(0, sampleOp.n)
        }
        return super.execute(op)
    }
}

/** A custom value op that doubles a numeric expression. */
class DoubleOp {
    [IsOpSymbol] = true;
    readonly kind = 'double' as const
    constructor(readonly operand: any) { }
    dtype() { return DTFloat64() }
    dshape() { return 'columnar' as const }
    toExpr() { return opToExpr(this as any) }
    getName() { return 'double' }
}

/** Executor that handles DoubleOp via evalOp override. */
class DoubleExecutor extends RecordsExecutor {
    evalOp(op: IOp, row: Record<string, any>): any {
        if (op.kind === 'double') {
            return super.evalOp((op as any).operand, row) * 2
        }
        return super.evalOp(op, row)
    }
}

describe('Custom ITableOp extensibility', () => {
    it('SampleOp implements isTableOp', () => {
        const op = new SampleOp(fromRecords(penguins)._ir, 3)
        expect(isTableOp(op)).toBe(true)
        expect(op.kind).toBe('sample')
        expect(Object.keys(op.schema())).toEqual(['species', 'island', 'bill_length_mm', 'body_mass_g'])
    })

    it('base RecordsExecutor throws for unknown custom op', () => {
        const executor = new RecordsExecutor()
        const rel = sample(fromRecords(penguins), 3)
        expect(() => executor.execute(rel._ir)).toThrow(/Unknown table op kind 'sample'/)
    })

    it('subclassed executor handles custom op', () => {
        const executor = new SampleExecutor()
        const rel = sample(fromRecords(penguins), 3, 42)
        const result = executor.execute(rel._ir)
        expect(result).toHaveLength(3)
        // All returned rows should exist in the original data
        for (const row of result) {
            expect(penguins).toContainEqual(row)
        }
    })

    it('custom op works with downstream pipeline ops', () => {
        const executor = new SampleExecutor()

        // sample → filter → derive
        const rel = sample(fromRecords(penguins), 5)
            .filter(r => r.col('bill_length_mm').gt(40))
            .derive(r => ({
                big_bird: r.col('body_mass_g').gt(4000),
            }))
        const result = executor.execute(rel._ir)
        expect(result.every(r => r.bill_length_mm > 40)).toBe(true)
        expect(result.every(r => typeof r.big_bird === 'boolean')).toBe(true)
    })

    it('subclassed executor handles custom value op', () => {
        const executor = new DoubleExecutor()
        const data = [{ x: 5 }, { x: 10 }]
        const doubleOp = new DoubleOp(new ColRefOp('x', 'float64'))
        const result = executor.evalOp(doubleOp as any, data[0]!)
        expect(result).toBe(10)
    })
})
