export default function KPICard({ label, value, unit, accent = 'transit', hint }) {
  const accentClass = {
    transit: 'text-signal-transit',
    route: 'text-signal-route',
    amber: 'text-signal-amber',
    alert: 'text-signal-alert',
    ink: 'text-ink dark:text-paper',
  }[accent];

  return (
    <div className="panel px-5 py-4 flex flex-col gap-2 min-w-[150px]">
      <span className="board-eyebrow">{label}</span>
      <div className="flex items-baseline gap-1.5">
        <span className={`flip-digit ${accentClass}`}>{value}</span>
        {unit && <span className="text-xs font-mono text-ink/40 dark:text-paper/40">{unit}</span>}
      </div>
      {hint && <span className="text-xs text-ink/45 dark:text-paper/45">{hint}</span>}
    </div>
  );
}
