import type { Meta, StoryObj } from '@storybook/react';
import { Search, ArrowRight, Trash2 } from 'lucide-react';
import { Button } from './Button';

const meta: Meta<typeof Button> = {
  title: 'UI/Button',
  component: Button,
  tags: ['autodocs'],
  argTypes: {
    variant:   { control: 'select', options: ['primary', 'secondary', 'ghost', 'danger'] },
    size:      { control: 'select', options: ['sm', 'md', 'lg'] },
    isLoading: { control: 'boolean' },
    disabled:  { control: 'boolean' },
  },
};
export default meta;
type Story = StoryObj<typeof Button>;

// ── Single Stories ────────────────────────────────────────────────────────────

export const Primary: Story = {
  args: { variant: 'primary', children: 'Book Now', size: 'md' },
};

export const Secondary: Story = {
  args: { variant: 'secondary', children: 'View Details', size: 'md' },
};

export const Ghost: Story = {
  args: { variant: 'ghost', children: 'Cancel', size: 'md' },
};

export const Danger: Story = {
  args: { variant: 'danger', children: 'Delete Booking', size: 'md' },
};

export const Loading: Story = {
  args: { variant: 'primary', children: 'Processing…', isLoading: true, size: 'md' },
};

export const Disabled: Story = {
  args: { variant: 'primary', children: 'Unavailable', disabled: true, size: 'md' },
};

export const WithIcon: Story = {
  args: {
    variant: 'primary',
    size: 'md',
    children: (
      <>
        <Search size={16} aria-hidden="true" />
        Search Hotels
      </>
    ),
  },
};

export const WithTrailingIcon: Story = {
  args: {
    variant: 'secondary',
    size: 'md',
    children: (
      <>
        Continue
        <ArrowRight size={16} aria-hidden="true" />
      </>
    ),
  },
};

// ── All Variants × Sizes Grid ─────────────────────────────────────────────────

export const AllVariants: Story = {
  render: () => (
    <div className="flex flex-col gap-6">
      {(['sm', 'md', 'lg'] as const).map((size) => (
        <div key={size} className="flex flex-wrap items-center gap-3">
          <span className="w-6 text-xs text-utu-text-muted uppercase">{size}</span>
          {(['primary', 'secondary', 'ghost', 'danger'] as const).map((variant) => (
            <Button key={variant} variant={variant} size={size}>
              {variant.charAt(0).toUpperCase() + variant.slice(1)}
            </Button>
          ))}
        </div>
      ))}
    </div>
  ),
};

// ── RTL ───────────────────────────────────────────────────────────────────────

export const RTL: Story = {
  render: () => (
    <div dir="rtl" className="flex flex-wrap gap-3">
      <Button variant="primary">احجز الآن</Button>
      <Button variant="secondary">عرض التفاصيل</Button>
      <Button variant="ghost">إلغاء</Button>
      <Button variant="danger" size="sm">
        <Trash2 size={14} aria-hidden="true" />
        حذف
      </Button>
    </div>
  ),
};
