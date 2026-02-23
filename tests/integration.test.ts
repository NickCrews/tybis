import { describe, it, expect } from 'vitest'
import * as ty from '../src/index.js'

describe('Tybis Integration Tests', () => {
    describe('README Example', async () => {
        const data = [
            { species: "Adelie", year: 2007, length: 14.5 },
            { species: "Adelie", year: 2007, length: 15.5 },
            { species: "Adelie", year: 2008, length: 16.1 },
            { species: "Gentoo", year: 2009, length: 11.5 },
        ] as const

        const penguins = await ty.duckdb.table(data)
        const grouped = penguins
            .group_by(ty.col("species"), ty.col("year"))
            .agg({
                count: ty.count(),
                mean_length: ty.col("length").mean(),
            })
            .order_by(ty.col("mean_length"))

        it('should execute to_records()', async () => {
            const expected = [
                { species: "Gentoo", year: 2009, count: 1, mean_length: 11.5 },
                { species: "Adelie", year: 2007, count: 2, mean_length: 15.0 },
                { species: "Adelie", year: 2008, count: 1, mean_length: 16.1 },
            ]
            const records = await grouped.to_records()
            expect(records).toEqual(expected)
        })
        it('should execute to_sql()', async () => {
            const sql = await grouped.to_sql()
            expect(sql).toMatchInlineSnapshot(`"SELECT "species", "year", COUNT(*) AS "count", AVG("length") AS "mean_length" FROM __tybis_table_0 GROUP BY "species", "year" ORDER BY "mean_length" ASC;"`)
        })
        it('should serialize to JSON IR', async () => {
            const json = grouped.to_json()
            expect(json).toBeTruthy()
            expect(JSON.parse(json)).toHaveProperty('op')
        })
    })
})
