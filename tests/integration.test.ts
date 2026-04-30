import { describe, it, expect } from 'vitest'
import * as ty from '../src/index.js'

describe('Tybis Integration Tests', () => {
    const penguins = ty.table('penguins', {
        species: 'string',
        year: 'int32',
        bill_length_mm: 'float64',
    })

    describe('select()', () => {
        it('throws an error if no arguments are provided', () => {
            // @ts-expect-error
            expect(() => penguins.select()).toThrowError(
                "select() requires a callback returning an object map of columns"
            )
        })

        it('throws an error if the selection is empty', () => {
            expect(() => penguins.select(() => ({}))).toThrowError(
                "select() requires at least one expression"
            )
        })

        it('throws an error if shorthand is used for a missing column', () => {
            expect(() => penguins.select(_r => ({
                // @ts-expect-error
                missing: true
            }))).toThrowError("Cannot select 'missing': column does not exist.")
        })
    })

    describe('expression tree', () => {
        it('expressions are abstract nodes, not strings', () => {
            const q = penguins.filter(r => r.col('bill_length_mm').gt(40))
            // The IR stores expression objects, not strings
            const op = q._op
            expect(op.kind).toBe('filter')
            // It infers the type of op as a FilterOp just based on how we called .filter()
            expect(op.condition.kind).toBe('gt')
        })
    })
})
