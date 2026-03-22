interface StatusChipProps {
  label: string;
  colorClass: string;
}

export default function StatusChip({ label, colorClass }: StatusChipProps) {
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-bold ${colorClass}`}>
      {label}
    </span>
  );
}
