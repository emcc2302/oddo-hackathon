import { useState } from 'react';
import Layout from '../components/Layout';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';

const ROLE_LABELS = {
  fleet_manager: 'Fleet Manager',
  driver: 'Driver',
  safety_officer: 'Safety Officer',
  financial_analyst: 'Financial Analyst',
};

const ROLES = ['fleet_manager', 'driver', 'safety_officer', 'financial_analyst'];

// This mirrors the authorize(...) calls enforced by the API in every route file —
// it is a description of the real rules, not a separate/editable copy of them.
const MODULES = [
  {
    name: 'Dashboard & Reports',
    view: ROLES,
    manage: [],
    note: 'Read-only for every role; CSV export available to all.',
  },
  {
    name: 'Vehicle Registry',
    view: ROLES,
    manage: ['fleet_manager'],
    note: 'Only Fleet Managers can register, edit, or remove vehicles.',
  },
  {
    name: 'Driver Management',
    view: ROLES,
    manage: ['fleet_manager', 'safety_officer'],
    manageNote: 'remove: fleet_manager only',
    note: 'Fleet Managers and Safety Officers can add/edit drivers; only Fleet Managers can remove one.',
  },
  {
    name: 'Trip Dispatch',
    view: ROLES,
    manage: ['fleet_manager', 'driver'],
    note: 'Fleet Managers and Drivers can create, dispatch, complete, or cancel trips.',
  },
  {
    name: 'Maintenance',
    view: ROLES,
    manage: ['fleet_manager'],
    note: 'Only Fleet Managers can open or close maintenance records.',
  },
  {
    name: 'Fuel & Expenses',
    view: ROLES,
    manage: ['fleet_manager', 'driver', 'financial_analyst'],
    note: 'Fleet Managers, Drivers, and Financial Analysts can log fuel and expense entries.',
  },
];

const DEFAULT_GENERAL = {
  depotName: 'Kolkata Depot',
  currency: 'INR (₹)',
  distanceUnit: 'Kilometers',
};

const CURRENCIES = ['INR (₹)', 'USD ($)', 'EUR (€)', 'GBP (£)'];
const DISTANCE_UNITS = ['Kilometers', 'Miles'];

function Cell({ can }) {
  return can ? (
    <span className="inline-flex items-center justify-center w-5 h-5 rounded bg-signal-transit/15 text-signal-transit text-xs font-bold">✓</span>
  ) : (
    <span className="inline-flex items-center justify-center w-5 h-5 text-ink/20 dark:text-paper/20 text-xs">—</span>
  );
}

