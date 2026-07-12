import { useAuth } from '../context/AuthContext';
import ThemeToggle from './ThemeToggle';

const ROLE_LABELS = {
  fleet_manager: 'Fleet Manager',
  driver: 'Driver',
  safety_officer: 'Safety Officer',
  financial_analyst: 'Financial Analyst',
};

export default function Topbar({ title, onMenuClick }) {
  const { user, logout } = useAuth();
  const now = new Date();

  return (
    <header className="sticky top-0 z-20 bg-paper/90 dark:bg-ink/90 backdrop-blur border-b border-paper-line dark:border-ink-line">
      <div className="flex items-center justify-between px-4 md:px-8 py-3.5">
        <div className="flex items-center gap-3">
          <button
            className="md:hidden text-ink/60 dark:text-paper/60"
            onClick={onMenuClick}
            aria-label="Open menu"
          >
            ☰
          </button>
          <div>
            <h1 className="font-display font-semibold text-lg md:text-xl">{title}</h1>
            <div className="board-eyebrow mt-0.5">
              {now.toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <ThemeToggle />
          <div className="hidden sm:flex flex-col items-end">
            <span className="text-sm font-medium leading-none">{user?.name}</span>
            <span className="board-eyebrow mt-1">{ROLE_LABELS[user?.role] || user?.role}</span>
          </div>
          <button onClick={logout} className="btn-secondary !px-3 !py-1.5 text-xs">
            Sign out
          </button>
        </div>
      </div>
    </header>
  );
}
