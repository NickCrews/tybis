import { fileURLToPath } from 'node:url'

const source = (path: string) => fileURLToPath(new URL(`../${path}`, import.meta.url))

/**
 * Vitest aliases that resolve the workspace packages to source, so tests run
 * against the current code instead of whatever was last built into dist.
 */
export const sourceAliases = [
  { find: /^tybis$/, replacement: source('tybis/src/index.ts') },
  { find: /^tybis-sql-compiler$/, replacement: source('sql-compiler/src/index.ts') },
  { find: /^tybis-sql-compiler\/ops$/, replacement: source('sql-compiler/src/ops.ts') },
  { find: /^tybis-prql-compiler$/, replacement: source('prql-compiler/src/index.ts') },
]
