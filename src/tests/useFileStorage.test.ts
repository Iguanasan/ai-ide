import { renderHook } from '@testing-library/react';
import useFileStorage from '../hooks/useFileStorage';
import { expect, describe, it } from 'vitest';  // Explicit for safety

describe('useFileStorage', () => {
  it('initializes with empty config', () => {
    const { result } = renderHook(() => useFileStorage());
    expect(result.current.systemConfig).toEqual({});
  });
});