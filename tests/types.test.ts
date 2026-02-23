import { describe, it, expect } from 'vitest'
import { expectTypeOf } from 'expect-type'
import * as ty from '../src/index.js'

describe('Type Safety', () => {
    it('should infer schema from const data', async () => {
        const data = [
            { species: "Adelie", year: 2007, length: 14.5 },
            { species: "Adelie", year: 2008, length: 15.5 },
        ] as const

        const penguins = await ty.duckdb.table(data)

        expectTypeOf(penguins).toMatchTypeOf<ty.Table<{
            species: 'string'
            year: 'number'
            length: 'number'
        }>>()
    })

    it('should track schema through group_by and agg', async () => {
        const data = [
            { species: "Adelie", year: 2007, length: 14.5 },
        ] as const

        const penguins = await ty.duckdb.table(data)
        const grouped = penguins
            .group_by(t => [t.col("species"), t.col("year")])
            .agg(t => ({
                count: ty.count(),
                mean_length: t.col("length").mean(),
            }))

        expectTypeOf(grouped).toMatchTypeOf<ty.Table<{
            species: 'string'
            year: 'number'
            count: 'number'
            mean_length: 'number'
        }>>()
    })
})
