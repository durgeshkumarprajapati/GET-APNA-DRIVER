import type { ReactNode } from 'react';
import { EmptyState } from './empty-state';

export interface DataTableColumn<T> {
  key: string;
  header: string;
  render: (row: T) => ReactNode;
  align?: 'left' | 'right' | 'center';
}

interface DataTableProps<T> {
  columns: DataTableColumn<T>[];
  data: T[];
  keyExtractor: (row: T) => string;
  emptyMessage?: string;
  emptyIcon?: string;
}

const ALIGN_CLASS: Record<'left' | 'right' | 'center', string> = {
  left: 'text-left',
  right: 'text-right',
  center: 'text-center',
};

/**
 * Shared admin table shell — column definitions + row data in, a
 * consistently-styled table out. Replaces the pattern of every admin page
 * (drivers, reviews, settlements, treasury) hand-rolling its own
 * <table>/<thead>/<tbody> markup with the same classNames repeated each time.
 */
export function DataTable<T>({
  columns,
  data,
  keyExtractor,
  emptyMessage = 'No records found.',
  emptyIcon = 'table_rows',
}: DataTableProps<T>) {
  if (data.length === 0) {
    return <EmptyState icon={emptyIcon} message={emptyMessage} />;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left font-sans text-xs border-collapse">
        <thead>
          <tr className="bg-[#181c24] text-[#87948b] font-['Space_Grotesk'] uppercase border-b border-[#262a33]">
            {columns.map((col) => (
              <th key={col.key} className={`py-3 px-4 ${col.align ? ALIGN_CLASS[col.align] : ''}`}>
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-[#262a33] font-mono">
          {data.map((row) => (
            <tr key={keyExtractor(row)} className="hover:bg-[#181c24]/60 transition-colors">
              {columns.map((col) => (
                <td
                  key={col.key}
                  className={`py-3 px-4 ${col.align ? ALIGN_CLASS[col.align] : ''}`}
                >
                  {col.render(row)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
