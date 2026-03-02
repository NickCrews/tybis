import { describe, it, expect } from 'vitest'
import { expectTypeOf } from 'expect-type'
import * as ty from '../src/index.js'

describe('DateExpr', () => {
    const events = ty.relation('events', {
        id: 'int32',
        event_date: 'date',
        description: 'string',
    } as const)

    describe('Type Safety', () => {
        it('should have date type', () => {
            const dateCol = ty.col('event_date', 'date')
            expectTypeOf(dateCol).toMatchTypeOf<ty.DateExpr>()
        })

        it('toString() returns StringExpr', () => {
            const dateCol = ty.col('event_date', 'date')
            const strExpr = dateCol.toString('%Y-%m-%d')
            expectTypeOf(strExpr).toMatchTypeOf<ty.StringExpr>()
        })
    })

    describe('toPrql()', () => {

        it('derive with toString', () => {
            const q = events.derive(r => ({
                formatted_date: r.col('event_date').toString('%Y-%m-%d'),
            }))
            expect(q.toPrql()).toMatchInlineSnapshot(`
              "from events
              derive {
                formatted_date = date.to_text "%Y-%m-%d" event_date
              }"
            `)
        })
    })

    describe('toSql()', () => {
        it('derive with toString', () => {
            const sql = events.derive(r => ({
                formatted_date: r.col('event_date').toString('%Y-%m-%d'),
            })).toSql()
            expect(sql).toMatchInlineSnapshot(`"SELECT *, strftime(event_date, '%Y-%m-%d') AS formatted_date FROM events"`)
        })
    })

    describe('Common operations', () => {
        it('eq() comparison', () => {
            const q = events.filter(r => r.col('event_date').eq(r.col('event_date')))
            expect(q.toPrql()).toMatchInlineSnapshot(`
              "from events
              filter event_date == event_date"
            `)
        })

        it('isNotNull() check', () => {
            const q = events.filter(r => r.col('event_date').isNotNull())
            expect(q.toPrql()).toMatchInlineSnapshot(`
              "from events
              filter event_date != null"
            `)
        })

        it('sort by date', () => {
            const q = events.sort(r => r.col('event_date').desc())
            expect(q.toPrql()).toMatchInlineSnapshot(`
              "from events
              sort {-event_date}"
            `)
        })
    })
})
