/**
 * TDD Example: Button Component
 * 
 * Demonstrates TDD workflow for building a UI component with:
 * - Rendering tests
 * - User interaction tests
 * - Accessibility tests
 * - Edge cases
 */

import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import type { ReactNode } from 'react';

// ============================================================================
// TDD CYCLE: Button Component
// ============================================================================

describe('Button Component (TDD Example)', () => {
  // RED: Test rendering
  it('should render button with text', () => {
    render(<Button>Click me</Button>);
    expect(screen.getByRole('button', { name: 'Click me' })).toBeInTheDocument();
  });

  // RED: Test click handler
  it('should call onClick when clicked', async () => {
    const user = userEvent.setup();
    const handleClick = vi.fn();
    
    render(<Button onClick={handleClick}>Click me</Button>);
    await user.click(screen.getByRole('button'));
    
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  // RED: Test disabled state
  it('should be disabled when disabled prop is true', () => {
    render(<Button disabled>Click me</Button>);
    expect(screen.getByRole('button')).toBeDisabled();
  });

  it('should not call onClick when disabled', async () => {
    const user = userEvent.setup();
    const handleClick = vi.fn();
    
    render(<Button disabled onClick={handleClick}>Click me</Button>);
    await user.click(screen.getByRole('button'));
    
    expect(handleClick).not.toHaveBeenCalled();
  });

  // RED: Test variants
  it('should apply variant class', () => {
    render(<Button variant="secondary">Click me</Button>);
    expect(screen.getByRole('button')).toHaveClass('btn-secondary');
  });

  // RED: Test loading state
  it('should show loading state', () => {
    render(<Button loading>Click me</Button>);
    expect(screen.getByRole('button')).toHaveAttribute('aria-busy', 'true');
    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });

  // RED: Test keyboard accessibility
  it('should be keyboard accessible', async () => {
    const user = userEvent.setup();
    const handleClick = vi.fn();
    
    render(<Button onClick={handleClick}>Click me</Button>);
    
    const button = screen.getByRole('button');
    button.focus();
    expect(button).toHaveFocus();
    
    await user.keyboard('{Enter}');
    expect(handleClick).toHaveBeenCalled();
  });

  // RED: Test ARIA attributes
  it('should have proper ARIA attributes', () => {
    render(<Button aria-label="Close modal">×</Button>);
    expect(screen.getByRole('button', { name: 'Close modal' })).toBeInTheDocument();
  });

  // RED: Test edge cases
  it('should handle children as function', () => {
    render(
      <Button>
        {(props) => <span data-testid="custom">{props.loading ? 'Loading' : 'Click'}</span>}
      </Button>
    );
    expect(screen.getByTestId('custom')).toHaveTextContent('Click');
  });
});

// ============================================================================
// FINAL IMPLEMENTATION
// ============================================================================

interface ButtonProps {
  children: ReactNode | ((props: { loading: boolean }) => ReactNode);
  onClick?: () => void;
  variant?: 'primary' | 'secondary' | 'danger';
  disabled?: boolean;
  loading?: boolean;
  'aria-label'?: string;
  type?: 'button' | 'submit' | 'reset';
}

export const Button = ({
  children,
  onClick,
  variant = 'primary',
  disabled = false,
  loading = false,
  'aria-label': ariaLabel,
  type = 'button',
}: ButtonProps) => {
  const isDisabled = disabled || loading;
  
  const content = typeof children === 'function' 
    ? children({ loading })
    : children;
  
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={isDisabled}
      className={`btn btn-${variant}`}
      aria-label={ariaLabel}
      aria-busy={loading}
      aria-disabled={isDisabled}
    >
      {loading ? 'Loading...' : content}
    </button>
  );
};

// ============================================================================
// KEY PATTERNS
// ============================================================================
// 1. Test rendering first (simplest test)
// 2. Test user interactions (click, keyboard)
// 3. Test accessibility (ARIA, keyboard navigation)
// 4. Test variants and states
// 5. Test edge cases last
// 6. Use userEvent for realistic interactions
// 7. Query by role for accessibility

