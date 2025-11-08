# TDD Handbook — Testing

**Goal:** Red/green/refactor cookbook with "one reason to fail" rule and test-first workflow for React 19 + TypeScript.

---

## The TDD Cycle

### Red → Green → Refactor

**1. Red (Write a failing test)**
```ts
// Start with the simplest failing test
describe('useCounter', () => {
  it('should start with count 0', () => {
    const { result } = renderHook(() => useCounter());
    expect(result.current.count).toBe(0); // ❌ This will fail - hook doesn't exist yet
  });
});
```

**2. Green (Make it pass with minimal code)**
```ts
// Write the minimal code to make the test pass
export const useCounter = () => {
  return { count: 0 };
};
```

**3. Refactor (Improve while keeping tests green)**
```ts
// Improve the implementation while keeping tests passing
export const useCounter = () => {
  const [count, setCount] = useState(0);
  return { count };
};
```

---

## "One Reason to Fail" Rule

Each test should have exactly one reason to fail. If a test fails, you should know immediately what's wrong.

### ✅ Good: One Reason to Fail
```ts
describe('formatCurrency', () => {
  it('should format USD with dollar sign', () => {
    expect(formatCurrency(100, 'USD')).toBe('$100.00');
  });

  it('should format EUR with euro sign', () => {
    expect(formatCurrency(100, 'EUR')).toBe('€100.00');
  });

  it('should handle zero amount', () => {
    expect(formatCurrency(0, 'USD')).toBe('$0.00');
  });
});
```

### ❌ Bad: Multiple Reasons to Fail
```ts
describe('formatCurrency', () => {
  it('should format currency correctly', () => {
    expect(formatCurrency(100, 'USD')).toBe('$100.00');
    expect(formatCurrency(100, 'EUR')).toBe('€100.00');
    expect(formatCurrency(0, 'USD')).toBe('$0.00');
    // If this fails, which assertion failed? What's the problem?
  });
});
```

---

## Test-First Checklist

Before writing any production code, ask:

### ✅ Requirements Checklist
- [ ] What is the expected behavior?
- [ ] What are the input parameters?
- [ ] What should be returned?
- [ ] What edge cases exist?
- [ ] What error conditions are possible?

### ✅ Test Design Checklist
- [ ] Test has one reason to fail
- [ ] Test name describes the behavior being tested
- [ ] Test is independent (no shared state)
- [ ] Test is deterministic (same result every time)
- [ ] Test is fast (< 100ms for unit tests)

### ✅ Implementation Checklist
- [ ] Write the minimal code to pass
- [ ] No production code without a failing test first
- [ ] Refactor after green (improve without changing behavior)
- [ ] Delete code you didn't earn with tests

---

## TDD Workflow Examples

### Example 1: Custom Hook (useCounter)

**Step 1: Red - Write failing test**
```ts
// useCounter.test.ts
import { renderHook, act } from '@testing-library/react';
import { useCounter } from './useCounter';

describe('useCounter', () => {
  it('should start with count 0', () => {
    const { result } = renderHook(() => useCounter());
    expect(result.current.count).toBe(0); // ❌ Fails - hook doesn't exist
  });
});
```

**Step 2: Green - Minimal implementation**
```ts
// useCounter.ts
export const useCounter = () => {
  return { count: 0 };
};
```

**Step 3: Red - Add increment test**
```ts
it('should increment count', () => {
  const { result } = renderHook(() => useCounter());
  act(() => result.current.increment());
  expect(result.current.count).toBe(1); // ❌ Fails - increment doesn't exist
});
```

**Step 4: Green - Add increment**
```ts
import { useState } from 'react';

export const useCounter = () => {
  const [count, setCount] = useState(0);
  
  const increment = () => setCount(c => c + 1);
  
  return { count, increment };
};
```

**Step 5: Refactor - Improve implementation**
```ts
import { useState, useCallback } from 'react';

export const useCounter = (initialValue = 0) => {
  const [count, setCount] = useState(initialValue);
  
  const increment = useCallback(() => setCount(c => c + 1), []);
  const decrement = useCallback(() => setCount(c => c - 1), []);
  const reset = useCallback(() => setCount(initialValue), [initialValue]);
  
  return { count, increment, decrement, reset };
};
```

