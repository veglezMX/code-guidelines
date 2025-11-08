# Unit Testing — Vitest

**Goal:** Structure, naming, mocking recipes, coverage expectations, and anti-patterns for Vitest unit tests.

---

## Setup and Configuration

### Install Dependencies
```bash
pnpm add -D vitest @testing-library/react @testing-library/user-event @testing-library/jest-dom jsdom
```

### Vitest Config
```ts
// vitest.config.ts
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./vitest.setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'dist/',
        '**/*.d.ts',
        '**/*.config.ts',
        '**/index.ts',
      ],
      thresholds: {
        lines: 85,
        functions: 85,
        branches: 80,
        statements: 85,
      },
    },
  },
});
```

### Setup File
```ts
// vitest.setup.ts
import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';

// Cleanup after each test
afterEach(() => {
  cleanup();
});
```

---

## File Structure and Naming

### Colocated Tests (Recommended)
```
src/
  components/
    Button/
      Button.tsx
      Button.test.tsx
  hooks/
    useCounter.ts
    useCounter.test.ts
  utils/
    formatDate.ts
    formatDate.test.ts
```

### Central Test Directory (Alternative)
```
tests/
  unit/
    components/
      Button.test.tsx
    hooks/
      useCounter.test.ts
    utils/
      formatDate.test.ts
```

**Naming convention:**
```
✅ component.test.tsx
✅ hook.test.ts
✅ util.test.ts
❌ component.spec.tsx
❌ ComponentTest.tsx
```

---

## Testing Pure Functions

```ts
import { describe, it, expect } from 'vitest';
import { formatCurrency, calculateTotal, validateEmail } from './utils';

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

  it('should handle negative amounts', () => {
    expect(formatCurrency(-50, 'USD')).toBe('-$50.00');
  });
});

describe('calculateTotal', () => {
  it('should sum array of numbers', () => {
    expect(calculateTotal([10, 20, 30])).toBe(60);
  });

  it('should return 0 for empty array', () => {
    expect(calculateTotal([])).toBe(0);
  });

  it('should handle decimal numbers', () => {
    expect(calculateTotal([10.5, 20.3])).toBeCloseTo(30.8);
  });
});

describe('validateEmail', () => {
  it('should accept valid email', () => {
    expect(validateEmail('user@example.com')).toBe(true);
  });

  it('should reject email without @', () => {
    expect(validateEmail('userexample.com')).toBe(false);
  });

  it('should reject email without domain', () => {
    expect(validateEmail('user@')).toBe(false);
  });
});
```

---

## Testing React Hooks

```ts
import { renderHook, act, waitFor } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { useCounter, useDebounce, useLocalStorage } from './hooks';

describe('useCounter', () => {
  it('should start with initial value', () => {
    const { result } = renderHook(() => useCounter(5));
    expect(result.current.count).toBe(5);
  });

  it('should increment count', () => {
    const { result } = renderHook(() => useCounter(0));
    
    act(() => {
      result.current.increment();
    });
    
    expect(result.current.count).toBe(1);
  });

  it('should decrement count', () => {
    const { result } = renderHook(() => useCounter(5));
    
    act(() => {
      result.current.decrement();
    });
    
    expect(result.current.count).toBe(4);
  });

  it('should reset to initial value', () => {
    const { result } = renderHook(() => useCounter(5));
    
    act(() => {
      result.current.increment();
      result.current.reset();
    });
    
    expect(result.current.count).toBe(5);
  });
});

describe('useDebounce', () => {
  it('should return initial value immediately', () => {
    const { result } = renderHook(() => useDebounce('test', 500));
    expect(result.current).toBe('test');
  });

  it('should debounce value changes', async () => {
    vi.useFakeTimers();
    const { result, rerender } = renderHook(
      ({ value, delay }) => useDebounce(value, delay),
      { initialProps: { value: 'initial', delay: 500 } }
    );

    expect(result.current).toBe('initial');

    // Change value
    rerender({ value: 'changed', delay: 500 });
    expect(result.current).toBe('initial'); // Still old value

    // Fast-forward time
    act(() => {
      vi.advanceTimersByTime(500);
    });

    expect(result.current).toBe('changed'); // Now updated

    vi.useRealTimers();
  });
});

describe('useLocalStorage', () => {
  it('should read initial value from localStorage', () => {
    localStorage.setItem('test-key', JSON.stringify('stored-value'));
    
    const { result } = renderHook(() => useLocalStorage('test-key', 'default'));
    
    expect(result.current[0]).toBe('stored-value');
  });

  it('should use default value when key does not exist', () => {
    const { result } = renderHook(() => useLocalStorage('nonexistent', 'default'));
    
    expect(result.current[0]).toBe('default');
  });

  it('should update localStorage when value changes', () => {
    const { result } = renderHook(() => useLocalStorage('test-key', 'initial'));
    
    act(() => {
      result.current[1]('updated');
    });
    
    expect(localStorage.getItem('test-key')).toBe(JSON.stringify('updated'));
  });
});
```

