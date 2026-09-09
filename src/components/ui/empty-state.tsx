interface EmptyStateProps {
  icon?: string;
  message: string;
}

/** Shared "nothing here" block, replacing repeated inline empty-state text divs. */
export function EmptyState({ icon = 'inbox', message }: EmptyStateProps) {
  return (
    <div className="p-8 rounded-xl border border-[#262a33] bg-[#181c24] text-center flex flex-col items-center gap-2">
      <span className="material-symbols-outlined text-3xl text-[#87948b]">{icon}</span>
      <p className="text-sm text-[#87948b]">{message}</p>
    </div>
  );
}
