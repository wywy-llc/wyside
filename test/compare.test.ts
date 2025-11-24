import { describe, expect, it } from 'vitest';
import { compare } from '../src/compare';

describe('compare', () => {
  it('calculates the set differences of both input sets', () => {
    const comparison = compare([1, 2, 3, 4], [0, 1, 2, 3]);
    expect(comparison.left).toEqual([4]);
    expect(comparison.right).toEqual([0]);
  });
  it('calculates the set intersection', () => {
    const comparison = compare([1, 2, 3, 4], [0, 1, 2, 3]);
    expect(comparison.both).toEqual([1, 2, 3]);
  });
  it('provides the set union list of items with their set memberships', () => {
    const comparison = compare(['abc', 'def'], ['def', 'ghi']);
    expect(comparison.entries).toContainEqual({
      element: 'abc',
      left: true,
      right: false,
    });
    expect(comparison.entries).toContainEqual({
      element: 'def',
      left: true,
      right: true,
    });
    expect(comparison.entries).toContainEqual({
      element: 'ghi',
      left: false,
      right: true,
    });
  });
});
