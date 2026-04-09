import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Toast, ToastProvider } from './Toast';

function renderToast(props: Partial<React.ComponentProps<typeof Toast>> = {}) {
  return render(
    <ToastProvider>
      <Toast
        open={true}
        onOpenChange={vi.fn()}
        title="Test Toast"
        {...props}
      />
    </ToastProvider>
  );
}

describe('Toast', () => {
  it('renders title', () => {
    renderToast({ title: 'Booking Confirmed' });
    expect(screen.getByText('Booking Confirmed')).toBeInTheDocument();
  });

  it('renders description when provided', () => {
    renderToast({ title: 'Done', description: 'Your booking is confirmed.' });
    expect(screen.getByText('Your booking is confirmed.')).toBeInTheDocument();
  });

  it('does not render description when not provided', () => {
    renderToast({ title: 'Done' });
    expect(screen.queryByText(/description/i)).not.toBeInTheDocument();
  });

  it('applies success variant classes', () => {
    const { container } = renderToast({ variant: 'success' });
    const toast = container.querySelector('[data-state]');
    expect(toast).toHaveClass('bg-utu-success-bg', 'text-utu-success-text');
  });

  it('applies error variant classes', () => {
    const { container } = renderToast({ variant: 'error' });
    const toast = container.querySelector('[data-state]');
    expect(toast).toHaveClass('bg-utu-error-bg', 'text-utu-error-text');
  });

  it('applies warning variant classes', () => {
    const { container } = renderToast({ variant: 'warning' });
    const toast = container.querySelector('[data-state]');
    expect(toast).toHaveClass('bg-utu-warning-bg');
  });

  it('calls onOpenChange(false) when dismiss button clicked', async () => {
    const onOpenChange = vi.fn();
    renderToast({ onOpenChange });
    await userEvent.click(screen.getByRole('button', { name: 'Dismiss notification' }));
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it('does not render when open is false', () => {
    renderToast({ open: false });
    expect(screen.queryByText('Test Toast')).not.toBeInTheDocument();
  });
});
