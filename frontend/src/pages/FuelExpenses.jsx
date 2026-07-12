import { useEffect, useState } from 'react';
import Layout from '../components/Layout';
import Modal from '../components/Modal';
import client from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { validatePositiveNumber } from '../utils/validation';

const EMPTY_FUEL = { vehicle_id: '', liters: '', cost: '', log_date: '' };
const EMPTY_EXPENSE = { vehicle_id: '', category: 'Toll', amount: '', expense_date: '', notes: '' };

export default function FuelExpenses() {
  const { user } = useAuth();
  const toast = useToast();
  const canManage = ['fleet_manager', 'driver', 'financial_analyst'].includes(user?.role);
  const [tab, setTab] = useState('fuel');
  const [fuelLogs, setFuelLogs] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [fuelModal, setFuelModal] = useState(false);
  const [expenseModal, setExpenseModal] = useState(false);
  const [fuelForm, setFuelForm] = useState(EMPTY_FUEL);
  const [expenseForm, setExpenseForm] = useState(EMPTY_EXPENSE);
  const [fuelErrors, setFuelErrors] = useState({});
  const [expenseErrors, setExpenseErrors] = useState({});
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const load = () => {
    setLoading(true);
    Promise.all([client.get('/fuel-logs'), client.get('/expenses'), client.get('/vehicles')])
      .then(([f, e, v]) => { setFuelLogs(f.data); setExpenses(e.data); setVehicles(v.data); })
      .finally(() => setLoading(false));
  };
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional fetch-on-mount
    load();
  }, []);

  const validateFuel = () => {
    const errs = {};
    if (!fuelForm.vehicle_id) errs.vehicle_id = 'Select a vehicle.';
    const litersErr = validatePositiveNumber(fuelForm.liters, 'Liters');
    if (!fuelForm.liters || litersErr || Number(fuelForm.liters) <= 0) errs.liters = 'Liters must be greater than 0.';
    const costErr = validatePositiveNumber(fuelForm.cost, 'Cost');
    if (fuelForm.cost === '' || costErr) errs.cost = costErr || 'Cost is required.';
    setFuelErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const submitFuel = async (e) => {
    e.preventDefault();
    setError('');
    if (!validateFuel()) {
      toast.error('Fix the highlighted fields before saving.');
      return;
    }
    setSaving(true);
    try {
      await client.post('/fuel-logs', fuelForm);
      toast.success('Fuel log saved.');
      setFuelModal(false);
      setFuelForm(EMPTY_FUEL);
      load();
    } catch (err) {
      const msg = err.response?.data?.error || 'Could not save the fuel log.';
      setError(msg);
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  const validateExpense = () => {
    const errs = {};
    if (!expenseForm.vehicle_id) errs.vehicle_id = 'Select a vehicle.';
    const amountErr = validatePositiveNumber(expenseForm.amount, 'Amount');
    if (expenseForm.amount === '' || amountErr) errs.amount = amountErr || 'Amount is required.';
    setExpenseErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const submitExpense = async (e) => {
    e.preventDefault();
    setError('');
    if (!validateExpense()) {
      toast.error('Fix the highlighted fields before saving.');
      return;
    }
    setSaving(true);
    try {
      await client.post('/expenses', expenseForm);
      toast.success('Expense saved.');
      setExpenseModal(false);
      setExpenseForm(EMPTY_EXPENSE);
      load();
    } catch (err) {
      const msg = err.response?.data?.error || 'Could not save the expense.';
      setError(msg);
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Layout title="Fuel & Expenses">
      <div className="flex items-center gap-1 mb-5 border-b border-paper-line dark:border-ink-line">
        {[['fuel', 'Fuel Logs'], ['expenses', 'Other Expenses']].map(([key, label]) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors ${tab === key ? 'border-signal-transit text-signal-transit' : 'border-transparent text-ink/50 dark:text-paper/50'
              }`}
          >
            {label}
          </button>
        ))}
        <div className="flex-1" />
        {canManage && (tab === 'fuel'
          ? <button onClick={() => { setFuelForm(EMPTY_FUEL); setError(''); setFuelErrors({}); setFuelModal(true); }} className="btn-primary !py-1.5 mb-1">+ Add Fuel Log</button>
          : <button onClick={() => { setExpenseForm(EMPTY_EXPENSE); setError(''); setExpenseErrors({}); setExpenseModal(true); }} className="btn-primary !py-1.5 mb-1">+ Add Expense</button>)}
      </div>

      {tab === 'fuel' ? (
        <div className="panel overflow-x-auto">
          <table className="w-full manifest-table">
            <thead><tr><th>Vehicle</th><th>Date</th><th>Liters</th><th>Cost</th></tr></thead>
            <tbody>
              {loading ? <tr><td colSpan={4} className="text-center py-8 text-ink/40">Loading fuel logs…</td></tr>
                : fuelLogs.length === 0 ? <tr><td colSpan={4} className="text-center py-8 text-ink/40">No fuel logs recorded yet.</td></tr>
                  : fuelLogs.map((f) => (
                    <tr key={f.id}>
                      <td className="font-mono">{f.registration_number}</td>
                      <td className="text-ink/55 dark:text-paper/55">{new Date(f.log_date).toLocaleDateString('en-IN')}</td>
                      <td className="font-mono">{Number(f.liters).toFixed(1)} L</td>
                      <td className="font-mono">₹{Number(f.cost).toLocaleString()}</td>
                    </tr>
                  ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="panel overflow-x-auto">
          <table className="w-full manifest-table">
            <thead><tr><th>Vehicle</th><th>Category</th><th>Date</th><th>Amount</th><th>Notes</th></tr></thead>
            <tbody>
              {loading ? <tr><td colSpan={5} className="text-center py-8 text-ink/40">Loading expenses…</td></tr>
                : expenses.length === 0 ? <tr><td colSpan={5} className="text-center py-8 text-ink/40">No expenses recorded yet.</td></tr>
                  : expenses.map((e) => (
                    <tr key={e.id}>
                      <td className="font-mono">{e.registration_number}</td>
                      <td>{e.category}</td>
                      <td className="text-ink/55 dark:text-paper/55">{new Date(e.expense_date).toLocaleDateString('en-IN')}</td>
                      <td className="font-mono">₹{Number(e.amount).toLocaleString()}</td>
                      <td className="text-ink/45 dark:text-paper/45">{e.notes || '—'}</td>
                    </tr>
                  ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal open={fuelModal} onClose={() => setFuelModal(false)} title="Add Fuel Log">
        <form onSubmit={submitFuel} className="space-y-3" noValidate>
          <div>
            <label className="board-eyebrow block mb-1.5">Vehicle</label>
            <select required className={`input-field ${fuelErrors.vehicle_id ? '!border-signal-alert' : ''}`} value={fuelForm.vehicle_id} onChange={(e) => setFuelForm({ ...fuelForm, vehicle_id: e.target.value })}>
              <option value="">Select a vehicle…</option>
              {vehicles.map((v) => <option key={v.id} value={v.id}>{v.registration_number} — {v.name}</option>)}
            </select>
            {fuelErrors.vehicle_id && <p className="text-xs text-signal-alert mt-1">{fuelErrors.vehicle_id}</p>}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="board-eyebrow block mb-1.5">Liters</label>
              <input required type="number" min="0.1" step="0.1" className={`input-field ${fuelErrors.liters ? '!border-signal-alert' : ''}`} value={fuelForm.liters} onChange={(e) => setFuelForm({ ...fuelForm, liters: e.target.value })} />
              {fuelErrors.liters && <p className="text-xs text-signal-alert mt-1">{fuelErrors.liters}</p>}
            </div>
            <div>
              <label className="board-eyebrow block mb-1.5">Cost (₹)</label>
              <input required type="number" min="0" className={`input-field ${fuelErrors.cost ? '!border-signal-alert' : ''}`} value={fuelForm.cost} onChange={(e) => setFuelForm({ ...fuelForm, cost: e.target.value })} />
              {fuelErrors.cost && <p className="text-xs text-signal-alert mt-1">{fuelErrors.cost}</p>}
            </div>
          </div>
          <div>
            <label className="board-eyebrow block mb-1.5">Date</label>
            <input type="date" className="input-field" value={fuelForm.log_date} onChange={(e) => setFuelForm({ ...fuelForm, log_date: e.target.value })} />
          </div>
          {error && <div className="text-sm text-signal-alert">{error}</div>}
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={() => setFuelModal(false)} className="btn-secondary">Cancel</button>
            <button type="submit" disabled={saving} className="btn-primary">{saving ? 'Saving…' : 'Save Fuel Log'}</button>
          </div>
        </form>
      </Modal>

      <Modal open={expenseModal} onClose={() => setExpenseModal(false)} title="Add Expense">
        <form onSubmit={submitExpense} className="space-y-3" noValidate>
          <div>
            <label className="board-eyebrow block mb-1.5">Vehicle</label>
            <select required className={`input-field ${expenseErrors.vehicle_id ? '!border-signal-alert' : ''}`} value={expenseForm.vehicle_id} onChange={(e) => setExpenseForm({ ...expenseForm, vehicle_id: e.target.value })}>
              <option value="">Select a vehicle…</option>
              {vehicles.map((v) => <option key={v.id} value={v.id}>{v.registration_number} — {v.name}</option>)}
            </select>
            {expenseErrors.vehicle_id && <p className="text-xs text-signal-alert mt-1">{expenseErrors.vehicle_id}</p>}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="board-eyebrow block mb-1.5">Category</label>
              <select className="input-field" value={expenseForm.category} onChange={(e) => setExpenseForm({ ...expenseForm, category: e.target.value })}>
                {['Toll', 'Parking', 'Permit', 'Fine', 'Other'].map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="board-eyebrow block mb-1.5">Amount (₹)</label>
              <input required type="number" min="0" className={`input-field ${expenseErrors.amount ? '!border-signal-alert' : ''}`} value={expenseForm.amount} onChange={(e) => setExpenseForm({ ...expenseForm, amount: e.target.value })} />
              {expenseErrors.amount && <p className="text-xs text-signal-alert mt-1">{expenseErrors.amount}</p>}
            </div>
          </div>
          <div>
            <label className="board-eyebrow block mb-1.5">Date</label>
            <input type="date" className="input-field" value={expenseForm.expense_date} onChange={(e) => setExpenseForm({ ...expenseForm, expense_date: e.target.value })} />
          </div>
          <div>
            <label className="board-eyebrow block mb-1.5">Notes</label>
            <input className="input-field" value={expenseForm.notes} onChange={(e) => setExpenseForm({ ...expenseForm, notes: e.target.value })} />
          </div>
          {error && <div className="text-sm text-signal-alert">{error}</div>}
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={() => setExpenseModal(false)} className="btn-secondary">Cancel</button>
            <button type="submit" disabled={saving} className="btn-primary">{saving ? 'Saving…' : 'Save Expense'}</button>
          </div>
        </form>
      </Modal>
    </Layout>
  );
}
