/**
 * TDD Example: useCounter Hook
 * 
 * This example demonstrates the Red-Green-Refactor cycle for building a custom hook.
 * Each step is documented with comments showing the TDD workflow.
 */

import { renderHook, act } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { useState, useCallback } from 'react';

// ============================================================================
// STEP 1: RED - Write failing test for initial state
// ============================================================================
describe('useCounter (TDD Example)', () => {
  it('should start with count 0', () => {
    const { result } = renderHook(() => useCounter());
    expect(result.current.count).toBe(0);
    // ❌ This fails - useCounter doesn't exist yet
  });

  // ============================================================================
  // STEP 2: GREEN - Minimal implementation to pass
  // ============================================================================
  // Uncomment the implementation below to make the test pass
  
  // ============================================================================
  // STEP 3: RED - Add increment test
  // ============================================================================
  it('should increment count', () => {
    const { result } = renderHook(() => useCounter());
    
    act(() => {
      result.current.increment();
    });
    
    expect(result.current.count).toBe(1);
    // ❌ This fails - increment doesn't exist yet
  });

  // ============================================================================
  // STEP 4: GREEN - Implement increment
  // ============================================================================
  // Update implementation to add increment function

  // ============================================================================
  // STEP 5: RED - Add decrement test
  // ============================================================================
  it('should decrement count', () => {
    const { result } = renderHook(() => useCounter(5));
    
    act(() => {
      result.current.decrement();
    });
    
    expect(result.current.count).toBe(4);
    // ❌ This fails - decrement doesn't exist yet
  });

  // ============================================================================
  // STEP 6: GREEN - Implement decrement
  // ============================================================================

  // ============================================================================
  // STEP 7: RED - Add reset test
  // ============================================================================
  it('should reset to initial value', () => {
    const { result } = renderHook(() => useCounter(5));
    
    act(() => {
      result.current.increment();
      result.current.increment();
      result.current.reset();
    });
    
    expect(result.current.count).toBe(5);
    // ❌ This fails - reset doesn't exist yet
  });

  // ============================================================================
  // STEP 8: GREEN - Implement reset
  // ============================================================================

  // ============================================================================
  // STEP 9: REFACTOR - Improve implementation
  // ============================================================================
  it('should accept initial value', () => {
    const { result } = renderHook(() => useCounter(10));
    expect(result.current.count).toBe(10);
  });

  it('should memoize functions', () => {
    const { result, rerender } = renderHook(() => useCounter());
    
    const increment = result.current.increment;
    const decrement = result.current.decrement;
    const reset = result.current.reset;
    
    // Change count
    act(() => result.current.increment());
    
    // Re-render
    rerender();
    
    // Functions should be the same reference
    expect(result.current.increment).toBe(increment);
    expect(result.current.decrement).toBe(decrement);
    expect(result.current.reset).toBe(reset);
  });
});

// ============================================================================
// FINAL IMPLEMENTATION (after all TDD steps)
// ============================================================================

interface UseCounterReturn {
  count: number;
  increment: () => void;
  decrement: () => void;
  reset: () => void;
}

export const useCounter = (initialValue = 0): UseCounterReturn => {
  const [count, setCount] = useState(initialValue);
  
  const increment = useCallback(() => {
    setCount(c => c + 1);
  }, []);
  
  const decrement = useCallback(() => {
    setCount(c => c - 1);
  }, []);
  
  const reset = useCallback(() => {
    setCount(initialValue);
  }, [initialValue]);
  
  return { count, increment, decrement, reset };
};

// ============================================================================
// KEY TAKEAWAYS
// ============================================================================
// 1. Write one failing test at a time
// 2. Write minimal code to make it pass
// 3. Refactor after green (improve code quality)
// 4. Each test has one reason to fail
// 5. Tests drive the API design

