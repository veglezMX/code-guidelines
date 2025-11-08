# Accessibility Testing — Testing

**Goal:** axe-core integration at all test layers, @axe-core/playwright for E2E, 0 violations gate, and keyboard navigation checklist.

---

## Why Accessibility Testing?

**Accessibility is not optional:**
- Legal requirement (ADA, WCAG 2.1)
- Better UX for everyone
- Improves SEO
- Catches bugs early
- Makes app usable for 15% of population

**Test at every layer:**
- Unit: Component ARIA attributes
- Integration: Page-level violations
- E2E: Full journey accessibility

---

## Unit Layer: vitest-axe

### Setup
```bash
pnpm add -D vitest-axe axe-core
```

```ts
// vitest.setup.ts
import 'vitest-axe/extend-expect';
```

### Basic Component Test
```tsx
import { render } from '@testing-library/react';
import { axe, toHaveNoViolations } from 'vitest-axe';
import { Button } from './Button';

expect.extend(toHaveNoViolations);

describe('Button Accessibility', () => {
  it('should have no a11y violations', async () => {
    const { container } = render(<Button>Click me</Button>);
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('should have accessible name', () => {
    render(<Button>Click me</Button>);
    expect(screen.getByRole('button', { name: 'Click me' })).toBeInTheDocument();
  });

  it('should be keyboard accessible', async () => {
    const user = userEvent.setup();
    const handleClick = vi.fn();
    
    render(<Button onClick={handleClick}>Click me</Button>);
    
    const button = screen.getByRole('button');
    await user.tab();
    expect(button).toHaveFocus();
    
    await user.keyboard('{Enter}');
    expect(handleClick).toHaveBeenCalled();
  });
});
```

### Form Accessibility
```tsx
describe('LoginForm Accessibility', () => {
  it('should have no a11y violations', async () => {
    const { container } = render(<LoginForm />);
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('should have properly labeled inputs', () => {
    render(<LoginForm />);
    
    expect(screen.getByLabelText('Email')).toBeInTheDocument();
    expect(screen.getByLabelText('Password')).toBeInTheDocument();
  });

  it('should associate errors with inputs', async () => {
    render(<LoginForm />);
    
    const emailInput = screen.getByLabelText('Email');
    await userEvent.type(emailInput, 'invalid');
    await userEvent.tab();
    
    // Error should be associated with input via aria-describedby
    const errorId = emailInput.getAttribute('aria-describedby');
    expect(errorId).toBeTruthy();
    expect(document.getElementById(errorId!)).toHaveTextContent('Invalid email');
  });

  it('should announce errors to screen readers', async () => {
    render(<LoginForm />);
    
    await userEvent.click(screen.getByRole('button', { name: 'Sign In' }));
    
    // Error should be in a live region
    const errorRegion = screen.getByRole('alert');
    expect(errorRegion).toHaveTextContent('Please fill in all fields');
  });
});
```

### Custom Rule Configuration
```ts
import { configureAxe } from 'vitest-axe';

const axe = configureAxe({
  rules: {
    // Disable specific rules
    'color-contrast': { enabled: false }, // If testing with mocked styles
    
    // Configure rule severity
    'label': { enabled: true },
    'button-name': { enabled: true },
  },
});

it('should pass custom axe rules', async () => {
  const { container } = render(<Component />);
  const results = await axe(container);
  expect(results).toHaveNoViolations();
});
```

---

## Integration Layer: axe-core

### Setup with Testing Library
```tsx
import { render, screen } from './test-utils';
import { axe, toHaveNoViolations } from 'vitest-axe';
import { UserProfile } from './UserProfile';

expect.extend(toHaveNoViolations);

describe('UserProfile Integration A11y', () => {
  it('should have no violations with providers', async () => {
    server.use(
      http.get('/api/user', () => {
        return HttpResponse.json({
          id: '1',
          name: 'John Doe',
          email: 'john@example.com',
        });
      })
    );

    const { container } = render(<UserProfile />, { wrapper: AppProviders });
    
    // Wait for data to load
    await screen.findByText('John Doe');
    
    // Check accessibility
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});
```

### Testing Modal Accessibility
```tsx
describe('Modal Accessibility', () => {
  it('should trap focus within modal', async () => {
    const user = userEvent.setup();
    
    render(<ModalExample />);
    
    // Open modal
    await user.click(screen.getByRole('button', { name: 'Open Modal' }));
    
    const modal = screen.getByRole('dialog');
    expect(modal).toBeInTheDocument();
    
    // First focusable element should be focused
    const closeButton = within(modal).getByRole('button', { name: 'Close' });
    expect(closeButton).toHaveFocus();
    
    // Tab through modal elements
    await user.tab();
    expect(within(modal).getByRole('button', { name: 'Confirm' })).toHaveFocus();
    
    // Tab should wrap around
    await user.tab();
    expect(closeButton).toHaveFocus();
  });

  it('should restore focus on close', async () => {
    const user = userEvent.setup();
    
    render(<ModalExample />);
    
    const openButton = screen.getByRole('button', { name: 'Open Modal' });
    await user.click(openButton);
    
    const closeButton = screen.getByRole('button', { name: 'Close' });
    await user.click(closeButton);
    
    // Focus should return to trigger button
    expect(openButton).toHaveFocus();
  });

  it('should close on Escape key', async () => {
    const user = userEvent.setup();
    
    render(<ModalExample />);
    
    await user.click(screen.getByRole('button', { name: 'Open Modal' }));
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    
    await user.keyboard('{Escape}');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
});
```

