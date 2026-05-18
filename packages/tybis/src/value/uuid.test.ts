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

    it('ty.col() with uuid produces a UUIDExpr', () => {
        const uuidCol = ty.col('id', "uuid")
        expect(uuidCol.dtype()).toEqual({ typecode: 'uuid', nullable: true })
        expect(uuidCol.dshape()).toBe('columnar')
        expectTypeOf(uuidCol).toMatchTypeOf<vals.UUIDExpr<'columnar'>>()
    })

    it('isNotNull() returns a boolean columnar expr', () => {
        const e = users.cols.id.isNotNull()
        expect(e.dtype()).toEqual({ typecode: 'boolean', nullable: true })
        expect(e.dshape()).toBe('columnar')
        expectTypeOf(e).toMatchTypeOf<ty.IVExpr<dt.DTBoolean, 'columnar'>>()
    })

    it('eq() across uuid columns returns a boolean expr', () => {
        const orders = ty.table('orders', {
            order_id: "uuid",
            user_id: "uuid",
        })
        const e = orders.cols.user_id.eq(orders.cols.order_id)
        expect(e.dtype()).toEqual({ typecode: 'boolean', nullable: true })
        expect(e.dshape()).toBe('columnar')
        expectTypeOf(e).toMatchTypeOf<ty.IVExpr<dt.DTBoolean, 'columnar'>>()
    })

    it('min/max aggregations preserve uuid type', () => {
        const q = users
            .groupBy(_r => ({ name: true }))
            .agg(r => ({
                min_id: r.id.min(),
                max_id: r.id.max(),
            }))
        expect(q.cols.min_id.dtype()).toEqual({ typecode: 'uuid', nullable: true })
        expect(q.cols.max_id.dtype()).toEqual({ typecode: 'uuid', nullable: true })
        expectTypeOf(q.cols.min_id).toMatchTypeOf<vals.UUIDExpr<"columnar">>()
        expectTypeOf(q.cols.max_id).toMatchTypeOf<vals.UUIDExpr<"columnar">>()
    })
})
