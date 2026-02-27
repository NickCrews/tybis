I want to pivot this whole project to use PRQL as the underlying compiler and the semantics. Please read https://github.com/PRQL/prql/issues/5699, and then overhaul the entire existing project to

- remove the the duckdb compiler for compiling to SQL. Instead, compile to SQL using the official PRQL javascript library.
- adjust the type system to follow PRQLs type system: https://prql-lang.org/book/reference/spec/type-system.html. implement string, int, float, boolean, date, datetime, and interval for now.
- Let's punt on working with actual data for now. We only will focus on generating proper SQL. So, you should just remove the duckdb backend and the depdency, we don't need it at all anymore.
- you should also remove the inferDataType and inferSchema code, we don't need that yet. We will only be working with already-defined datatypes and schemas.
- adjust the examples, tests, and implementation to follow the api that I show in the linked issue.
- I think that probably means we don't need the Op classes anymore or a lot of the internal machinery. I think we want to use the rq_to_sql() function from https://www.npmjs.com/package/prqlc. See rq.yaml for what I THINK is the sytax that the function expects, but you will need to verify.