---

## E2E Layer: @axe-core/playwright

### Setup
```bash
pnpm add -D @axe-core/playwright
```

### Basic E2E A11y Test
```ts
import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test('homepage should have no a11y violations', async ({ page }) => {
  await page.goto('/');
  
  const accessibilityScanResults = await new AxeBuilder({ page }).analyze();
  
  expect(accessibilityScanResults.violations).toEqual([]);
});
```

### Test Specific Region
```ts
test('navigation should be accessible', async ({ page }) => {
  await page.goto('/');
  
  const accessibilityScanResults = await new AxeBuilder({ page })
    .include('[role="navigation"]')
    .analyze();
  
  expect(accessibilityScanResults.violations).toEqual([]);
});
```

### Exclude Specific Elements
```ts
test('main content accessible, ignore third-party widget', async ({ page }) => {
  await page.goto('/');
  
  const accessibilityScanResults = await new AxeBuilder({ page })
    .exclude('#third-party-widget')
    .analyze();
  
  expect(accessibilityScanResults.violations).toEqual([]);
});
```

### Custom Rules
```ts
test('check specific WCAG rules', async ({ page }) => {
  await page.goto('/');
  
  const accessibilityScanResults = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
    .analyze();
  
  expect(accessibilityScanResults.violations).toEqual([]);
});
```

### Detailed Violation Reporting
```ts
test('report all violations with details', async ({ page }) => {
  await page.goto('/');
  
  const accessibilityScanResults = await new AxeBuilder({ page }).analyze();
  
  if (accessibilityScanResults.violations.length > 0) {
    console.log('Accessibility Violations:');
    accessibilityScanResults.violations.forEach(violation => {
      console.log(`\n${violation.id}: ${violation.description}`);
      console.log(`Impact: ${violation.impact}`);
      console.log(`Help: ${violation.helpUrl}`);
      console.log('Affected elements:');
      violation.nodes.forEach(node => {
        console.log(`  - ${node.html}`);
        console.log(`    ${node.failureSummary}`);
      });
    });
  }
  
  expect(accessibilityScanResults.violations).toEqual([]);
});
```

---

## Keyboard Navigation Testing

### Navigation Checklist
```tsx
describe('Keyboard Navigation', () => {
  it('should navigate with Tab key', async () => {
    const user = userEvent.setup();
    
    render(<Navigation />);
    
    // Tab through interactive elements
    await user.tab();
    expect(screen.getByRole('link', { name: 'Home' })).toHaveFocus();
    
    await user.tab();
    expect(screen.getByRole('link', { name: 'About' })).toHaveFocus();
    
    await user.tab();
    expect(screen.getByRole('link', { name: 'Contact' })).toHaveFocus();
  });

  it('should activate buttons with Enter and Space', async () => {
    const user = userEvent.setup();
    const handleClick = vi.fn();
    
    render(<Button onClick={handleClick}>Click me</Button>);
    
    const button = screen.getByRole('button');
    button.focus();
    
    await user.keyboard('{Enter}');
    expect(handleClick).toHaveBeenCalledTimes(1);
    
    await user.keyboard(' ');
    expect(handleClick).toHaveBeenCalledTimes(2);
  });

  it('should navigate lists with arrow keys', async () => {
    const user = userEvent.setup();
    
    render(<Menu />);
    
    const firstItem = screen.getByRole('menuitem', { name: 'Option 1' });
    firstItem.focus();
    
    await user.keyboard('{ArrowDown}');
    expect(screen.getByRole('menuitem', { name: 'Option 2' })).toHaveFocus();
    
    await user.keyboard('{ArrowDown}');
    expect(screen.getByRole('menuitem', { name: 'Option 3' })).toHaveFocus();
    
    await user.keyboard('{ArrowUp}');
    expect(screen.getByRole('menuitem', { name: 'Option 2' })).toHaveFocus();
  });

  it('should support Home and End keys', async () => {
    const user = userEvent.setup();
    
    render(<Menu />);
    
    const firstItem = screen.getByRole('menuitem', { name: 'Option 1' });
    firstItem.focus();
    
    await user.keyboard('{End}');
    expect(screen.getByRole('menuitem', { name: 'Last Option' })).toHaveFocus();
    
    await user.keyboard('{Home}');
    expect(screen.getByRole('menuitem', { name: 'Option 1' })).toHaveFocus();
  });
});
```

---

## Screen Reader Testing

