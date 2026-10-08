'use client';

interface PaginationProps {
  page: number;
  pageSize: number;
  total: number;
  onPageChange: (page: number) => void;
}

/**
 * Shared Previous/Next pager, replacing the inline page/totalPages buttons
 * previously hand-rolled per-page (e.g. admin/drivers).
 */
export function Pagination({ page, pageSize, total, onPageChange }: PaginationProps) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  if (totalPages <= 1) return null;

  return (
    <div className="flex items-center justify-between text-xs font-mono text-on-surface-variant">
      <span>
        Page {page} of {totalPages} ({total} total)
      </span>
      <div className="flex items-center gap-2">
        <button
          type="button"
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
          className="px-3 py-1.5 rounded-lg bg-surface-container border border-border text-on-surface disabled:opacity-40 hover:bg-surface-container-high transition-colors"
        >
          Previous
        </button>
        <button
          type="button"
          disabled={page >= totalPages}
          onClick={() => onPageChange(page + 1)}
          className="px-3 py-1.5 rounded-lg bg-surface-container border border-border text-on-surface disabled:opacity-40 hover:bg-surface-container-high transition-colors"
        >
          Next
        </button>
      </div>
    </div>
  );
}