---

## Testing React Components

```tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import { Button, Input, Card } from './components';

describe('Button', () => {
  it('should render with text', () => {
    render(<Button>Click me</Button>);
    expect(screen.getByRole('button', { name: 'Click me' })).toBeInTheDocument();
  });

  it('should call onClick when clicked', async () => {
    const user = userEvent.setup();
    const handleClick = vi.fn();
    
    render(<Button onClick={handleClick}>Click me</Button>);
    await user.click(screen.getByRole('button'));
    
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('should be disabled when disabled prop is true', () => {
    render(<Button disabled>Click me</Button>);
    expect(screen.getByRole('button')).toBeDisabled();
  });

  it('should apply variant class', () => {
    render(<Button variant="secondary">Click me</Button>);
    expect(screen.getByRole('button')).toHaveClass('btn-secondary');
  });
});

describe('Input', () => {
  it('should render with label', () => {
    render(<Input label="Email" />);
    expect(screen.getByLabelText('Email')).toBeInTheDocument();
  });

  it('should call onChange when value changes', async () => {
    const user = userEvent.setup();
    const handleChange = vi.fn();
    
    render(<Input label="Email" onChange={handleChange} />);
    await user.type(screen.getByLabelText('Email'), 'test@example.com');
    
    expect(handleChange).toHaveBeenCalled();
  });

  it('should display error message', () => {
    render(<Input label="Email" error="Invalid email" />);
    expect(screen.getByText('Invalid email')).toBeInTheDocument();
  });

  it('should be accessible', () => {
    render(<Input label="Email" required />);
    const input = screen.getByLabelText('Email');
    expect(input).toHaveAttribute('aria-required', 'true');
  });
});

describe('Card', () => {
  it('should render title and content', () => {
    render(
      <Card title="User Profile">
        <p>User details here</p>
      </Card>
    );
    
    expect(screen.getByText('User Profile')).toBeInTheDocument();
    expect(screen.getByText('User details here')).toBeInTheDocument();
  });

  it('should render actions when provided', () => {
    render(
      <Card 
        title="User Profile" 
        actions={<button>Edit</button>}
      >
        Content
      </Card>
    );
    
    expect(screen.getByRole('button', { name: 'Edit' })).toBeInTheDocument();
  });
});
```

---

## Mocking Strategies

### Mock Functions with vi.fn()
```ts
import { vi } from 'vitest';

it('should call callback with value', () => {
  const callback = vi.fn();
  const component = render(<Component onSubmit={callback} />);
  
  // Trigger action
  fireEvent.click(screen.getByRole('button'));
  
  expect(callback).toHaveBeenCalledWith('expected-value');
  expect(callback).toHaveBeenCalledTimes(1);
});
```

### Mock Modules with vi.mock()
```ts
import { vi } from 'vitest';
import { useAuth } from '@/hooks/useAuth';

// Mock the entire module
vi.mock('@/hooks/useAuth');

it('should render for authenticated user', () => {
  vi.mocked(useAuth).mockReturnValue({
    user: { id: '1', name: 'John' },
    isAuthenticated: true,
  });
  
  render(<Dashboard />);
  expect(screen.getByText('Welcome, John')).toBeInTheDocument();
});
```

### Mock Implementation
```ts
import { vi } from 'vitest';

it('should use custom implementation', () => {
  const mockFetch = vi.fn().mockImplementation((url) => {
    if (url === '/api/users') {
      return Promise.resolve({ json: () => Promise.resolve([{ id: 1 }]) });
    }
    return Promise.reject(new Error('Not found'));
  });
  
  global.fetch = mockFetch;
  
  // Test code...
  
  expect(mockFetch).toHaveBeenCalledWith('/api/users');
});
```

### Spy on Methods
```ts
import { vi } from 'vitest';

it('should call console.error', () => {
  const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
  
  // Trigger error
  render(<ComponentThatLogsError />);
  
  expect(spy).toHaveBeenCalledWith('Expected error message');
  
  spy.mockRestore();
});
```

---

## Clock Control

