import { describe, it, expect } from 'vitest'
import { expectTypeOf } from 'expect-type'
import * as ty from '../src/index.js'
import { UpperOp, LowerOp, ContainsOp, StartsWithOp, StringLiteralOp } from '../src/ops.js'

describe('String Operations', () => {
    const table = ty.relation('users', {
        name: 'string',
        email: 'string',
    } as const)

    describe('upper', () => {
        it('should generate correct PRQL for upper', () => {
            const q = table.derive(r => ({
                name_upper: r.col('name').upper()
            }))
            expect(q.toPrql()).toMatchInlineSnapshot(`
              "from users
              derive {
                name_upper = upper name
              }"
            `)
        })

        it('should preserve shape from operand', () => {
            const col = new ty.ColRefOp('name', 'string')
            const op = new UpperOp(col)
            expect(op.dshape).toBe('columnar')
            expect(op.dtype).toBe('string')
            expectTypeOf(op.dshape).toEqualTypeOf<'columnar'>()
        })

        it('should work with scalar strings', () => {
            const scalar = new ty.StringLiteralOp('hello')
            const op = new UpperOp(scalar)
            expect(op.dshape).toBe('scalar')
            expectTypeOf(op.dshape).toEqualTypeOf<'scalar'>()
        })
    })

    describe('lower', () => {
        it('should generate correct PRQL for lower', () => {
            const q = table.derive(r => ({
                name_lower: r.col('name').lower()
            }))
            expect(q.toPrql()).toMatchInlineSnapshot(`
              "from users
              derive {
                name_lower = lower name
              }"
            `)
        })

        it('should preserve shape from operand', () => {
            const col = new ty.ColRefOp('name', 'string')
            const op = new LowerOp(col)
            expect(op.dshape).toBe('columnar')
            expect(op.dtype).toBe('string')
        })
    })

    describe('contains', () => {
        it('should generate correct PRQL for contains', () => {
            const q = table.filter(r => r.col('email').contains('gmail'))
            expect(q.toPrql()).toMatchInlineSnapshot(`
              "from users
              filter contains email "gmail""
            `)
        })

        it('should have columnar shape when operand is columnar', () => {
            const col = new ty.ColRefOp('email', 'string')
            const pattern = new StringLiteralOp('gmail')
            const op = new ContainsOp(col, pattern)
            expect(op.dshape).toBe('columnar')
            expect(op.dtype).toBe('boolean')
            expectTypeOf(op.dshape).toEqualTypeOf<'columnar'>()
        })

        it('should have scalar shape when operand is scalar', () => {
            const str = new StringLiteralOp('hello@gmail.com')
            const pattern = new StringLiteralOp('gmail')
            const op = new ContainsOp(str, pattern)
            expect(op.dshape).toBe('scalar')
            expect(op.dtype).toBe('boolean')
            expectTypeOf(op.dshape).toEqualTypeOf<'scalar'>()
        })
    })

    describe('startsWith', () => {
        it('should generate correct PRQL for startsWith', () => {
            const q = table.filter(r => r.col('name').startsWith('Dr.'))
            expect(q.toPrql()).toMatchInlineSnapshot(`
              "from users
              filter starts_with name "Dr.""
            `)
        })

        it('should have columnar shape when operand is columnar', () => {
            const col = new ty.ColRefOp('name', 'string')
            const prefix = new StringLiteralOp('Dr.')
            const op = new StartsWithOp(col, prefix)
            expect(op.dshape).toBe('columnar')
            expect(op.dtype).toBe('boolean')
            expectTypeOf(op.dshape).toEqualTypeOf<'columnar'>()
        })

        it('should have scalar shape when operand is scalar', () => {
            const str = new StringLiteralOp('Dr. Smith')
            const prefix = new StringLiteralOp('Dr.')
            const op = new StartsWithOp(str, prefix)
            expect(op.dshape).toBe('scalar')
            expect(op.dtype).toBe('boolean')
            expectTypeOf(op.dshape).toEqualTypeOf<'scalar'>()
        })
    })

    describe('combined string operations', () => {
        it('should handle chained string operations', () => {
            const q = table.derive(r => ({
                normalized: r.col('name').lower().upper()
            }))
            expect(q.toPrql()).toMatchInlineSnapshot(`
              "from users
              derive {
                normalized = upper lower name
              }"
            `)
        })

        it('should handle string filtering with contains and startsWith', () => {
            const q = table.filter(r =>
                r.col('email').contains('gmail').and(
                    r.col('name').startsWith('A')
                )
            )
            expect(q.toPrql()).toMatchInlineSnapshot(`
              "from users
              filter (contains email "gmail") && (starts_with name "A")"
            `)
        })
    })
})
