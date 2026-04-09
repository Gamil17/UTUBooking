import type { Meta, StoryObj } from '@storybook/react';
import { User } from 'lucide-react';
import { Avatar, AvatarGroup } from './Avatar';

const meta: Meta<typeof Avatar> = {
  title: 'UI/Avatar',
  component: Avatar,
  tags: ['autodocs'],
  argTypes: {
    size:        { control: 'select', options: [28, 36, 44, 56] },
    colorScheme: { control: 'select', options: ['navy', 'green', 'amber', 'red', 'sky', 'slate', 'icon'] },
  },
};
export default meta;
type Story = StoryObj<typeof Avatar>;

export const WithInitials: Story = {
  args: { initials: 'AH', size: 44, colorScheme: 'navy', alt: 'Ahmed Hassan' },
};

export const WithIcon: Story = {
  args: { icon: <User size={18} />, size: 44, colorScheme: 'icon', alt: 'Guest user' },
};

export const AllColorSchemes: Story = {
  render: () => (
    <div className="flex flex-wrap gap-4 items-end">
      {(['navy', 'green', 'amber', 'red', 'sky', 'slate', 'icon'] as const).map((cs) => (
        <div key={cs} className="flex flex-col items-center gap-1.5">
          <Avatar
            initials={cs === 'icon' ? undefined : cs.slice(0, 2).toUpperCase()}
            icon={cs === 'icon' ? <User size={18} /> : undefined}
            colorScheme={cs}
            size={44}
            alt={cs}
          />
          <span className="text-[10px] text-utu-text-muted">{cs}</span>
        </div>
      ))}
    </div>
  ),
};

export const AllSizes: Story = {
  render: () => (
    <div className="flex flex-wrap gap-4 items-end">
      {([28, 36, 44, 56] as const).map((size) => (
        <div key={size} className="flex flex-col items-center gap-1.5">
          <Avatar initials="AH" size={size} colorScheme="navy" alt="Ahmed Hassan" />
          <span className="text-[10px] text-utu-text-muted">{size}px</span>
        </div>
      ))}
    </div>
  ),
};

export const Group: Story = {
  render: () => (
    <div className="flex flex-col gap-6">
      <AvatarGroup
        size={36}
        avatars={[
          { initials: 'AH', colorScheme: 'navy', alt: 'Ahmed' },
          { initials: 'FA', colorScheme: 'green', alt: 'Fatima' },
          { initials: 'MK', colorScheme: 'amber', alt: 'Mohammed' },
          { initials: 'SA', colorScheme: 'sky', alt: 'Sara' },
          { initials: 'OM', colorScheme: 'red', alt: 'Omar' },
          { initials: 'LH', colorScheme: 'slate', alt: 'Layla' },
        ]}
        max={4}
      />
      <p className="text-xs text-utu-text-muted">6 travelers, showing 4 + overflow badge</p>
    </div>
  ),
};
