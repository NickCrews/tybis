import { describe, it, expect } from 'vitest'
import { expectTypeOf } from 'expect-type'
import * as ty from '../src/index.js'

describe('UUIDExpr', () => {
    const users = ty.relation('users', {
        id: 'uuid',
        name: 'string',
        email: 'string',
    } as const)

    describe('Type Safety', () => {
        it('should have uuid type', () => {
            const uuidCol = ty.col('id', 'uuid')
            expectTypeOf(uuidCol).toMatchTypeOf<ty.UUIDExpr<'columnar'>>()
        })
    })

    describe('toPrql()', () => {
        it('simple select with uuid column', () => {
            const q = users
            expect(q.toPrql()).toMatchInlineSnapshot(`"from users"`)
        })

        it('filter by uuid equality', () => {
            const q = users.filter(r => r.col('id').eq(r.col('id')))
            expect(q.toPrql()).toMatchInlineSnapshot(`
              "from users
              filter id == id"
            `)
        })

        it('filter by uuid isNotNull', () => {
            const q = users.filter(r => r.col('id').isNotNull())
            expect(q.toPrql()).toMatchInlineSnapshot(`
              "from users
              filter id != null"
            `)
        })

        it('sort by uuid', () => {
            const q = users.sort(r => r.col('id').asc())
            expect(q.toPrql()).toMatchInlineSnapshot(`
              "from users
              sort {id}"
            `)
        })

        it('group by uuid', () => {
            const q = users.group(
                r => [r.col('id')],
                g => g.agg({
                    count: ty.count(),
                })
            )
            expect(q.toPrql()).toMatchInlineSnapshot(`
              "from users
              group {id} (
                aggregate {
                  count = count this
                }
              )"
            `)
        })

        it('derive with uuid column', () => {
            const q = users.derive(r => ({
                user_id: r.col('id'),
            }))
            expect(q.toPrql()).toMatchInlineSnapshot(`
              "from users
              derive {
                user_id = id
              }"
            `)
        })
    })

    describe('toSql()', () => {
        it('simple select with uuid column', () => {
            const sql = users.toSql()
            expect(sql).toMatchInlineSnapshot(`"SELECT * FROM users"`)
        })

        it('filter by uuid equality', () => {
            const sql = users.filter(r => r.col('id').eq(r.col('id'))).toSql()
            expect(sql).toMatchInlineSnapshot(`"SELECT * FROM users WHERE id = id"`)
        })

        it('filter by uuid isNotNull', () => {
            const sql = users.filter(r => r.col('id').isNotNull()).toSql()
            expect(sql).toMatchInlineSnapshot(`"SELECT * FROM users WHERE id IS NOT NULL"`)
        })

        it('sort by uuid', () => {
            const sql = users.sort(r => r.col('id').asc()).toSql()
            expect(sql).toMatchInlineSnapshot(`"SELECT * FROM users ORDER BY id"`)
        })

        it('derive with uuid column', () => {
            const sql = users.derive(r => ({
                user_id: r.col('id'),
            })).toSql()
            expect(sql).toMatchInlineSnapshot(`"SELECT *, id AS user_id FROM users"`)
        })
    })

    describe('Common operations', () => {
        it('supports eq() comparison', () => {
            const anotherTable = ty.relation('orders', {
                order_id: 'uuid',
                user_id: 'uuid',
            } as const)

            const q = anotherTable.filter(r =>
                r.col('user_id').eq(r.col('order_id'))
            )
            expect(q.toPrql()).toMatchInlineSnapshot(`
              "from orders
              filter user_id == order_id"
            `)
        })

        it('supports isNotNull()', () => {
            const q = users.filter(r => r.col('id').isNotNull())
            expect(q.toPrql()).toMatchInlineSnapshot(`
              "from users
              filter id != null"
            `)
            expectTypeOf(q.col('id').isNotNull()).toMatchTypeOf<ty.BooleanExpr>()
        })

        it('can be used in aggregations', () => {
            const q = users.group(
                r => [r.col('id')],
                g => g.agg({
                    total: ty.count(),
                })
            )
            expect(q.toPrql()).toMatchInlineSnapshot(`
              "from users
              group {id} (
                aggregate {
                  total = count this
                }
              )"
            `)
        })

        it('supports min/max aggregations', () => {
            const q = users.group(
                r => [r.col('name')],
                g => g.agg({
                    min_id: g.col('id').min(),
                    max_id: g.col('id').max(),
                })
            )
            expect(q.toPrql()).toMatchInlineSnapshot(`
              "from users
              group {name} (
                aggregate {
                  min_id = min id,
                  max_id = max id
                }
              )"
            `)
            expectTypeOf(q.col('min_id')).toMatchTypeOf<ty.UUIDExpr<"columnar">>()
            expectTypeOf(q.col('max_id')).toMatchTypeOf<ty.UUIDExpr<"columnar">>()
        })
    })

    describe('Multiple UUID columns', () => {
        const relationships = ty.relation('relationships', {
            follower_id: 'uuid',
            following_id: 'uuid',
            created_at: 'date',
        } as const)

        it('filter with multiple uuid comparisons', () => {
            const q = relationships.filter(r =>
                r.col('follower_id').isNotNull()
                    .and(r.col('following_id').isNotNull())
            )
            expect(q.toPrql()).toMatchInlineSnapshot(`
              "from relationships
              filter (follower_id != null) && (following_id != null)"
            `)
        })

        it('group by multiple uuid columns', () => {
            const q = relationships.group(
                r => [r.col('follower_id'), r.col('following_id')],
                g => g.agg({
                    count: ty.count(),
                })
            )
            expect(q.toPrql()).toMatchInlineSnapshot(`
              "from relationships
              group {follower_id, following_id} (
                aggregate {
                  count = count this
                }
              )"
            `)
        })
    })
})
