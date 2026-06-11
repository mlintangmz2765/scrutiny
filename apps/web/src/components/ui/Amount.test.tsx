import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Amount } from './Amount';

describe('Amount', () => {
  it('renders negatives in parentheses with the danger color', () => {
    render(<Amount value={-123450} />);
    const el = screen.getByText('(1,234.50)');
    expect(el).toHaveClass('text-danger');
    expect(el).toHaveClass('tnum');
  });

  it('renders positives without parentheses or danger color', () => {
    render(<Amount value={123450} />);
    const el = screen.getByText('1,234.50');
    expect(el).not.toHaveClass('text-danger');
  });

  it('renders null as an em dash', () => {
    render(<Amount value={null} />);
    expect(screen.getByText('—')).toBeInTheDocument();
  });
});
