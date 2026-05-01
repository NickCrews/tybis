import { highestDataShape, type HighestDataShape } from "./datashape";
import { describe, it, expect, expectTypeOf } from 'vitest'

describe('highestDataShape', () => {
    it('returns the only shape when one is provided', () => {
        expect(highestDataShape('scalar')).toBe('scalar')
        expect(highestDataShape('columnar')).toBe('columnar')
        expectTypeOf<HighestDataShape<['scalar']>>().toEqualTypeOf<'scalar'>()
        expectTypeOf<HighestDataShape<['columnar']>>().toEqualTypeOf<'columnar'>()
    })

    it('returns scalar only when all inputs are scalar', () => {
        expect(highestDataShape('scalar', 'scalar')).toBe('scalar')
        expectTypeOf<HighestDataShape<['scalar', 'scalar']>>().toEqualTypeOf<'scalar'>()
    })

    it('returns columnar when any input is columnar', () => {
        expect(highestDataShape('scalar', 'columnar')).toBe('columnar')
        expect(highestDataShape('columnar', 'columnar')).toBe('columnar')
        expectTypeOf<HighestDataShape<['scalar', 'columnar']>>().toEqualTypeOf<'columnar'>()
        expectTypeOf<HighestDataShape<['columnar', 'columnar']>>().toEqualTypeOf<'columnar'>()
    })

    it('errors when no shapes are provided', () => {
        // @ts-expect-error
        expect(() => highestDataShape()).toThrow()
        expectTypeOf<HighestDataShape<[]>>().toEqualTypeOf<never>()
    })
})
