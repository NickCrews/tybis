import { describe, it, expect } from 'vitest'
import { expectTypeOf } from 'expect-type'
import * as ty from '../src/index.js'

describe('TimeExpr', () => {
    describe('Type Safety', () => {
        it('toString() returns StringExpr', () => {
            const timeCol = ty.col('mytime', 'time')
            const strExpr = timeCol.toString('%H:%M:%S')
            expectTypeOf(strExpr).toMatchTypeOf<ty.IVExpr<{ typecode: 'string' }, 'columnar'>>()
        })
    })

    describe('Common operations', () => {
        const logs = ty.table('logs', {
            id: 'int32',
            mytime: 'time',
            mytime2: 'time',
            message: 'string',
        })

        it('eq() comparison constructs an op', () => {
            const e = logs.col('mytime').eq(logs.col('mytime2'))
            expect(e.dtype()).toEqual({ typecode: 'boolean' })
        })

        it('isNotNull() check constructs an op', () => {
            const e = logs.col('mytime').isNotNull()
            expect(e.dtype()).toEqual({ typecode: 'boolean' })
        })
    })
})
