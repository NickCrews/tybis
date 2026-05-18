import { describe, it, expect } from 'vitest'
import { expectTypeOf } from 'expect-type'
import * as ty from '../index.js'

describe('DateTimeExpr', () => {
    const events = ty.table('events', {
        id: 'int32',
        event_datetime: 'datetime',
        description: 'string',
    })

    it('ty.col() with datetime produces a DateTimeExpr', () => {
        const datetimeCol = ty.col('event_datetime', 'datetime')
        expect(datetimeCol.dtype()).toEqual({ typecode: 'datetime', nullable: true })
        expect(datetimeCol.dshape()).toBe('columnar')
        expectTypeOf(datetimeCol).toMatchTypeOf<ty.IVExpr<{ typecode: 'datetime', nullable: boolean }, 'columnar'>>()
    })

    it('toString() returns a StringExpr', () => {
        const datetimeCol = ty.col('event_datetime', 'datetime')
        const strExpr = datetimeCol.toString('%Y-%m-%d')
        expect(strExpr.dtype()).toEqual({ typecode: 'string', nullable: true })
        expect(strExpr.dshape()).toBe('columnar')
        expectTypeOf(strExpr).toMatchTypeOf<ty.IVExpr<{ typecode: 'string', nullable: boolean }, 'columnar'>>()
    })

    it('eq() comparison constructs a boolean expr', () => {
        const e = events.cols.event_datetime.eq(events.cols.event_datetime)
        expect(e.dtype()).toEqual({ typecode: 'boolean', nullable: true })
        expect(e.dshape()).toBe('columnar')
        expectTypeOf(e).toMatchTypeOf<ty.IVExpr<{ typecode: 'boolean', nullable: boolean }, 'columnar'>>()
    })

    it('isNotNull() check constructs a boolean expr', () => {
        const e = events.cols.event_datetime.isNotNull()
        expect(e.dtype()).toEqual({ typecode: 'boolean', nullable: true })
        expect(e.dshape()).toBe('columnar')
        expectTypeOf(e).toMatchTypeOf<ty.IVExpr<{ typecode: 'boolean', nullable: boolean }, 'columnar'>>()
    })
})
