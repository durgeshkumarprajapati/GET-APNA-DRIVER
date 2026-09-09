interface LoadingStateProps {
  message?: string;
}

/** Shared loading spinner, replacing the repeated inline animate-spin divs. */
export function LoadingState({ message = 'Loading…' }: LoadingStateProps) {
  return (
    <div className="py-16 flex flex-col items-center gap-3 text-[#87948b] text-sm">
      <div className="w-8 h-8 rounded-full border-4 border-[#262a33] border-t-[#68dba9] animate-spin" />
      <span>{message}</span>
    </div>
  );
}
