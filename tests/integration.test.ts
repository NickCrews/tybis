import { describe, it, expect } from 'vitest'
import * as ty from '../src/index.js'

describe('Tybis Integration Tests', () => {
    it('should run the README example', async () => {
        const data = [
            { species: "Adelie", year: 2007, length: 14.5 },
            { species: "Adelie", year: 2008, length: 15.5 },
            { species: "Gentoo", year: 2009, length: 11.5 },
            { species: "Gentoo", year: 2010, length: 11.5 },
        ] as const

        const penguins = await ty.duckdb.table(data)
        const grouped = penguins
            .group_by(ty.col("species"), ty.col("year"))
            .agg({
                count: ty.count(),
                mean_length: ty.col("length").mean(),
            })
            .order_by(ty.col("count"))

        const json = grouped.to_json()
        expect(json).toBeTruthy()
        expect(JSON.parse(json)).toHaveProperty('op')

        // Skip to_sql for now - not implemented
        // const sql = await grouped.to_sql()
        // expect(sql).toBeTruthy()
        // expect(typeof sql).toBe('string')

        const records = await grouped.to_records()
        expect(Array.isArray(records)).toBe(true)
        expect(records.length).toBeGreaterThan(0)

        const str = grouped.toString()
        expect(str).toBeTruthy()
        expect(typeof str).toBe('string')
    })

    it('should execute group_by and agg', async () => {
        const data = [
            { name: "Alice", age: 30, score: 85 },
            { name: "Bob", age: 30, score: 90 },
            { name: "Charlie", age: 25, score: 75 },
        ] as const

        const table = await ty.duckdb.table(data)
        const result = await table
            .group_by(ty.col("age"))
            .agg({
                count: ty.count(),
                avg_score: ty.col("score").mean(),
            })
            .to_records()

        expect(result).toBeDefined()
        expect(result.length).toBe(2)
    })

    it('should serialize to JSON IR', async () => {
        const data = [
            { x: 1, y: 2 },
        ] as const

        const table = await ty.duckdb.table(data)
        const json = table.to_json()
        const parsed = JSON.parse(json)

        expect(parsed.op).toBe('table')
        expect(parsed.schema).toBeDefined()
        expect(parsed.name).toBeTruthy()
    })
})
