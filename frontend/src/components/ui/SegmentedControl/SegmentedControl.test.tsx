import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SegmentedControl } from './SegmentedControl';

const options = [
  { value: 'hotels',  label: 'Hotels' },
  { value: 'flights', label: 'Flights' },
  { value: 'cars',    label: 'Cars' },
];

describe('SegmentedControl', () => {
  it('renders all options', () => {
    render(<SegmentedControl options={options} value="hotels" onChange={vi.fn()} />);
    expect(screen.getByText('Hotels')).toBeInTheDocument();
    expect(screen.getByText('Flights')).toBeInTheDocument();
    expect(screen.getByText('Cars')).toBeInTheDocument();
  });

  it('marks active option as aria-checked', () => {
    render(<SegmentedControl options={options} value="flights" onChange={vi.fn()} />);
    expect(screen.getByRole('radio', { name: 'Flights' })).toHaveAttribute('aria-checked', 'true');
    expect(screen.getByRole('radio', { name: 'Hotels' })).toHaveAttribute('aria-checked', 'false');
  });

  it('active option has navy bg class', () => {
    render(<SegmentedControl options={options} value="hotels" onChange={vi.fn()} />);
    expect(screen.getByRole('radio', { name: 'Hotels' })).toHaveClass('bg-utu-navy');
  });

  it('calls onChange with correct value on click', async () => {
    const onChange = vi.fn();
    render(<SegmentedControl options={options} value="hotels" onChange={onChange} />);
    await userEvent.click(screen.getByRole('radio', { name: 'Flights' }));
    expect(onChange).toHaveBeenCalledWith('flights');
  });

  it('does not call onChange for disabled option', async () => {
    const onChange = vi.fn();
    const withDisabled = [...options, { value: 'trains', label: 'Trains', disabled: true }];
    render(<SegmentedControl options={withDisabled} value="hotels" onChange={onChange} />);
    const trains = screen.getByRole('radio', { name: 'Trains' });
    expect(trains).toBeDisabled();
    await userEvent.click(trains);
    expect(onChange).not.toHaveBeenCalled();
  });

  it('renders group role with aria-label', () => {
    render(
      <SegmentedControl
        options={options}
        value="hotels"
        onChange={vi.fn()}
        aria-label="Booking type"
      />
    );
    expect(screen.getByRole('group', { name: 'Booking type' })).toBeInTheDocument();
  });

  it('applies dir attribute for RTL', () => {
    render(<SegmentedControl options={options} value="hotels" onChange={vi.fn()} dir="rtl" />);
    expect(screen.getByRole('group')).toHaveAttribute('dir', 'rtl');
  });
});
