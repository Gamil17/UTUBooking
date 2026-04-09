'use client';

import type { Meta, StoryObj } from '@storybook/react';
import * as React from 'react';
import { Toast, ToastProvider, useToast } from './Toast';
import { Button } from '../Button/Button';

const meta: Meta<typeof Toast> = {
  title: 'UI/Toast',
  component: Toast,
  tags: ['autodocs'],
  argTypes: {
    variant: { control: 'select', options: ['success', 'info', 'warning', 'error'] },
  },
  decorators: [
    (Story) => (
      <ToastProvider>
        <Story />
      </ToastProvider>
    ),
  ],
};
export default meta;
type Story = StoryObj<typeof Toast>;

export const Static: Story = {
  render: () => (
    <ToastProvider>
      <div className="relative h-48 flex items-center justify-center">
        <Toast
          open={true}
          onOpenChange={() => {}}
          variant="success"
          title="Booking Confirmed"
          description="Your reservation at Makkah Hilton has been confirmed. Check your email for details."
        />
      </div>
    </ToastProvider>
  ),
};

export const AllVariants: Story = {
  render: () => (
    <ToastProvider>
      <div className="flex flex-col gap-3 max-w-sm">
        {(['success', 'info', 'warning', 'error'] as const).map((v) => (
          <Toast
            key={v}
            open={true}
            onOpenChange={() => {}}
            variant={v}
            title={
              v === 'success' ? 'Booking Confirmed' :
              v === 'info'    ? 'Reminder: Check-in Tomorrow' :
              v === 'warning' ? 'Passport Expiry Soon' :
                                'Payment Failed'
            }
            description={
              v === 'success' ? 'Makkah Hilton — 10–13 Mar' :
              v === 'info'    ? 'Pullman Zamzam, 12 Mar 2026' :
              v === 'warning' ? 'Your passport expires in 30 days.' :
                                'Please check your card details and try again.'
            }
          />
        ))}
      </div>
    </ToastProvider>
  ),
};

// Interactive demo using useToast hook
function ToastDemo() {
  const { toasts, toast, dismiss } = useToast();
  return (
    <ToastProvider>
      <div className="flex flex-wrap gap-3">
        <Button size="sm" variant="primary" onClick={() => toast({ variant: 'success', title: 'Booking Confirmed!', description: 'Makkah Hilton — 3 nights' })}>
          Success
        </Button>
        <Button size="sm" variant="secondary" onClick={() => toast({ variant: 'info', title: 'Reminder', description: 'Check-in is tomorrow at 3:00 PM.' })}>
          Info
        </Button>
        <Button size="sm" variant="ghost" onClick={() => toast({ variant: 'warning', title: 'Action Required', description: 'Please complete your profile.' })}>
          Warning
        </Button>
        <Button size="sm" variant="danger" onClick={() => toast({ variant: 'error', title: 'Payment Failed', description: 'Please try a different card.' })}>
          Error
        </Button>
      </div>
      {toasts.map((t) => (
        <Toast key={t.id} {...t} onOpenChange={(open) => !open && dismiss(t.id)} />
      ))}
    </ToastProvider>
  );
}

export const Interactive: Story = {
  render: () => <ToastDemo />,
};
