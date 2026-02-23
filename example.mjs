import * as ty from './dist/index.js'

const data = [
    {species: "Adelie", year: 2007, length: 14.5},
    {species: "Adelie", year: 2008, length: 15.5},
    {species: "Gentoo", year: 2009, length: 11.5},
    {species: "Gentoo", year: 2020, length: 11.5},
]

const penguins = await ty.duckdb.table(data)
const grouped = penguins.group_by(
        ty.col("species"),
        ty.col("year"),
    ).agg({
        count: ty.count(),
        mean_length: ty.col("length").mean(),
    }).order_by(ty.col("count"))

console.log(grouped)  // Human readable expression string format, does not execute.
console.log('\n--- JSON IR ---')
console.log(grouped.to_json()) // {"op": "select", "order_by": {"op": "col", "col": "count"}, ...}
console.log('\n--- Records ---')
console.log(await grouped.to_records()) // [{"species": ...}, {...}, ...]