export default function Settings() {
  const { user } = useAuth();
  const toast = useToast();
  const isFleetManager = user?.role === 'fleet_manager';

  const [general, setGeneral] = useState(() => {
    try {
      const stored = localStorage.getItem('transitops_general_settings');
      return stored ? { ...DEFAULT_GENERAL, ...JSON.parse(stored) } : DEFAULT_GENERAL;
    } catch {
      return DEFAULT_GENERAL;
    }
  });
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  const validate = () => {
    const errs = {};
    if (!general.depotName?.trim()) errs.depotName = 'Depot name is required.';
    else if (general.depotName.trim().length < 2) errs.depotName = 'Depot name is too short.';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSave = (e) => {
    e.preventDefault();
    if (!isFleetManager) {
      toast.error('Only Fleet Managers can change depot settings.');
      return;
    }
    if (!validate()) {
      toast.error('Fix the highlighted fields before saving.');
      return;
    }
    setSaving(true);
    try {
      localStorage.setItem('transitops_general_settings', JSON.stringify(general));
      toast.success('Depot settings saved.');
    } catch {
      toast.error('Could not save settings on this device.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Layout title="Settings & RBAC">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="panel p-5 lg:col-span-1 h-fit">
          <div className="board-eyebrow mb-3">Account</div>
          <div className="space-y-3 text-sm">
            <div>
              <div className="text-ink/45 dark:text-paper/45 text-xs">Name</div>
              <div className="font-medium">{user?.name}</div>
            </div>
            <div>
              <div className="text-ink/45 dark:text-paper/45 text-xs">Email</div>
              <div className="font-medium">{user?.email}</div>
            </div>
            <div>
              <div className="text-ink/45 dark:text-paper/45 text-xs">Role</div>
              <div className="font-medium">{ROLE_LABELS[user?.role] || user?.role}</div>
            </div>
            <div>
              <div className="text-ink/45 dark:text-paper/45 text-xs">Region</div>
              <div className="font-medium">{user?.region || '—'}</div>
            </div>
          </div>
          <p className="mt-4 text-xs text-ink/45 dark:text-paper/45">
            Roles are fixed at account creation. Contact a Fleet Manager to change a teammate's access.
          </p>
        </div>

        <div className="panel p-5 lg:col-span-2">
          <div className="board-eyebrow mb-1">General</div>
          <p className="text-xs text-ink/50 dark:text-paper/50 mb-4">
            Depot-wide display preferences. Stored on this device{isFleetManager ? '' : ' — view only for your role'}.
          </p>
          <form onSubmit={handleSave} className="space-y-3 max-w-sm" noValidate>
            <div>
              <label className="board-eyebrow block mb-1.5">Depot Name</label>
              <input
                disabled={!isFleetManager}
                className={`input-field disabled:opacity-60 ${errors.depotName ? '!border-signal-alert' : ''}`}
                value={general.depotName}
                onChange={(e) => setGeneral({ ...general, depotName: e.target.value })}
              />
              {errors.depotName && <p className="text-xs text-signal-alert mt-1">{errors.depotName}</p>}
            </div>
            <div>
              <label className="board-eyebrow block mb-1.5">Currency</label>
              <select
                disabled={!isFleetManager}
                className="input-field disabled:opacity-60"
                value={general.currency}
                onChange={(e) => setGeneral({ ...general, currency: e.target.value })}
              >
                {CURRENCIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="board-eyebrow block mb-1.5">Distance Unit</label>
              <select
                disabled={!isFleetManager}
                className="input-field disabled:opacity-60"
                value={general.distanceUnit}
                onChange={(e) => setGeneral({ ...general, distanceUnit: e.target.value })}
              >
                {DISTANCE_UNITS.map((u) => <option key={u} value={u}>{u}</option>)}
              </select>
            </div>
            {isFleetManager && (
              <button type="submit" disabled={saving} className="btn-primary">
                {saving ? 'Saving…' : 'Save changes'}
              </button>
            )}
          </form>
        </div>

        <div className="panel p-5 lg:col-span-3 overflow-x-auto">
          <div className="board-eyebrow mb-1">Role-Based Access Control</div>
          <p className="text-xs text-ink/50 dark:text-paper/50 mb-4">
            What each role can view and manage. These permissions are enforced by the API on every request — this
            table just shows you the same rules.
          </p>
          <table className="w-full manifest-table">
            <thead>
              <tr>
                <th>Module</th>
                {ROLES.map((r) => (
                  <th key={r} className="text-center">{ROLE_LABELS[r]}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {MODULES.map((m) => (
                <tr key={m.name}>
                  <td>
                    <div className="font-medium">{m.name}</div>
                    <div className="text-xs text-ink/45 dark:text-paper/45">{m.note}</div>
                  </td>
                  {ROLES.map((r) => (
                    <td key={r} className="text-center">
                      <Cell can={m.manage.includes(r)} />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
          <div className="mt-4 flex items-center gap-4 text-xs text-ink/50 dark:text-paper/50">
            <span className="flex items-center gap-1.5">
              <span className="inline-flex items-center justify-center w-4 h-4 rounded bg-signal-transit/15 text-signal-transit text-[10px] font-bold">✓</span>
              Can create / edit / act
            </span>
            <span className="flex items-center gap-1.5">
              <span className="inline-flex items-center justify-center w-4 h-4 text-ink/20 dark:text-paper/20 text-[10px]">—</span>
              View only
            </span>
          </div>
        </div>
      </div>
    </Layout>
  );
}
