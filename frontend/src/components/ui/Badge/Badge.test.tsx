import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Badge } from './Badge';

describe('Badge', () => {
  it('renders children', () => {
    render(<Badge>Confirmed</Badge>);
    expect(screen.getByText('Confirmed')).toBeInTheDocument();
  });

  it('applies success variant classes', () => {
    const { container } = render(<Badge variant="success">OK</Badge>);
    expect(container.firstChild).toHaveClass('bg-utu-success-bg');
    expect(container.firstChild).toHaveClass('text-utu-success-text');
  });

  it('applies error variant classes', () => {
    const { container } = render(<Badge variant="error">Error</Badge>);
    expect(container.firstChild).toHaveClass('bg-utu-error-bg');
    expect(container.firstChild).toHaveClass('text-utu-error-text');
  });

  it('applies warning variant classes', () => {
    const { container } = render(<Badge variant="warning">Warning</Badge>);
    expect(container.firstChild).toHaveClass('bg-utu-warning-bg');
  });

  it('applies info variant classes', () => {
    const { container } = render(<Badge variant="info">Info</Badge>);
    expect(container.firstChild).toHaveClass('bg-utu-info-bg');
  });

  it('applies neutral variant classes by default', () => {
    const { container } = render(<Badge>Default</Badge>);
    expect(container.firstChild).toHaveClass('bg-utu-bg-muted');
  });

  it('applies tag shape (4px radius) by default', () => {
    const { container } = render(<Badge>Tag</Badge>);
    expect(container.firstChild).toHaveClass('rounded-utu-tag');
  });

  it('applies pill shape', () => {
    const { container } = render(<Badge shape="pill">Pill</Badge>);
    expect(container.firstChild).toHaveClass('rounded-utu-pill');
  });

  it('shows dot when dot prop is true', () => {
    const { container } = render(<Badge dot variant="success">Active</Badge>);
    const dot = container.querySelector('span[aria-hidden="true"]');
    expect(dot).toBeInTheDocument();
    expect(dot).toHaveClass('bg-utu-success-text');
  });

  it('does not show dot by default', () => {
    const { container } = render(<Badge>No dot</Badge>);
    expect(container.querySelectorAll('span[aria-hidden="true"]')).toHaveLength(0);
  });

  it('applies sm size classes', () => {
    const { container } = render(<Badge size="sm">Small</Badge>);
    expect(container.firstChild).toHaveClass('text-[11px]');
  });

  it('forwards className', () => {
    const { container } = render(<Badge className="custom">Custom</Badge>);
    expect(container.firstChild).toHaveClass('custom');
  });
});
