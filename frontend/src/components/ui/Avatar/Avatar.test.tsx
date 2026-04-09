import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Avatar, AvatarGroup } from './Avatar';

describe('Avatar', () => {
  it('renders initials', () => {
    render(<Avatar initials="AH" alt="Ahmed Hassan" />);
    expect(screen.getByText('AH')).toBeInTheDocument();
  });

  it('truncates initials to 2 characters', () => {
    render(<Avatar initials="ABC" />);
    expect(screen.getByText('AB')).toBeInTheDocument();
  });

  it('uppercases initials', () => {
    render(<Avatar initials="ah" />);
    expect(screen.getByText('AH')).toBeInTheDocument();
  });

  it('renders icon when provided', () => {
    render(<Avatar icon={<span data-testid="icon" />} alt="User" />);
    expect(screen.getByTestId('icon')).toBeInTheDocument();
  });

  it('applies navy color scheme by default', () => {
    const { container } = render(<Avatar initials="AH" />);
    expect(container.firstChild).toHaveClass('bg-utu-navy');
  });

  it('applies pill radius', () => {
    const { container } = render(<Avatar initials="AH" />);
    expect(container.firstChild).toHaveClass('rounded-utu-pill');
  });

  it('applies size classes', () => {
    const { container: c28 } = render(<Avatar initials="AH" size={28} />);
    expect(c28.firstChild).toHaveClass('w-7');

    const { container: c56 } = render(<Avatar initials="AH" size={56} />);
    expect(c56.firstChild).toHaveClass('w-14');
  });

  it('sets aria-label from alt', () => {
    const { container } = render(<Avatar initials="FA" alt="Fatima Al-Amin" />);
    expect(container.firstChild).toHaveAttribute('aria-label', 'Fatima Al-Amin');
  });
});

describe('AvatarGroup', () => {
  const avatars = [
    { initials: 'AH', alt: 'Ahmed' },
    { initials: 'FA', alt: 'Fatima' },
    { initials: 'MK', alt: 'Mohammed' },
    { initials: 'SA', alt: 'Sara' },
    { initials: 'OM', alt: 'Omar' },
  ];

  it('renders up to max avatars', () => {
    render(<AvatarGroup avatars={avatars} max={3} />);
    expect(screen.getByText('AH')).toBeInTheDocument();
    expect(screen.getByText('FA')).toBeInTheDocument();
    expect(screen.getByText('MK')).toBeInTheDocument();
    expect(screen.queryByText('SA')).not.toBeInTheDocument();
  });

  it('shows overflow count badge', () => {
    render(<AvatarGroup avatars={avatars} max={3} />);
    expect(screen.getByText('+2')).toBeInTheDocument();
  });

  it('does not show overflow when all fit', () => {
    render(<AvatarGroup avatars={avatars.slice(0, 3)} max={4} />);
    expect(screen.queryByText(/^\+/)).not.toBeInTheDocument();
  });

  it('has accessible label with total count', () => {
    const { container } = render(<AvatarGroup avatars={avatars} />);
    expect(container.firstChild).toHaveAttribute('aria-label', '5 members');
  });
});
