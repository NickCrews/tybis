import { describe, it, expect } from 'vitest'
import { expectTypeOf } from 'expect-type'
import * as ty from '../index.js'

describe('TimeExpr', () => {
    const logs = ty.table('logs', {
        id: 'int32',
        mytime: 'time',
        mytime2: 'time',
        message: 'string',
    })

    it('ty.col() with time produces a TimeExpr', () => {
        const timeCol = ty.col('mytime', 'time')
        expect(timeCol.dtype()).toEqual({ typecode: 'time' })
        expect(timeCol.dshape()).toBe('columnar')
        expectTypeOf(timeCol).toMatchTypeOf<ty.IVExpr<{ typecode: 'time' }, 'columnar'>>()
    })

    it('toString() returns a StringExpr', () => {
        const timeCol = ty.col('mytime', 'time')
        const strExpr = timeCol.toString('%H:%M:%S')
        expect(strExpr.dtype()).toEqual({ typecode: 'string' })
        expect(strExpr.dshape()).toBe('columnar')
        expectTypeOf(strExpr).toMatchTypeOf<ty.IVExpr<{ typecode: 'string' }, 'columnar'>>()
    })

    it('eq() comparison constructs a boolean expr', () => {
        const e = logs.col('mytime').eq(logs.col('mytime2'))
        expect(e.dtype()).toEqual({ typecode: 'boolean' })
        expect(e.dshape()).toBe('columnar')
        expectTypeOf(e).toMatchTypeOf<ty.IVExpr<{ typecode: 'boolean' }, 'columnar'>>()
    })

    it('isNotNull() check constructs a boolean expr', () => {
        const e = logs.col('mytime').isNotNull()
        expect(e.dtype()).toEqual({ typecode: 'boolean' })
        expect(e.dshape()).toBe('columnar')
        expectTypeOf(e).toMatchTypeOf<ty.IVExpr<{ typecode: 'boolean' }, 'columnar'>>()
    })
})
