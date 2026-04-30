import { describe, expect, it } from 'vitest'
import { suggestColumnName } from '../src/utils/typo.js'

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

    it('returns undefined when candidates list is empty', () => {
        expect(suggestColumnName('species', [])).toBeUndefined()
    })

    it('returns undefined when input normalizes to empty string', () => {
        // All non-alphanumeric characters normalize away
        expect(suggestColumnName('___', columns)).toBeUndefined()
        expect(suggestColumnName('---', columns)).toBeUndefined()
    })

    it('returns the only candidate when it is close enough', () => {
        expect(suggestColumnName('islnd', ['island'])).toBe('island')
    })

    it('returns undefined when the only candidate is too far away', () => {
        expect(suggestColumnName('xyz', ['island'])).toBeUndefined()
    })

    it('returns exact match', () => {
        expect(suggestColumnName('species', columns)).toBe('species')
        expect(suggestColumnName('island', columns)).toBe('island')
    })

    it('prefers shorter candidate when distances are tied', () => {
        // 'ab' vs 'abc' — both 1 edit from 'ab', shorter wins
        expect(suggestColumnName('ab', ['abc', 'ab'])).toBe('ab')
    })
})
