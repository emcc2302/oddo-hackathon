import { NavLink } from 'react-router-dom';

const NAV = [
  { to: '/', label: 'Dashboard', code: 'OPS' },
  { to: '/vehicles', label: 'Vehicle Registry', code: 'VEH' },
  { to: '/drivers', label: 'Drivers', code: 'DRV' },
  { to: '/trips', label: 'Trips', code: 'TRP' },
  { to: '/maintenance', label: 'Maintenance', code: 'MNT' },
  { to: '/fuel-expenses', label: 'Fuel &amp; Expenses', code: 'FUE', raw: 'Fuel & Expenses' },
  { to: '/reports', label: 'Reports', code: 'RPT' },
  { to: '/settings', label: 'Settings & RBAC', code: 'SET' },
];

export default function Sidebar({ open, onClose }) {
  return (
    <>
      {open && <div className="fixed inset-0 bg-ink/40 z-30 md:hidden" onClick={onClose} />}
      <aside
        className={`fixed md:sticky z-40 top-0 left-0 h-dvh w-64 bg-paper-raised dark:bg-ink-raised border-r border-paper-line dark:border-ink-line flex flex-col transition-transform duration-200 ${open ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
          }`}
      >
        <div className="px-5 py-5 border-b border-paper-line dark:border-ink-line">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded bg-signal-transit flex items-center justify-center text-white font-display font-bold text-sm">
              T
            </div>
            <div>
              <div className="font-display font-semibold text-sm leading-none">TransitOps</div>
              <div className="board-eyebrow mt-1">Operations Board</div>
            </div>
          </div>
        </div>

        <nav className="flex-1 py-4 px-3 space-y-0.5 overflow-y-auto">
          {NAV.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              onClick={onClose}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-md text-sm transition-colors group ${isActive
                  ? 'bg-signal-transit/10 text-signal-transit font-medium'
                  : 'text-ink/65 dark:text-paper/65 hover:bg-ink/5 dark:hover:bg-paper/5'
                }`
              }
            >
              <span className="font-mono text-[10px] w-8 shrink-0 tracking-wide text-ink/35 dark:text-paper/35 group-[.font-medium]:text-signal-transit">
                {item.code}
              </span>
              <span>{item.raw || item.label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="px-5 py-4 border-t border-paper-line dark:border-ink-line">
          <div className="board-eyebrow">Fleet Status</div>
          <div className="mt-1.5 text-xs text-ink/55 dark:text-paper/55">All systems reporting</div>
        </div>
      </aside>
    </>
  );
}