### ARIA Live Regions
```tsx
describe('Screen Reader Announcements', () => {
  it('should announce success messages', async () => {
    render(<Form />);
    
    await userEvent.click(screen.getByRole('button', { name: 'Save' }));
    
    // Success message should be in a live region
    const successMessage = screen.getByRole('status');
    expect(successMessage).toHaveTextContent('Saved successfully');
    expect(successMessage).toHaveAttribute('aria-live', 'polite');
  });

  it('should announce errors assertively', async () => {
    render(<Form />);
    
    await userEvent.click(screen.getByRole('button', { name: 'Delete' }));
    
    // Error should be announced immediately
    const errorMessage = screen.getByRole('alert');
    expect(errorMessage).toHaveTextContent('Failed to delete');
    expect(errorMessage).toHaveAttribute('aria-live', 'assertive');
  });

  it('should announce loading state', () => {
    render(<LoadingComponent />);
    
    const loadingRegion = screen.getByRole('status');
    expect(loadingRegion).toHaveTextContent('Loading...');
    expect(loadingRegion).toHaveAttribute('aria-live', 'polite');
    expect(loadingRegion).toHaveAttribute('aria-busy', 'true');
  });
});
```

### ARIA Labels and Descriptions
```tsx
describe('ARIA Attributes', () => {
  it('should have descriptive labels', () => {
    render(<IconButton icon={<CloseIcon />} onClick={vi.fn()} />);
    
    const button = screen.getByRole('button', { name: 'Close' });
    expect(button).toHaveAttribute('aria-label', 'Close');
  });

  it('should describe complex interactions', () => {
    render(<Slider value={50} onChange={vi.fn()} />);
    
    const slider = screen.getByRole('slider');
    expect(slider).toHaveAttribute('aria-label', 'Volume');
    expect(slider).toHaveAttribute('aria-valuemin', '0');
    expect(slider).toHaveAttribute('aria-valuemax', '100');
    expect(slider).toHaveAttribute('aria-valuenow', '50');
    expect(slider).toHaveAttribute('aria-valuetext', '50%');
  });

  it('should provide help text', () => {
    render(
      <div>
        <input id="email" aria-describedby="email-help" />
        <div id="email-help">We'll never share your email</div>
      </div>
    );
    
    const input = screen.getByRole('textbox');
    const helpText = document.getElementById('email-help');
    
    expect(input).toHaveAttribute('aria-describedby', 'email-help');
    expect(helpText).toHaveTextContent("We'll never share your email");
  });
});
```

---

## CI Gates and Policies

### 0 Violations Policy
```ts
// playwright.config.ts
import { defineConfig } from '@playwright/test';

export default defineConfig({
  // Fail fast on accessibility violations
  reporter: [
    ['html'],
    ['json', { outputFile: 'reports/a11y-results.json' }],
  ],
});
```

### CI Configuration
```yaml
# .github/workflows/a11y-tests.yml
name: Accessibility Tests

on:
  pull_request:
    branches: [main]

jobs:
  a11y-unit:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - run: pnpm install
      - run: pnpm test:a11y:unit
      - name: Fail on violations
        run: |
          if [ -f "reports/a11y-violations.json" ]; then
            echo "Accessibility violations found"
            exit 1
          fi

  a11y-e2e:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - run: pnpm install
      - run: pnpm exec playwright test --grep "@a11y"
      - uses: actions/upload-artifact@v3
        if: failure()
        with:
          name: a11y-failures
          path: reports/
```

---

## Best Practices

### ✅ Test at All Layers
```
Unit: Component ARIA attributes
Integration: Page structure and roles
E2E: Full user journeys
```

### ✅ Use Semantic HTML
```tsx
// ✅ Good: Semantic HTML
<button onClick={handleClick}>Click me</button>
<nav aria-label="Main navigation">
  <a href="/">Home</a>
</nav>

// ❌ Bad: Divs with onClick
<div onClick={handleClick}>Click me</div>
<div className="nav">
  <div onClick={() => navigate('/')}>Home</div>
</div>
```

### ✅ Provide Text Alternatives
```tsx
// ✅ Good: Alt text and labels
<img src="logo.png" alt="Company Logo" />
<button aria-label="Close modal">×</button>

// ❌ Bad: Missing alternatives
<img src="logo.png" />
<button>×</button>
```

### ✅ Ensure Keyboard Access
```tsx
// ✅ Good: Keyboard accessible
<button onClick={handleClick}>Click me</button>

// ❌ Bad: Not keyboard accessible
<div onClick={handleClick}>Click me</div>
```

---

## Common Violations and Fixes

### Missing Form Labels
```tsx
// ❌ Bad
<input type="email" placeholder="Email" />

// ✅ Good
<label htmlFor="email">Email</label>
<input id="email" type="email" />
```

### Insufficient Color Contrast
```tsx
// ❌ Bad: Low contrast
<p style={{ color: '#999', background: '#fff' }}>Text</p>

// ✅ Good: WCAG AA compliant (4.5:1)
<p style={{ color: '#595959', background: '#fff' }}>Text</p>
```

### Missing Landmark Roles
```tsx
// ❌ Bad
<div className="header">...</div>
<div className="content">...</div>

// ✅ Good
<header>...</header>
<main>...</main>
<footer>...</footer>
```

---

**← Back to:** [Visual Testing](./07-visual-testing.md)  
**Next:** [Performance Testing](./09-performance-testing.md) →

