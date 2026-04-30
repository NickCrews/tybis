import { describe, it, expect } from 'vitest'
import { expectTypeOf } from 'expect-type'
import * as ty from '../src/index.js'

describe('TimeExpr', () => {
    const logs = ty.relation('logs', {
        id: 'int32',
        mytime: 'time',
        mytime2: 'time',
        message: 'string',
    })

    describe('Common operations', () => {
        it('eq() comparison', () => {
            const q = logs.filter(r => r.col('mytime').eq(r.col('mytime2')))
            expect(q.toPrql()).toMatchInlineSnapshot(`
              "from logs
              filter mytime == mytime2"
            `)
        })

        it('isNotNull() check', () => {
            const q = logs.filter(r => r.col('mytime').isNotNull())
            expect(q.toPrql()).toMatchInlineSnapshot(`
              "from logs
              filter mytime != null"
            `)
        })

        it('sort by time', () => {
            const q = logs.sort(r => r.col('mytime').asc())
            expect(q.toPrql()).toMatchInlineSnapshot(`
              "from logs
              sort {mytime}"
            `)
        })
    })

    describe('toString()', () => {
        it('returns StringExpr', () => {
            const timeCol = ty.col('mytime', 'time')
            const strExpr = timeCol.toString('%H:%M:%S')
            expectTypeOf(strExpr).toMatchTypeOf<ty.IVExpr<{ typecode: 'string' }, 'columnar'>>()
        })
    })

    describe('toPrql()', () => {
        it('derive with toString', () => {
            const q = logs.derive(r => ({
                formatted_time: r.col('mytime').toString('%H:%M:%S'),
            }))
            expect(q.toPrql()).toMatchInlineSnapshot(`
              "from logs
              derive {
                formatted_time = date.to_text "%H:%M:%S" mytime
              }"
            `)
        })
    })

    describe('toSql()', () => {
        it('derive with toString', () => {
            const sql = logs.derive(r => ({
                formatted_time: r.col('mytime').toString('%H:%M:%S'),
            })).toSql()
            expect(sql).toMatchInlineSnapshot(`"SELECT *, strftime(mytime, '%H:%M:%S') AS formatted_time FROM logs"`)
        })
    })
})
