import type { Meta, StoryObj } from '@storybook/react';
import { Badge } from './Badge';

const meta: Meta<typeof Badge> = {
  title: 'UI/Badge',
  component: Badge,
  tags: ['autodocs'],
  argTypes: {
    variant: { control: 'select', options: ['success', 'info', 'warning', 'error', 'neutral'] },
    shape:   { control: 'select', options: ['tag', 'pill'] },
    size:    { control: 'select', options: ['sm', 'md'] },
    dot:     { control: 'boolean' },
  },
};
export default meta;
type Story = StoryObj<typeof Badge>;

export const Default: Story = {
  args: { children: 'Confirmed', variant: 'success' },
};

export const AllVariants: Story = {
  render: () => (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap gap-2">
        <span className="text-xs text-utu-text-muted w-16">Tag</span>
        {(['success', 'info', 'warning', 'error', 'neutral'] as const).map((v) => (
          <Badge key={v} variant={v} shape="tag">{v}</Badge>
        ))}
      </div>
      <div className="flex flex-wrap gap-2">
        <span className="text-xs text-utu-text-muted w-16">Pill</span>
        {(['success', 'info', 'warning', 'error', 'neutral'] as const).map((v) => (
          <Badge key={v} variant={v} shape="pill">{v}</Badge>
        ))}
      </div>
      <div className="flex flex-wrap gap-2">
        <span className="text-xs text-utu-text-muted w-16">With dot</span>
        {(['success', 'info', 'warning', 'error', 'neutral'] as const).map((v) => (
          <Badge key={v} variant={v} dot>{v}</Badge>
        ))}
      </div>
      <div className="flex flex-wrap gap-2">
        <span className="text-xs text-utu-text-muted w-16">Small</span>
        {(['success', 'info', 'warning', 'error', 'neutral'] as const).map((v) => (
          <Badge key={v} variant={v} size="sm" dot>{v}</Badge>
        ))}
      </div>
    </div>
  ),
};

export const BookingStatuses: Story = {
  render: () => (
    <div className="flex flex-wrap gap-2">
      <Badge variant="success" dot shape="pill">Confirmed</Badge>
      <Badge variant="info" dot shape="pill">Pending Payment</Badge>
      <Badge variant="warning" dot shape="pill">Check-in Today</Badge>
      <Badge variant="error" dot shape="pill">Cancelled</Badge>
      <Badge variant="neutral" shape="tag">Draft</Badge>
    </div>
  ),
};

export const HotelAmenities: Story = {
  render: () => (
    <div className="flex flex-wrap gap-1.5">
      {['Halal Food', 'Prayer Room', 'Free WiFi', 'Free Cancellation', 'Breakfast Included',
        'Airport Transfer', 'Zamzam Water', 'Haram View'].map((tag) => (
        <Badge key={tag} variant="neutral" shape="tag" size="sm">{tag}</Badge>
      ))}
    </div>
  ),
};
