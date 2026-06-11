import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Button } from './Button';

describe('Button', () => {
  it('defaults to type="button" so forms are not submitted accidentally', () => {
    render(<Button>Save</Button>);
    expect(screen.getByRole('button', { name: 'Save' })).toHaveAttribute('type', 'button');
  });

  it('applies the danger variant', () => {
    render(<Button variant="danger">Delete</Button>);
    expect(screen.getByRole('button', { name: 'Delete' })).toHaveClass('bg-danger');
  });

  it('respects disabled', () => {
    render(<Button disabled>Archive</Button>);
    expect(screen.getByRole('button', { name: 'Archive' })).toBeDisabled();
  });
});