### Example 2: Component (Button)

**Step 1: Red - Write failing test**
```tsx
// Button.test.tsx
import { render, screen } from '@testing-library/react';
import { Button } from './Button';

describe('Button', () => {
  it('should render button with text', () => {
    render(<Button>Click me</Button>);
    expect(screen.getByRole('button', { name: 'Click me' })).toBeInTheDocument(); // ❌ Fails - component doesn't exist
  });
});
```

**Step 2: Green - Minimal implementation**
```tsx
// Button.tsx
export const Button = ({ children }: { children: React.ReactNode }) => {
  return <button>{children}</button>;
};
```

**Step 3: Red - Add click handler test**
```tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

it('should call onClick when clicked', async () => {
  const handleClick = vi.fn();
  const user = userEvent.setup();
  
  render(<Button onClick={handleClick}>Click me</Button>);
  await user.click(screen.getByRole('button'));
  
  expect(handleClick).toHaveBeenCalledTimes(1); // ❌ Fails - onClick not implemented
});
```

**Step 4: Green - Add onClick**
```tsx
export const Button = ({ 
  children, 
  onClick 
}: { 
  children: React.ReactNode;
  onClick?: () => void;
}) => {
  return <button onClick={onClick}>{children}</button>;
};
```

**Step 5: Refactor - Add accessibility and styling**
```tsx
export const Button = ({ 
  children, 
  onClick,
  variant = 'primary',
  disabled = false
}: { 
  children: React.ReactNode;
  onClick?: () => void;
  variant?: 'primary' | 'secondary';
  disabled?: boolean;
}) => {
  return (
    <button 
      onClick={onClick}
      disabled={disabled}
      className={`btn btn-${variant}`}
      aria-disabled={disabled}
    >
      {children}
    </button>
  );
};
```

---

## TDD Patterns for React

### Hook Testing Pattern
```ts
import { renderHook, act, waitFor } from '@testing-library/react';

// 1. Test initial state
it('should start with initial value', () => {
  const { result } = renderHook(() => useCounter(5));
  expect(result.current.count).toBe(5);
});

// 2. Test state changes
it('should increment count', () => {
  const { result } = renderHook(() => useCounter());
  act(() => result.current.increment());
  expect(result.current.count).toBe(1);
});

// 3. Test side effects
it('should call callback on count change', async () => {
  const callback = vi.fn();
  const { result } = renderHook(() => useCounter(0, callback));
  
  act(() => result.current.increment());
  await waitFor(() => expect(callback).toHaveBeenCalledWith(1));
});
```

### Component Testing Pattern
```tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

// 1. Test rendering
it('should render with props', () => {
  render(<UserCard name="John" email="john@example.com" />);
  expect(screen.getByText('John')).toBeInTheDocument();
  expect(screen.getByText('john@example.com')).toBeInTheDocument();
});

// 2. Test user interactions
it('should call onEdit when edit button is clicked', async () => {
  const user = userEvent.setup();
  const onEdit = vi.fn();
  
  render(<UserCard name="John" onEdit={onEdit} />);
  await user.click(screen.getByRole('button', { name: 'Edit' }));
  
  expect(onEdit).toHaveBeenCalled();
});

// 3. Test conditional rendering
it('should show admin badge for admin users', () => {
  render(<UserCard name="John" role="admin" />);
  expect(screen.getByText('Admin')).toBeInTheDocument();
});
```

### Integration Testing Pattern
```tsx
import { render, screen } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { server } from '../mocks/server';

// 1. Test component + provider interaction
it('should display user data from context', () => {
  const user = { name: 'John', email: 'john@example.com' };
  render(
    <UserProvider value={user}>
      <UserProfile />
    </UserProvider>
  );
  expect(screen.getByText('John')).toBeInTheDocument();
});

// 2. Test API integration
it('should fetch and display user data', async () => {
  server.use(
    http.get('/api/user', () => 
      HttpResponse.json({ name: 'John', email: 'john@example.com' })
    )
  );
  
  render(<UserProfile />);
  expect(await screen.findByText('John')).toBeInTheDocument();
});
```

