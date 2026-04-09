import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Card } from './Card';

describe('Card', () => {
  it('renders children in Root', () => {
    render(<Card.Root><p>Content</p></Card.Root>);
    expect(screen.getByText('Content')).toBeInTheDocument();
  });

  it('applies card background and radius classes', () => {
    const { container } = render(<Card.Root />);
    expect(container.firstChild).toHaveClass('bg-utu-bg-card', 'rounded-utu-card');
  });

  it('has border and shadow by default', () => {
    const { container } = render(<Card.Root />);
    expect(container.firstChild).toHaveClass('border', 'shadow-sm', 'border-utu-border-default');
  });

  it('removes border/shadow when flat', () => {
    const { container } = render(<Card.Root flat />);
    expect(container.firstChild).not.toHaveClass('border');
    expect(container.firstChild).not.toHaveClass('shadow-sm');
  });

  it('renders Card.Header with children', () => {
    render(
      <Card.Root>
        <Card.Header><h3>Title</h3></Card.Header>
      </Card.Root>
    );
    expect(screen.getByText('Title')).toBeInTheDocument();
  });

  it('renders Card.Header with colorClass', () => {
    const { container } = render(<Card.Header colorClass="bg-utu-navy" />);
    expect(container.firstChild).toHaveClass('bg-utu-navy');
  });

  it('renders Card.Body with padding', () => {
    const { container } = render(<Card.Body>Body</Card.Body>);
    expect(container.firstChild).toHaveClass('p-utu-md');
  });

  it('renders Card.Footer with top border', () => {
    const { container } = render(<Card.Footer>Footer</Card.Footer>);
    expect(container.firstChild).toHaveClass('border-t');
  });

  it('full composition renders all sections', () => {
    render(
      <Card.Root>
        <Card.Header><span>Header</span></Card.Header>
        <Card.Body><span>Body</span></Card.Body>
        <Card.Footer><span>Footer</span></Card.Footer>
      </Card.Root>
    );
    expect(screen.getByText('Header')).toBeInTheDocument();
    expect(screen.getByText('Body')).toBeInTheDocument();
    expect(screen.getByText('Footer')).toBeInTheDocument();
  });

  it('forwards className to Root', () => {
    const { container } = render(<Card.Root className="max-w-sm" />);
    expect(container.firstChild).toHaveClass('max-w-sm');
  });
});
