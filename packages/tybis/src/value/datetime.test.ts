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
        expect(datetimeCol.dtype()).toEqual({ typecode: 'datetime' })
        expect(datetimeCol.dshape()).toBe('columnar')
        expectTypeOf(datetimeCol).toMatchTypeOf<ty.IVExpr<{ typecode: 'datetime' }, 'columnar'>>()
    })

    it('toString() returns a StringExpr', () => {
        const datetimeCol = ty.col('event_datetime', 'datetime')
        const strExpr = datetimeCol.toString('%Y-%m-%d')
        expect(strExpr.dtype()).toEqual({ typecode: 'string' })
        expect(strExpr.dshape()).toBe('columnar')
        expectTypeOf(strExpr).toMatchTypeOf<ty.IVExpr<{ typecode: 'string' }, 'columnar'>>()
    })

    it('eq() comparison constructs a boolean expr', () => {
        const e = events.col('event_datetime').eq(events.col('event_datetime'))
        expect(e.dtype()).toEqual({ typecode: 'boolean' })
        expect(e.dshape()).toBe('columnar')
        expectTypeOf(e).toMatchTypeOf<ty.IVExpr<{ typecode: 'boolean' }, 'columnar'>>()
    })

    it('isNotNull() check constructs a boolean expr', () => {
        const e = events.col('event_datetime').isNotNull()
        expect(e.dtype()).toEqual({ typecode: 'boolean' })
        expect(e.dshape()).toBe('columnar')
        expectTypeOf(e).toMatchTypeOf<ty.IVExpr<{ typecode: 'boolean' }, 'columnar'>>()
    })
})
