import type { Meta, StoryObj } from '@storybook/react';
import { Table } from './Table';
import { Badge } from '../Badge/Badge';

const meta: Meta<typeof Table> = {
  title: 'UI/Table',
  component: Table,
  tags: ['autodocs'],
};
export default meta;
type Story = StoryObj<typeof Table>;

const bookings = [
  { id: 'UTU-001', guest: 'Ahmed Hassan',   hotel: 'Makkah Hilton',         dates: '10–13 Mar', nights: 3, amount: 'SAR 2,670', status: 'confirmed' as const },
  { id: 'UTU-002', guest: 'Fatima Al-Amin',  hotel: 'Pullman Zamzam',        dates: '12–15 Mar', nights: 3, amount: 'SAR 3,450', status: 'pending'   as const },
  { id: 'UTU-003', guest: 'Mohammed Qureshi', hotel: 'Le Meridien Madinah',   dates: '15–18 Mar', nights: 3, amount: 'SAR 1,890', status: 'confirmed' as const },
  { id: 'UTU-004', guest: 'Sara Al-Rashid',   hotel: 'InterContinental Makkah', dates: '18–22 Mar', nights: 4, amount: 'SAR 5,200', status: 'cancelled' as const },
  { id: 'UTU-005', guest: 'Omar Farouq',      hotel: 'Dar Al Taqwa',          dates: '20–23 Mar', nights: 3, amount: 'SAR 2,100', status: 'confirmed' as const },
];

const statusVariant = {
  confirmed: 'success',
  pending:   'info',
  cancelled: 'error',
} as const;

export const BookingsList: Story = {
  render: () => (
    <Table.Root>
      <Table.Header>
        <tr>
          <Table.HeadCell>Booking ID</Table.HeadCell>
          <Table.HeadCell>Guest</Table.HeadCell>
          <Table.HeadCell>Hotel</Table.HeadCell>
          <Table.HeadCell>Dates</Table.HeadCell>
          <Table.HeadCell align="end">Amount</Table.HeadCell>
          <Table.HeadCell align="center">Status</Table.HeadCell>
        </tr>
      </Table.Header>
      <Table.Body>
        {bookings.map((b, i) => (
          <Table.Row key={b.id} index={i}>
            <Table.Cell className="font-mono text-xs text-utu-text-muted">{b.id}</Table.Cell>
            <Table.Cell className="font-medium">{b.guest}</Table.Cell>
            <Table.Cell className="text-utu-text-secondary">{b.hotel}</Table.Cell>
            <Table.Cell className="text-utu-text-secondary">{b.dates}</Table.Cell>
            <Table.Cell align="end" className="font-semibold">{b.amount}</Table.Cell>
            <Table.Cell align="center">
              <Badge variant={statusVariant[b.status]} dot shape="pill" size="sm">
                {b.status.charAt(0).toUpperCase() + b.status.slice(1)}
              </Badge>
            </Table.Cell>
          </Table.Row>
        ))}
      </Table.Body>
    </Table.Root>
  ),
};

export const RTL: Story = {
  render: () => (
    <Table.Root dir="rtl">
      <Table.Header>
        <tr>
          <Table.HeadCell>رقم الحجز</Table.HeadCell>
          <Table.HeadCell>الضيف</Table.HeadCell>
          <Table.HeadCell>الفندق</Table.HeadCell>
          <Table.HeadCell align="end">المبلغ</Table.HeadCell>
          <Table.HeadCell align="center">الحالة</Table.HeadCell>
        </tr>
      </Table.Header>
      <Table.Body>
        {bookings.slice(0, 3).map((b, i) => (
          <Table.Row key={b.id} index={i}>
            <Table.Cell className="font-mono text-xs text-utu-text-muted">{b.id}</Table.Cell>
            <Table.Cell className="font-medium">{b.guest}</Table.Cell>
            <Table.Cell className="text-utu-text-secondary">{b.hotel}</Table.Cell>
            <Table.Cell align="end" className="font-semibold">{b.amount}</Table.Cell>
            <Table.Cell align="center">
              <Badge variant={statusVariant[b.status]} dot shape="pill" size="sm">
                {b.status}
              </Badge>
            </Table.Cell>
          </Table.Row>
        ))}
      </Table.Body>
    </Table.Root>
  ),
};
