import { defineConfig } from 'vitest/config'
import { sourceAliases } from '../examples/source-aliases.js'

export default defineConfig({
  resolve: {
    alias: sourceAliases,
  },
})