### Fake Timers
```ts
import { vi } from 'vitest';

it('should debounce function calls', () => {
  vi.useFakeTimers();
  const callback = vi.fn();
  const debounced = debounce(callback, 1000);
  
  debounced();
  debounced();
  debounced();
  
  expect(callback).not.toHaveBeenCalled();
  
  vi.advanceTimersByTime(1000);
  
  expect(callback).toHaveBeenCalledTimes(1);
  
  vi.useRealTimers();
});
```

### Run All Timers
```ts
it('should execute all pending timers', () => {
  vi.useFakeTimers();
  const callback = vi.fn();
  
  setTimeout(callback, 1000);
  setTimeout(callback, 2000);
  
  vi.runAllTimers();
  
  expect(callback).toHaveBeenCalledTimes(2);
  
  vi.useRealTimers();
});
```

---

## Coverage Expectations

### Thresholds
```ts
// vitest.config.ts
export default defineConfig({
  test: {
    coverage: {
      thresholds: {
        lines: 85,           // 85% line coverage
        functions: 85,       // 85% function coverage
        branches: 80,        // 80% branch coverage
        statements: 85,      // 85% statement coverage
      },
    },
  },
});
```

### Per-File Thresholds
```ts
// vitest.config.ts
export default defineConfig({
  test: {
    coverage: {
      perFile: true,
      thresholds: {
        'src/utils/**': { lines: 95 },
        'src/components/**': { lines: 85 },
        'src/hooks/**': { lines: 90 },
      },
    },
  },
});
```

### Changed Files Only
```bash
# Run coverage only on changed files
pnpm vitest run --coverage --changed
```

---

## Anti-Patterns

### ❌ Testing Implementation Details
```ts
// ❌ Bad: Testing internal state
it('should have count in state', () => {
  const { result } = renderHook(() => useCounter());
  expect(result.current.internalState.count).toBe(0);
});

// ✅ Good: Testing behavior
it('should start with count 0', () => {
  const { result } = renderHook(() => useCounter());
  expect(result.current.count).toBe(0);
});
```

### ❌ Testing Too Many Things
```ts
// ❌ Bad: Multiple assertions, multiple reasons to fail
it('should work correctly', () => {
  expect(fn(1)).toBe(2);
  expect(fn(2)).toBe(4);
  expect(fn(3)).toBe(6);
  expect(fn(0)).toBe(0);
});

// ✅ Good: One assertion per test
it('should double the input', () => {
  expect(fn(1)).toBe(2);
});

it('should handle zero', () => {
  expect(fn(0)).toBe(0);
});
```

### ❌ Not Cleaning Up
```ts
// ❌ Bad: No cleanup
it('should set localStorage', () => {
  localStorage.setItem('key', 'value');
  // No cleanup - affects other tests
});

// ✅ Good: Clean up after test
it('should set localStorage', () => {
  localStorage.setItem('key', 'value');
  // Test assertions...
});

afterEach(() => {
  localStorage.clear();
});
```

### ❌ Over-Mocking
```ts
// ❌ Bad: Too many mocks
vi.mock('react-router');
vi.mock('@/hooks/useAuth');
vi.mock('@/api/client');
vi.mock('@/utils/format');

// ✅ Good: Consider integration test instead
// If you need this many mocks, the test might belong at integration layer
```

---

## Best Practices

### ✅ Use Testing Library Queries
```ts
// ✅ Good: Accessible queries
screen.getByRole('button', { name: 'Submit' });
screen.getByLabelText('Email');
screen.getByText('Welcome');

// ❌ Bad: Fragile queries
screen.getByClassName('submit-btn');
screen.getByTestId('email-input'); // Use only when necessary
```

### ✅ Async Testing
```ts
// ✅ Good: Wait for async changes
it('should display user data', async () => {
  render(<UserProfile />);
  expect(await screen.findByText('John Doe')).toBeInTheDocument();
});

// ❌ Bad: No waiting
it('should display user data', () => {
  render(<UserProfile />);
  expect(screen.getByText('John Doe')).toBeInTheDocument(); // Fails if async
});
```

### ✅ User-Centric Testing
```ts
// ✅ Good: Test like a user
const user = userEvent.setup();
await user.type(screen.getByLabelText('Email'), 'test@example.com');
await user.click(screen.getByRole('button', { name: 'Submit' }));

// ❌ Bad: Direct DOM manipulation
fireEvent.change(input, { target: { value: 'test@example.com' } });
fireEvent.click(button);
```

---

**← Back to:** [Testing Pyramid](./02-testing-pyramid.md)  
**Next:** [Integration Testing](./04-integration-vitest-msw.md) →