---

## Common TDD Mistakes

### ❌ Writing Too Many Tests at Once
```ts
// ❌ Bad: Writing multiple tests before implementing
describe('useCounter', () => {
  it('should start with count 0', () => { /* ... */ });
  it('should increment count', () => { /* ... */ });
  it('should decrement count', () => { /* ... */ });
  it('should reset count', () => { /* ... */ });
  it('should handle negative numbers', () => { /* ... */ });
});
```

**Fix:** Write one test, implement, then write the next.

### ❌ Testing Implementation Details
```ts
// ❌ Bad: Testing internal state
it('should have useState called with 0', () => {
  const { result } = renderHook(() => useCounter());
  expect(result.current.internalState).toBe(0); // Testing implementation
});
```

**Fix:** Test behavior, not implementation.
```ts
// ✅ Good: Testing behavior
it('should start with count 0', () => {
  const { result } = renderHook(() => useCounter());
  expect(result.current.count).toBe(0); // Testing behavior
});
```

### ❌ Not Refactoring After Green
```ts
// ❌ Bad: Leaving messy code after tests pass
export const useCounter = () => {
  const [count, setCount] = useState(0);
  const increment = () => setCount(c => c + 1);
  const decrement = () => setCount(c => c - 1);
  const reset = () => setCount(0);
  
  return { count, increment, decrement, reset };
};
```

**Fix:** Refactor to improve code quality.
```ts
// ✅ Good: Clean, well-structured code
export const useCounter = (initialValue = 0) => {
  const [count, setCount] = useState(initialValue);
  
  const increment = useCallback(() => setCount(c => c + 1), []);
  const decrement = useCallback(() => setCount(c => c - 1), []);
  const reset = useCallback(() => setCount(initialValue), [initialValue]);
  
  return { count, increment, decrement, reset };
};
```

---

## TDD with External Dependencies

### Mocking External APIs
```ts
import { vi, describe, it, expect } from 'vitest';

// 1. Red - Test with mocked API
it('should fetch user data', async () => {
  const mockUser = { id: 1, name: 'John' };
  vi.mocked(fetchUser).mockResolvedValue(mockUser);
  
  const { result } = renderHook(() => useUser(1));
  
  await waitFor(() => {
    expect(result.current.user).toEqual(mockUser);
  });
});

// 2. Green - Implement with real API call
export const useUser = (id: number) => {
  const [user, setUser] = useState(null);
  
  useEffect(() => {
    fetchUser(id).then(setUser);
  }, [id]);
  
  return { user };
};
```

### Testing Error States
```ts
// 1. Red - Test error handling
it('should handle API errors', async () => {
  vi.mocked(fetchUser).mockRejectedValue(new Error('API Error'));
  
  const { result } = renderHook(() => useUser(1));
  
  await waitFor(() => {
    expect(result.current.error).toBe('API Error');
  });
});

// 2. Green - Add error handling
export const useUser = (id: number) => {
  const [user, setUser] = useState(null);
  const [error, setError] = useState(null);
  
  useEffect(() => {
    fetchUser(id)
      .then(setUser)
      .catch(err => setError(err.message));
  }, [id]);
  
  return { user, error };
};
```

---

## TDD Benefits

### ✅ Confidence
- Code works as intended
- Changes don't break existing functionality
- Refactoring is safe

### ✅ Design
- Forces you to think about the API first
- Results in better, more focused interfaces
- Reduces over-engineering

### ✅ Documentation
- Tests serve as living documentation
- Examples of how to use the code
- Clear specification of behavior

### ✅ Debugging
- Immediate feedback when something breaks
- Clear indication of what's wrong
- Faster bug fixes

---

## When NOT to Use TDD

### ❌ Don't TDD When:
- Exploring new APIs or libraries
- Writing throwaway prototypes
- Working with complex legacy code
- Learning new concepts

### ✅ Do TDD When:
- Building new features
- Refactoring existing code
- Fixing bugs (write test first)
- Working with business logic

---

**← Back to:** [Index](./README.md)  
**Next:** [Testing Pyramid](./02-testing-pyramid.md) →

