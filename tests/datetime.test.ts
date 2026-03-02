import { describe, it, expect } from 'vitest'
import { expectTypeOf } from 'expect-type'
import * as ty from '../src/index.js'

describe('DateExpr', () => {
    const events = ty.relation('events', {
        id: 'int32',
        event_datetime: 'datetime',
        description: 'string',
    } as const)

    describe('Type Safety', () => {
        it('should have datetime type', () => {
            const datetimeCol = ty.col('event_datetime', 'datetime')
            expectTypeOf(datetimeCol).toMatchTypeOf<ty.DateTimeExpr>()
        })

        it('toString() returns StringExpr', () => {
            const datetimeCol = ty.col('event_datetime', 'datetime')
            const strExpr = datetimeCol.toString('%Y-%m-%d')
            expectTypeOf(strExpr).toMatchTypeOf<ty.StringExpr>()
        })
    })

    describe('toPrql()', () => {

        it('derive with toString', () => {
            const q = events.derive(r => ({
                formatted_date: r.col('event_datetime').toString('%Y-%m-%d'),
            }))
            expect(q.toPrql()).toMatchInlineSnapshot(`
              "from events
              derive {
                formatted_date = date.to_text "%Y-%m-%d" event_datetime
              }"
            `)
        })
    })

    describe('toSql()', () => {
        it('derive with toString', () => {
            const sql = events.derive(r => ({
                formatted_date: r.col('event_datetime').toString('%Y-%m-%d'),
            })).toSql()
            expect(sql).toMatchInlineSnapshot(`"SELECT *, strftime(event_datetime, '%Y-%m-%d') AS formatted_date FROM events"`)
        })
    })

    describe('Common operations', () => {
        it('eq() comparison', () => {
            const q = events.filter(r => r.col('event_datetime').eq(r.col('event_datetime')))
            expect(q.toPrql()).toMatchInlineSnapshot(`
              "from events
              filter event_datetime == event_datetime"
            `)
        })

        it('isNotNull() check', () => {
            const q = events.filter(r => r.col('event_datetime').isNotNull())
            expect(q.toPrql()).toMatchInlineSnapshot(`
              "from events
              filter event_datetime != null"
            `)
        })

        it('sort by date', () => {
            const q = events.sort(r => r.col('event_datetime').desc())
            expect(q.toPrql()).toMatchInlineSnapshot(`
              "from events
              sort {-event_datetime}"
            `)
        })
    })
})
