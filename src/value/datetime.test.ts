import { describe, it, expect } from 'vitest'
import { expectTypeOf } from 'expect-type'
import * as ty from '../index.js'

describe('DateTimeExpr', () => {
    describe('Type Safety', () => {
        it('should have datetime type', () => {
            const datetimeCol = ty.col('event_datetime', 'datetime')
            expectTypeOf(datetimeCol).toMatchTypeOf<ty.IVExpr<{ typecode: 'datetime' }, 'columnar'>>()
        })

        it('toString() returns StringExpr', () => {
            const datetimeCol = ty.col('event_datetime', 'datetime')
            const strExpr = datetimeCol.toString('%Y-%m-%d')
            expectTypeOf(strExpr).toMatchTypeOf<ty.IVExpr<{ typecode: 'string' }, 'columnar'>>()
        })
    })

    describe('Common operations', () => {
        const events = ty.table('events', {
            id: 'int32',
            event_datetime: 'datetime',
            description: 'string',
        })

        it('eq() comparison constructs an op', () => {
            const e = events.col('event_datetime').eq(events.col('event_datetime'))
            expect(e.dtype()).toEqual({ typecode: 'boolean' })
        })

        it('isNotNull() check constructs an op', () => {
            const e = events.col('event_datetime').isNotNull()
            expect(e.dtype()).toEqual({ typecode: 'boolean' })
        })
    })
})
