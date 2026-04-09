'use client';

import type { Meta, StoryObj } from '@storybook/react';
import * as React from 'react';
import { SegmentedControl } from './SegmentedControl';

const meta: Meta<typeof SegmentedControl> = {
  title: 'UI/SegmentedControl',
  component: SegmentedControl,
  tags: ['autodocs'],
  argTypes: {
    size: { control: 'select', options: ['sm', 'md'] },
  },
};
export default meta;
type Story = StoryObj<typeof SegmentedControl>;

function Controlled({ options, size = 'md', dir }: {
  options: { value: string; label: string }[];
  size?: 'sm' | 'md';
  dir?: 'ltr' | 'rtl';
}) {
  const [value, setValue] = React.useState(options[0].value);
  return (
    <SegmentedControl
      options={options}
      value={value}
      onChange={setValue}
      size={size}
      dir={dir}
      aria-label="Tab selector"
    />
  );
}

export const BookingType: Story = {
  render: () => (
    <Controlled options={[
      { value: 'hotels',  label: 'Hotels' },
      { value: 'flights', label: 'Flights' },
      { value: 'cars',    label: 'Cars' },
    ]} />
  ),
};

export const NightsSelector: Story = {
  render: () => (
    <Controlled options={[
      { value: '3',  label: '3 Nights' },
      { value: '5',  label: '5 Nights' },
      { value: '7',  label: '7 Nights' },
      { value: '14', label: '14 Nights' },
    ]} />
  ),
};

export const SmallSize: Story = {
  render: () => (
    <Controlled
      size="sm"
      options={[
        { value: 'grid', label: 'Grid' },
        { value: 'list', label: 'List' },
      ]}
    />
  ),
};

export const RTL: Story = {
  render: () => (
    <div dir="rtl">
      <Controlled
        dir="rtl"
        options={[
          { value: 'hotels',  label: 'فنادق' },
          { value: 'flights', label: 'رحلات' },
          { value: 'cars',    label: 'سيارات' },
        ]}
      />
    </div>
  ),
};
