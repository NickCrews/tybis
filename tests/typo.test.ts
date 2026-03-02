import { describe, expect, it } from 'vitest'
import { suggestColumnName } from '../src/typo.js'

describe('suggestColumnName', () => {
    const columns = ['species', 'bill_length_mm', 'bill_depth_mm', 'island']

    it('suggests the nearest column for a small typo', () => {
        expect(suggestColumnName('spcies', columns)).toBe('species')
    })

    it('matches across underscores and casing', () => {
        expect(suggestColumnName('BillLengthMM', columns)).toBe('bill_length_mm')
    })

    it('returns undefined when no close match exists', () => {
        expect(suggestColumnName('totally_different_name', columns)).toBeUndefined()
    })
})
