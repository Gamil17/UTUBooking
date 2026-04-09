import type { Meta, StoryObj } from '@storybook/react';
import { Search, Eye, MapPin } from 'lucide-react';
import { Input } from './Input';

const meta: Meta<typeof Input> = {
  title: 'UI/Input',
  component: Input,
  tags: ['autodocs'],
  argTypes: {
    disabled: { control: 'boolean' },
  },
};
export default meta;
type Story = StoryObj<typeof Input>;

export const Default: Story = {
  args: { label: 'Destination', placeholder: 'Makkah, Saudi Arabia' },
};

export const WithHelper: Story = {
  args: {
    label: 'Email',
    placeholder: 'you@example.com',
    helperText: 'We will send your booking confirmation here.',
  },
};

export const WithError: Story = {
  args: {
    label: 'Phone Number',
    placeholder: '+966 50 000 0000',
    error: 'Please enter a valid Saudi mobile number.',
    defaultValue: '123',
  },
};

export const WithLeftIcon: Story = {
  args: {
    label: 'Search',
    placeholder: 'Search hotels…',
    leftIcon: <Search size={16} />,
  },
};

export const WithBothIcons: Story = {
  args: {
    label: 'Location',
    placeholder: 'Enter city or hotel name',
    leftIcon: <MapPin size={16} />,
    rightIcon: <Eye size={16} />,
  },
};

export const Disabled: Story = {
  args: {
    label: 'Booking Reference',
    defaultValue: 'UTU-2026-88441',
    disabled: true,
  },
};

export const RTL: Story = {
  render: () => (
    <div dir="rtl" className="flex flex-col gap-4 max-w-sm">
      <Input
        dir="rtl"
        label="الوجهة"
        placeholder="مكة المكرمة، المملكة العربية السعودية"
        leftIcon={<MapPin size={16} />}
      />
      <Input
        dir="rtl"
        label="البريد الإلكتروني"
        placeholder="you@example.com"
        error="الرجاء إدخال بريد إلكتروني صحيح"
      />
    </div>
  ),
};

export const AllStates: Story = {
  render: () => (
    <div className="flex flex-col gap-4 max-w-sm">
      <Input label="Default" placeholder="Enter text…" />
      <Input label="With Value" defaultValue="Makkah Hilton" />
      <Input label="With Helper" placeholder="Check-in date" helperText="Format: DD/MM/YYYY" />
      <Input label="Error State" defaultValue="bad-input" error="This field is required." />
      <Input label="Disabled" defaultValue="Read only value" disabled />
      <Input label="With Icon" placeholder="Search…" leftIcon={<Search size={16} />} />
    </div>
  ),
};
