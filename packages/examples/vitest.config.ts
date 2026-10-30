import { defineConfig } from 'vitest/config'
import { sourceAliases } from './source-aliases.js'

export default defineConfig({
    resolve: {
        alias: sourceAliases,
    },
})
