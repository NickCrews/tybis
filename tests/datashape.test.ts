import { highestDataShape, type HighestDataShape } from "../src/datashape";
import { describe, it, expect, expectTypeOf } from 'vitest'

describe('highestDataShape() function', () => {
    it('should return the highest data shape', () => {
        expect(highestDataShape('scalar')).toBe('scalar')
        expect(highestDataShape('columnar')).toBe('columnar')
        expect(highestDataShape('scalar', 'scalar')).toBe('scalar')
        expect(highestDataShape('scalar', 'columnar')).toBe('columnar')
        expect(highestDataShape('columnar', 'columnar')).toBe('columnar')
    })
    it('should error if no shapes are provided', () => {
        // @ts-expect-error
        expect(() => highestDataShape()).toThrow()
    })
})

describe('HighestDataShape type', () => {
    it('should return the highest data shape type', () => {
        expectTypeOf<HighestDataShape<[]>>().toEqualTypeOf<never>()
        expectTypeOf<HighestDataShape<['scalar']>>().toEqualTypeOf<'scalar'>()
        expectTypeOf<HighestDataShape<['columnar']>>().toEqualTypeOf<'columnar'>()
        expectTypeOf<HighestDataShape<['scalar', 'scalar']>>().toEqualTypeOf<'scalar'>()
        expectTypeOf<HighestDataShape<['scalar', 'columnar']>>().toEqualTypeOf<'columnar'>()
        expectTypeOf<HighestDataShape<['columnar', 'columnar']>>().toEqualTypeOf<'columnar'>()
    })
})
