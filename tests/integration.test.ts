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
            .group_by(t => [t.col("species"), t.col("year")])
            .agg(t => ({
                count: ty.count(),
                mean_length: t.col("length").mean(),
            }))
            .order_by(t => t.col("mean_length"))

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
            expect(JSON.parse(json)).toMatchInlineSnapshot(`
              {
                "keys": [
                  {
                    "arg": {
                      "name": "mean_length",
                      "opcode": "col",
                      "type": "number",
                    },
                    "ascending": true,
                    "opcode": "order_by_key",
                  },
                ],
                "opcode": "order_by",
                "schema": {
                  "count": "number",
                  "mean_length": "number",
                  "species": "string",
                  "year": "number",
                },
                "table": {
                  "aggregates": {
                    "count": {
                      "func": "count",
                      "opcode": "agg_func",
                    },
                    "mean_length": {
                      "arg": {
                        "name": "length",
                        "opcode": "col",
                        "type": "number",
                      },
                      "func": "mean",
                      "opcode": "agg_func",
                    },
                  },
                  "opcode": "aggregate",
                  "schema": {
                    "count": "number",
                    "mean_length": "number",
                    "species": "string",
                    "year": "number",
                  },
                  "table": {
                    "by": [
                      {
                        "name": "species",
                        "opcode": "col",
                        "type": "string",
                      },
                      {
                        "name": "year",
                        "opcode": "col",
                        "type": "number",
                      },
                    ],
                    "opcode": "group_by",
                    "schema": {
                      "length": "number",
                      "species": "string",
                      "year": "number",
                    },
                    "table": {
                      "name": "__tybis_table_0",
                      "opcode": "table",
                      "schema": {
                        "length": "number",
                        "species": "string",
                        "year": "number",
                      },
                    },
                  },
                },
              }
            `)
        })
    })
})
