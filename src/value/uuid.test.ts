import { describe, it, expect } from 'vitest'
import { expectTypeOf } from 'expect-type'
import * as ty from '../index.js'
import * as vals from './index.js'
import * as dt from '../datatype.js'

describe('UUIDExpr', () => {
    const users = ty.table('users', {
        id: "uuid",
        name: "string",
        email: "string",
    })

    describe('Type Safety', () => {
        it('should have uuid type', () => {
            const uuidCol = ty.col('id', "uuid")
            expectTypeOf(uuidCol).toMatchTypeOf<vals.UUIDExpr<'columnar'>>()
        })
    })

    describe('Common operations', () => {
        it('supports isNotNull()', () => {
            const e = users.col('id').isNotNull()
            expect(e.dtype()).toEqual({ typecode: 'boolean' })
            expectTypeOf(e).toMatchTypeOf<ty.IVExpr<dt.DTBoolean, 'columnar'>>()
        })

        it('supports eq() across uuid columns', () => {
            const orders = ty.table('orders', {
                order_id: "uuid",
                user_id: "uuid",
            })
            const e = orders.col('user_id').eq(orders.col('order_id'))
            expect(e.dtype()).toEqual({ typecode: 'boolean' })
        })

        it('supports min/max aggregations preserving uuid type', () => {
            const q = users.group(
                _r => ({ name: true }),
                g => g.agg({
                    min_id: g.col('id').min(),
                    max_id: g.col('id').max(),
                })
            )
            expectTypeOf(q.col('min_id')).toMatchTypeOf<vals.UUIDExpr<"columnar">>()
            expectTypeOf(q.col('max_id')).toMatchTypeOf<vals.UUIDExpr<"columnar">>()
        })
    })
})
