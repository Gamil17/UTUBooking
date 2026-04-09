import type { Meta, StoryObj } from '@storybook/react';
import { Card } from './Card';
import { Badge } from '../Badge/Badge';
import { Button } from '../Button/Button';

const meta: Meta<typeof Card> = {
  title: 'UI/Card',
  component: Card,
  tags: ['autodocs'],
};
export default meta;
type Story = StoryObj<typeof Card>;

export const Simple: Story = {
  render: () => (
    <Card.Root className="max-w-sm">
      <Card.Body>
        <p className="text-utu-text-primary">A simple card with just a body.</p>
      </Card.Body>
    </Card.Root>
  ),
};

export const WithHeader: Story = {
  render: () => (
    <Card.Root className="max-w-sm">
      <Card.Header>
        <h3 className="text-sm font-semibold text-utu-text-primary">Booking Summary</h3>
      </Card.Header>
      <Card.Body>
        <p className="text-sm text-utu-text-secondary">Makkah Hilton, 3 nights</p>
        <p className="text-lg font-bold text-utu-text-primary mt-2">SAR 1,890</p>
      </Card.Body>
    </Card.Root>
  ),
};

export const WithFooter: Story = {
  render: () => (
    <Card.Root className="max-w-sm">
      <Card.Header>
        <h3 className="text-sm font-semibold text-utu-text-primary">Hotel Near Al-Haram</h3>
      </Card.Header>
      <Card.Body>
        <p className="text-sm text-utu-text-secondary mb-3">
          Luxury 5-star accommodation 200m from the Grand Mosque.
        </p>
        <Badge variant="success" dot>Available</Badge>
      </Card.Body>
      <Card.Footer>
        <div className="flex items-center justify-between">
          <span className="text-sm font-semibold text-utu-text-primary">SAR 890 / night</span>
          <Button size="sm" variant="primary">Book Now</Button>
        </div>
      </Card.Footer>
    </Card.Root>
  ),
};

export const NavyHeader: Story = {
  render: () => (
    <Card.Root className="max-w-sm">
      <Card.Header colorClass="bg-utu-navy">
        <h3 className="text-sm font-semibold text-white">Umrah Package</h3>
        <p className="text-xs text-blue-200 mt-0.5">7 Days · Makkah + Madinah</p>
      </Card.Header>
      <Card.Body>
        <p className="text-sm text-utu-text-secondary">
          All-inclusive package including hotel, transport and guided tours.
        </p>
        <p className="text-xl font-bold text-utu-text-primary mt-3">SAR 4,200</p>
      </Card.Body>
      <Card.Footer>
        <Button size="sm" variant="primary" className="w-full">View Package</Button>
      </Card.Footer>
    </Card.Root>
  ),
};

export const Flat: Story = {
  render: () => (
    <Card.Root flat className="max-w-sm bg-utu-bg-muted">
      <Card.Body>
        <p className="text-sm text-utu-text-secondary">Flat card — no border or shadow.</p>
      </Card.Body>
    </Card.Root>
  ),
};

export const HotelSearchResult: Story = {
  render: () => (
    <Card.Root className="max-w-md">
      <Card.Body className="flex gap-4">
        <div className="w-24 h-20 rounded-lg bg-utu-bg-muted flex-shrink-0 flex items-center justify-center text-utu-text-muted text-xs">
          Photo
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <h3 className="text-sm font-semibold text-utu-text-primary leading-tight">
              Makkah Hilton & Towers
            </h3>
            <Badge variant="success" shape="pill" size="sm">5★</Badge>
          </div>
          <p className="text-xs text-utu-text-muted mt-1">200m from Al-Haram</p>
          <div className="flex items-center justify-between mt-3">
            <Badge variant="info" dot size="sm">Free cancellation</Badge>
            <div className="text-end">
              <p className="text-base font-bold text-utu-text-primary">SAR 890</p>
              <p className="text-xs text-utu-text-muted">per night</p>
            </div>
          </div>
        </div>
      </Card.Body>
    </Card.Root>
  ),
};
