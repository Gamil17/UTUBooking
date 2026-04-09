import * as React from 'react';
import { cn } from '@/lib/utils';

export interface ColumnDef<T = Record<string, unknown>> {
  key: string;
  header: string;
  width?: string;
  align?: 'start' | 'center' | 'end';
  render?: (value: unknown, row: T) => React.ReactNode;
}

// ── Table.Root ───────────────────────────────────────────────────────────────

export interface TableRootProps extends React.HTMLAttributes<HTMLDivElement> {
  dir?: 'ltr' | 'rtl';
}

function TableRoot({ dir, className, children, ...props }: TableRootProps) {
  return (
    <div dir={dir} className={cn('w-full overflow-x-auto rounded-utu-card border border-utu-border-default', className)} {...props}>
      <table className="w-full border-collapse text-sm">
        {children}
      </table>
    </div>
  );
}

// ── Table.Header ─────────────────────────────────────────────────────────────

export type TableHeaderProps = React.HTMLAttributes<HTMLTableSectionElement>;

function TableHeader({ className, children, ...props }: TableHeaderProps) {
  return (
    <thead className={cn('bg-utu-bg-muted', className)} {...props}>
      {children}
    </thead>
  );
}

// ── Table.Body ───────────────────────────────────────────────────────────────

export type TableBodyProps = React.HTMLAttributes<HTMLTableSectionElement>;

function TableBody({ className, children, ...props }: TableBodyProps) {
  return (
    <tbody className={cn('divide-y divide-utu-border-default', className)} {...props}>
      {children}
    </tbody>
  );
}

// ── Table.Row ────────────────────────────────────────────────────────────────

export interface TableRowProps extends React.HTMLAttributes<HTMLTableRowElement> {
  index?: number;
}

function TableRow({ index, className, children, ...props }: TableRowProps) {
  const isEven = typeof index === 'number' && index % 2 === 0;
  return (
    <tr
      className={cn(
        'transition-colors hover:bg-utu-blue-pale/50',
        isEven ? 'bg-utu-bg-muted' : 'bg-utu-bg-card',
        className,
      )}
      {...props}
    >
      {children}
    </tr>
  );
}

// ── Table.Cell (th + td) ─────────────────────────────────────────────────────

export interface TableHeadCellProps extends Omit<React.ThHTMLAttributes<HTMLTableCellElement>, 'align'> {
  align?: 'start' | 'center' | 'end';
}

function TableHeadCell({ align = 'start', className, children, ...props }: TableHeadCellProps) {
  return (
    <th
      className={cn(
        'px-4 py-3 text-[11px] font-semibold uppercase tracking-wider text-utu-text-secondary whitespace-nowrap',
        align === 'start' && 'text-start',
        align === 'center' && 'text-center',
        align === 'end' && 'text-end',
        className,
      )}
      {...props}
    >
      {children}
    </th>
  );
}

export interface TableCellProps extends Omit<React.TdHTMLAttributes<HTMLTableCellElement>, 'align'> {
  align?: 'start' | 'center' | 'end';
}

function TableCell({ align = 'start', className, children, ...props }: TableCellProps) {
  return (
    <td
      className={cn(
        'px-4 py-3 text-sm text-utu-text-primary',
        align === 'start' && 'text-start',
        align === 'center' && 'text-center',
        align === 'end' && 'text-end',
        className,
      )}
      {...props}
    >
      {children}
    </td>
  );
}

// ── Composed export ──────────────────────────────────────────────────────────

export const Table = Object.assign(TableRoot, {
  Root:      TableRoot,
  Header:    TableHeader,
  Body:      TableBody,
  Row:       TableRow,
  HeadCell:  TableHeadCell,
  Cell:      TableCell,
});
