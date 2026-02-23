import type { IRNode, TableNode, ColNode, AggFuncNode, GroupByNode, AggNode, OrderByNode } from '../ir.js'

export interface DuckDBJSON {
    error: boolean
    statements: Array<{
        node: Record<string, unknown>
        named_param_map: unknown[]
    }>
}

export function compileToDuckDB(node: IRNode): DuckDBJSON {
    const queryNode = compileNode(node)
    return {
        error: false,
        statements: [{
            node: queryNode,
            named_param_map: []
        }]
    }
}

function compileNode(node: IRNode): Record<string, unknown> {
    switch (node.op) {
        case 'table':
            return compileTable(node as TableNode)
        case 'col':
            return compileCol(node as ColNode)
        case 'agg_func':
            return compileAggFunc(node as AggFuncNode)
        case 'group_by':
            return compileGroupBy(node as GroupByNode)
        case 'aggregate':
            return compileAggregate(node as AggNode)
        case 'order_by':
            return compileOrderBy(node as OrderByNode)
        default:
            throw new Error(`Unknown IR operation: ${node.op}`)
    }
}

function compileTable(node: TableNode): Record<string, unknown> {
    return {
        type: 'SELECT_NODE',
        modifiers: [],
        cte_map: { map: [] },
        select_list: Object.keys(node.schema).map(col => ({
            class: 'COLUMN_REF',
            type: 'COLUMN_REF',
            alias: '',
            column_names: [col]
        })),
        from_table: {
            type: 'BASE_TABLE',
            alias: '',
            sample: null,
            schema_name: '',
            table_name: node.name,
            column_name_alias: [],
            catalog_name: ''
        },
        where_clause: null,
        group_expressions: [],
        group_sets: [],
        aggregate_handling: 'STANDARD_HANDLING',
        having: null,
        sample: null,
        qualify: null
    }
}

function compileCol(node: ColNode): Record<string, unknown> {
    return {
        class: 'COLUMN_REF',
        type: 'COLUMN_REF',
        column_names: [node.name]
    }
}

function compileAggFunc(node: AggFuncNode): Record<string, unknown> {
    const funcMap: Record<string, string> = {
        count: 'count_star',
        mean: 'avg',
        sum: 'sum',
        min: 'min',
        max: 'max'
    }

    const duckdbFunc = funcMap[node.func] || node.func

    if (node.func === 'count' && !node.arg) {
        return {
            class: 'FUNCTION',
            type: 'FUNCTION',
            function_name: 'count_star',
            children: [],
            distinct: false,
            is_operator: false
        }
    }

    return {
        class: 'FUNCTION',
        type: 'FUNCTION',
        function_name: duckdbFunc,
        children: node.arg ? [compileNode(node.arg)] : [],
        distinct: false,
        is_operator: false
    }
}

function compileGroupBy(node: GroupByNode): Record<string, unknown> {
    return {
        ...compileNode(node.table) as Record<string, unknown>,
        group_expressions: node.by.map(b => compileNode(b))
    }
}

function compileAggregate(node: AggNode): Record<string, unknown> {
    const baseQuery = compileNode(node.table) as any

    const selectList = []

    if (baseQuery.group_expressions && baseQuery.group_expressions.length > 0) {
        for (const groupExpr of baseQuery.group_expressions) {
            selectList.push(groupExpr)
        }
    }

    for (const [alias, aggExpr] of Object.entries(node.aggregates)) {
        const compiledAgg = compileNode(aggExpr)
        selectList.push({
            ...compiledAgg,
            alias
        })
    }

    return {
        ...baseQuery,
        select_list: selectList
    }
}

function compileOrderBy(node: OrderByNode): Record<string, unknown> {
    const baseQuery = compileNode(node.table) as any

    return {
        ...baseQuery,
        orderby: {
            type: 'ORDER_MODIFIER',
            orders: node.by.map((col, i) => ({
                type: node.ascending[i] ? 'ASCENDING' : 'DESCENDING',
                expression: compileNode(col)
            }))
        }
    }
}
