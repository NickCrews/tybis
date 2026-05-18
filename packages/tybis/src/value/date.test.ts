import { describe, it, expect } from 'vitest'
import { expectTypeOf } from 'expect-type'
import * as ty from '../index.js'

describe('DateExpr', () => {
    const events = ty.table('events', {
        id: 'int32',
        event_date: 'date',
        description: 'string',
    })

    it('ty.col() with date produces a DateExpr', () => {
        const dateCol = ty.col('event_date', 'date')
        expect(dateCol.dtype()).toEqual({ typecode: 'date', nullable: true })
        expect(dateCol.dshape()).toBe('columnar')
        expectTypeOf(dateCol).toMatchTypeOf<ty.IVExpr<{ typecode: 'date', nullable: boolean }, 'columnar'>>()
    })

    it('toString() returns a StringExpr', () => {
        const dateCol = ty.col('event_date', 'date')
        const strExpr = dateCol.toString('%Y-%m-%d')
        expect(strExpr.dtype()).toEqual({ typecode: 'string', nullable: true })
        expect(strExpr.dshape()).toBe('columnar')
        expectTypeOf(strExpr).toMatchTypeOf<ty.IVExpr<{ typecode: 'string', nullable: boolean }, 'columnar'>>()
    })

    it('eq() comparison constructs a boolean expr', () => {
        const e = events.cols.event_date.eq(events.cols.event_date)
        expect(e.dtype()).toEqual({ typecode: 'boolean', nullable: true })
        expect(e.dshape()).toBe('columnar')
        expectTypeOf(e).toMatchTypeOf<ty.IVExpr<{ typecode: 'boolean', nullable: boolean }, 'columnar'>>()
    })

    it('isNotNull() check constructs a boolean expr', () => {
        const e = events.cols.event_date.isNotNull()
        expect(e.dtype()).toEqual({ typecode: 'boolean', nullable: true })
        expect(e.dshape()).toBe('columnar')
        expectTypeOf(e).toMatchTypeOf<ty.IVExpr<{ typecode: 'boolean', nullable: boolean }, 'columnar'>>()
    })
})
