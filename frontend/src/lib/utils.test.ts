import { describe, it, expect } from 'vitest';
import { cn } from './utils';

describe('cn()', () => {
  it('merges class strings', () => {
    expect(cn('px-4', 'py-2')).toBe('px-4 py-2');
  });

  it('ignores falsy values', () => {
    expect(cn('base', false && 'nope', undefined, null, 0 && 'zero')).toBe('base');
  });

  it('applies conditional classes when truthy', () => {
    expect(cn('base', true && 'active')).toBe('base active');
  });

  it('resolves Tailwind conflicts — last value wins', () => {
    expect(cn('px-4', 'px-8')).toBe('px-8');
  });

  it('resolves conflicting background colors', () => {
    expect(cn('bg-red-500', 'bg-blue-500')).toBe('bg-blue-500');
  });

  it('keeps non-conflicting classes', () => {
    expect(cn('px-4', 'py-2', 'text-sm')).toBe('px-4 py-2 text-sm');
  });

  it('handles array inputs via clsx', () => {
    expect(cn(['px-4', 'py-2'])).toBe('px-4 py-2');
  });

  it('handles object inputs via clsx', () => {
    expect(cn({ 'bg-red-500': true, 'bg-blue-500': false })).toBe('bg-red-500');
  });

  it('returns empty string for no inputs', () => {
    expect(cn()).toBe('');
  });
});
