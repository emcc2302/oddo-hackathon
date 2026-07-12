const STATUS_STYLES = {
  Available: 'text-signal-transit border-signal-transit/40 bg-signal-transit/10',
  'On Trip': 'text-signal-route border-signal-route/40 bg-signal-route/10',
  'In Shop': 'text-signal-amber border-signal-amber/40 bg-signal-amber/10',
  Retired: 'text-ink/40 dark:text-paper/40 border-ink/20 dark:border-paper/20 bg-ink/5 dark:bg-paper/5',
  'Off Duty': 'text-ink/50 dark:text-paper/50 border-ink/20 dark:border-paper/20 bg-ink/5 dark:bg-paper/5',
  Suspended: 'text-signal-alert border-signal-alert/40 bg-signal-alert/10',
  Draft: 'text-ink/50 dark:text-paper/50 border-ink/20 dark:border-paper/20 bg-ink/5 dark:bg-paper/5',
  Dispatched: 'text-signal-route border-signal-route/40 bg-signal-route/10',
  Completed: 'text-signal-transit border-signal-transit/40 bg-signal-transit/10',
  Cancelled: 'text-signal-alert border-signal-alert/40 bg-signal-alert/10',
  Open: 'text-signal-amber border-signal-amber/40 bg-signal-amber/10',
  Closed: 'text-signal-transit border-signal-transit/40 bg-signal-transit/10',
};

export default function StatusBadge({ status }) {
  const style = STATUS_STYLES[status] || 'text-ink/50 border-ink/20 bg-ink/5';
  return (
    <span className={`badge ${style}`}>
      <span className="w-1.5 h-1.5 rounded-full bg-current" />
      {status}
    </span>
  );
}
