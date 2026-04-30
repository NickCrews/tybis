import { describe, it, expect } from 'vitest'
import { expectTypeOf } from 'expect-type'
import * as ty from '../src/index.js'

describe('DateExpr', () => {
    describe('Type Safety', () => {
        it('should have date type', () => {
            const dateCol = ty.col('event_date', 'date')
            expectTypeOf(dateCol).toMatchTypeOf<ty.IVExpr<{ typecode: 'date' }, 'columnar'>>()
        })

        it('toString() returns StringExpr', () => {
            const dateCol = ty.col('event_date', 'date')
            const strExpr = dateCol.toString('%Y-%m-%d')
            expectTypeOf(strExpr).toMatchTypeOf<ty.IVExpr<{ typecode: 'string' }, 'columnar'>>()
        })
    })

    describe('Common operations', () => {
        const events = ty.table('events', {
            id: 'int32',
            event_date: 'date',
            description: 'string',
        })

        it('eq() comparison constructs an op', () => {
            const e = events.col('event_date').eq(events.col('event_date'))
            expect(e.dtype()).toEqual({ typecode: 'boolean' })
        })

        it('isNotNull() check constructs an op', () => {
            const e = events.col('event_date').isNotNull()
            expect(e.dtype()).toEqual({ typecode: 'boolean' })
        })
    })
})
