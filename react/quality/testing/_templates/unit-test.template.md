# Unit Test Template

Use this template as a starting point for writing unit tests.

## Checklist

- [ ] Test file is colocated with source file
- [ ] File name follows convention: `*.test.tsx` or `*.test.ts`
- [ ] Each test has one reason to fail
- [ ] Tests use Testing Library queries (getByRole, getByLabel)
- [ ] No hardcoded values (use factories)
- [ ] Async tests use proper waiting strategies
- [ ] Mocks are properly typed
- [ ] No testing implementation details

## Template Code

```tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ComponentName } from './ComponentName';

describe('ComponentName', () => {
  // Setup
  beforeEach(() => {
    // Reset mocks, clear state, etc.
  });

  // ============================================================================
  // RENDERING TESTS
  // ============================================================================
  
  it('should render with default props', () => {
    render(<ComponentName />);
    expect(screen.getByRole('...', { name: '...' })).toBeInTheDocument();
  });

  it('should render with custom props', () => {
    render(<ComponentName prop="value" />);
    expect(screen.getByText('value')).toBeInTheDocument();
  });

  // ============================================================================
  // INTERACTION TESTS
  // ============================================================================
  
  it('should call onClick when clicked', async () => {
    const user = userEvent.setup();
    const handleClick = vi.fn();
    
    render(<ComponentName onClick={handleClick} />);
    await user.click(screen.getByRole('button'));
    
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  // ============================================================================
  // STATE TESTS
  // ============================================================================
  
  it('should update state on interaction', async () => {
    const user = userEvent.setup();
    
    render(<ComponentName />);
    await user.type(screen.getByRole('textbox'), 'test');
    
    expect(screen.getByRole('textbox')).toHaveValue('test');
  });

  // ============================================================================
  // CONDITIONAL RENDERING TESTS
  // ============================================================================
  
  it('should render loading state', () => {
    render(<ComponentName loading />);
    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });

  it('should render error state', () => {
    render(<ComponentName error="Error message" />);
    expect(screen.getByText('Error message')).toBeInTheDocument();
  });

  // ============================================================================
  // ACCESSIBILITY TESTS
  // ============================================================================
  
  it('should be keyboard accessible', async () => {
    const user = userEvent.setup();
    
    render(<ComponentName />);
    
    await user.tab();
    expect(screen.getByRole('button')).toHaveFocus();
    
    await user.keyboard('{Enter}');
    // Assert expected behavior
  });

  it('should have proper ARIA attributes', () => {
    render(<ComponentName aria-label="Custom label" />);
    expect(screen.getByLabelText('Custom label')).toBeInTheDocument();
  });
});
```

## Hook Testing Template

```ts
import { renderHook, act, waitFor } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { useCustomHook } from './useCustomHook';

describe('useCustomHook', () => {
  it('should return initial value', () => {
    const { result } = renderHook(() => useCustomHook());
    expect(result.current.value).toBe(initialValue);
  });

  it('should update value', () => {
    const { result } = renderHook(() => useCustomHook());
    
    act(() => {
      result.current.setValue(newValue);
    });
    
    expect(result.current.value).toBe(newValue);
  });

  it('should handle async operations', async () => {
    const { result } = renderHook(() => useCustomHook());
    
    act(() => {
      result.current.fetchData();
    });
    
    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });
    
    expect(result.current.data).toEqual(expectedData);
  });
});
```

## Pure Function Testing Template

```ts
import { describe, it, expect } from 'vitest';
import { utilityFunction } from './utilityFunction';

describe('utilityFunction', () => {
  it('should handle normal case', () => {
    const result = utilityFunction(input);
    expect(result).toEqual(expectedOutput);
  });

  it('should handle edge case: empty input', () => {
    const result = utilityFunction('');
    expect(result).toEqual(emptyResult);
  });

  it('should handle edge case: null', () => {
    const result = utilityFunction(null);
    expect(result).toEqual(nullResult);
  });

  it('should handle edge case: undefined', () => {
    const result = utilityFunction(undefined);
    expect(result).toEqual(undefinedResult);
  });

  it('should throw error for invalid input', () => {
    expect(() => utilityFunction(invalidInput)).toThrow('Error message');
  });
});
```

## Anti-Patterns to Avoid

```tsx
// ❌ Testing implementation details
expect(component.state.count).toBe(1);

// ✅ Testing behavior
expect(screen.getByText('Count: 1')).toBeInTheDocument();

// ❌ Multiple assertions per test
it('should work', () => {
  expect(a).toBe(1);
  expect(b).toBe(2);
  expect(c).toBe(3);
});

// ✅ One assertion per test
it('should set a to 1', () => {
  expect(a).toBe(1);
});

// ❌ Arbitrary timeouts
await new Promise(resolve => setTimeout(resolve, 1000));

// ✅ Proper waiting
await waitFor(() => {
  expect(screen.getByText('Data')).toBeInTheDocument();
});
```

