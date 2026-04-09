import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Table } from './Table';

function renderBookingsTable(dir?: 'ltr' | 'rtl') {
  return render(
    <Table.Root dir={dir}>
      <Table.Header>
        <tr>
          <Table.HeadCell>ID</Table.HeadCell>
          <Table.HeadCell>Guest</Table.HeadCell>
          <Table.HeadCell align="end">Amount</Table.HeadCell>
        </tr>
      </Table.Header>
      <Table.Body>
        <Table.Row index={0}>
          <Table.Cell>UTU-001</Table.Cell>
          <Table.Cell>Ahmed Hassan</Table.Cell>
          <Table.Cell align="end">SAR 1,890</Table.Cell>
        </Table.Row>
        <Table.Row index={1}>
          <Table.Cell>UTU-002</Table.Cell>
          <Table.Cell>Fatima Al-Amin</Table.Cell>
          <Table.Cell align="end">SAR 2,100</Table.Cell>
        </Table.Row>
      </Table.Body>
    </Table.Root>
  );
}

describe('Table', () => {
  it('renders header cells', () => {
    renderBookingsTable();
    expect(screen.getByText('ID')).toBeInTheDocument();
    expect(screen.getByText('Guest')).toBeInTheDocument();
    expect(screen.getByText('Amount')).toBeInTheDocument();
  });

  it('renders body cells', () => {
    renderBookingsTable();
    expect(screen.getByText('Ahmed Hassan')).toBeInTheDocument();
    expect(screen.getByText('SAR 1,890')).toBeInTheDocument();
  });

  it('alternating rows: even index gets muted bg', () => {
    renderBookingsTable();
    const rows = screen.getAllByRole('row').slice(1); // skip header row
    expect(rows[0]).toHaveClass('bg-utu-bg-muted');  // index 0 = even
    expect(rows[1]).toHaveClass('bg-utu-bg-card');   // index 1 = odd
  });

  it('header cells have muted text style', () => {
    renderBookingsTable();
    const idTh = screen.getByRole('columnheader', { name: 'ID' });
    expect(idTh).toHaveClass('text-utu-text-secondary');
  });

  it('end-aligned cells get text-end class', () => {
    renderBookingsTable();
    const amountHeader = screen.getByRole('columnheader', { name: 'Amount' });
    expect(amountHeader).toHaveClass('text-end');
  });

  it('renders with dir attribute for RTL', () => {
    renderBookingsTable('rtl');
    const wrapper = screen.getByRole('table').parentElement;
    expect(wrapper).toHaveAttribute('dir', 'rtl');
  });

  it('Root has rounded card and border', () => {
    const { container } = render(<Table.Root />);
    expect(container.firstChild).toHaveClass('rounded-utu-card', 'border-utu-border-default');
  });
});
