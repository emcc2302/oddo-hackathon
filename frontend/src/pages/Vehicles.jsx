import { useEffect, useState } from 'react';
import Layout from '../components/Layout';
import Modal from '../components/Modal';
import StatusBadge from '../components/StatusBadge';
import client from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { validateRegistrationNumber, validateMaxLoad, validatePositiveNumber } from '../utils/validation';

const EMPTY_FORM = { registration_number: '', name: '', type: '', max_load_capacity: '', odometer: '', acquisition_cost: '', region: '' };

export default function Vehicles() {
  const { user } = useAuth();
  const toast = useToast();
  const canManage = user?.role === 'fleet_manager';
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [fieldErrors, setFieldErrors] = useState({});
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const load = () => {
    setLoading(true);
    client.get('/vehicles').then((res) => setVehicles(res.data)).finally(() => setLoading(false));
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional fetch-on-mount
    load();
  }, []);

  const openCreate = () => { setEditing(null); setForm(EMPTY_FORM); setError(''); setFieldErrors({}); setModalOpen(true); };
  const openEdit = (v) => {
    setEditing(v);
    setForm({ ...v, max_load_capacity: v.max_load_capacity, odometer: v.odometer, acquisition_cost: v.acquisition_cost });
    setError('');
    setFieldErrors({});
    setModalOpen(true);
  };

  const validate = () => {
    const errs = {};
    const regErr = validateRegistrationNumber(form.registration_number, vehicles, editing?.id);
    if (regErr) errs.registration_number = regErr;
    if (!form.name?.trim()) errs.name = 'Name / model is required.';
    if (!form.type?.trim()) errs.type = 'Vehicle type is required.';
    const capErr = validateMaxLoad(form.max_load_capacity);
    if (capErr) errs.max_load_capacity = capErr;
    if (form.odometer !== '' && form.odometer !== undefined) {
      const odoErr = validatePositiveNumber(form.odometer, 'Odometer');
      if (odoErr) errs.odometer = odoErr;
    }
    if (form.acquisition_cost !== '' && form.acquisition_cost !== undefined) {
      const costErr = validatePositiveNumber(form.acquisition_cost, 'Acquisition cost');
      if (costErr) errs.acquisition_cost = costErr;
    }
    setFieldErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!validate()) {
      toast.error('Fix the highlighted fields before saving.');
      return;
    }
    setSaving(true);
    try {
      const payload = { ...form, registration_number: form.registration_number.trim().toUpperCase() };
      if (editing) {
        await client.put(`/vehicles/${editing.id}`, payload);
        toast.success(`${payload.registration_number} updated.`);
      } else {
        await client.post('/vehicles', payload);
        toast.success(`${payload.registration_number} registered to the fleet.`);
      }
      setModalOpen(false);
      load();
    } catch (err) {
      const msg = err.response?.data?.error || 'Could not save the vehicle.';
      setError(msg);
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (v) => {
    if (!confirm(`Remove ${v.registration_number} from the registry?`)) return;
    try {
      await client.delete(`/vehicles/${v.id}`);
      toast.success(`${v.registration_number} removed.`);
      load();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Could not remove this vehicle.');
    }
  };

  const filtered = vehicles.filter((v) => {
    const matchesSearch = `${v.registration_number} ${v.name}`.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = !statusFilter || v.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <Layout title="Vehicle Registry">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
        <div className="flex flex-wrap gap-2">
          <input
            placeholder="Search registration or model…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input-field w-64 text-sm"
          />
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="input-field w-auto text-sm">
            <option value="">All statuses</option>
            {['Available', 'On Trip', 'In Shop', 'Retired'].map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        {canManage && <button onClick={openCreate} className="btn-primary">+ Register Vehicle</button>}
      </div>

      <div className="panel overflow-x-auto">
        <table className="w-full manifest-table">
          <thead>
            <tr>
              <th>Registration</th>
              <th>Model</th>
              <th>Type</th>
              <th>Capacity</th>
              <th>Odometer</th>
              <th>Status</th>
              <th>Region</th>
              {canManage && <th></th>}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={8} className="text-center py-8 text-ink/40 dark:text-paper/45">Loading fleet…</td></tr>
            ) : filtered.length === 0 ? (
                <tr><td colSpan={8} className="text-center py-8 text-ink/40 dark:text-paper/45">No vehicles match these filters.</td></tr>
            ) : filtered.map((v) => (
              <tr key={v.id}>
                <td className="font-mono">{v.registration_number}</td>
                <td>{v.name}</td>
                <td>{v.type}</td>
                <td className="font-mono">{Number(v.max_load_capacity).toLocaleString()} kg</td>
                <td className="font-mono">{Number(v.odometer).toLocaleString()} km</td>
                <td><StatusBadge status={v.status} /></td>
                <td className="text-ink/55 dark:text-paper/55">{v.region || '—'}</td>
                {canManage && (
                  <td className="text-right space-x-2 whitespace-nowrap">
                    <button onClick={() => openEdit(v)} className="text-xs font-medium text-signal-route">Edit</button>
                    <button onClick={() => handleDelete(v)} className="text-xs font-medium text-signal-alert">Remove</button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Edit Vehicle' : 'Register Vehicle'}>
        <form onSubmit={handleSubmit} className="space-y-3" noValidate>
          <div>
            <label className="board-eyebrow block mb-1.5">Registration Number</label>
            <input
              required
              disabled={!!editing}
              placeholder="WB-05-AB-1201"
              className={`input-field disabled:opacity-60 ${fieldErrors.registration_number ? '!border-signal-alert' : ''}`}
              value={form.registration_number}
              onChange={(e) => setForm({ ...form, registration_number: e.target.value })}
            />
            {fieldErrors.registration_number && <p className="text-xs text-signal-alert mt-1">{fieldErrors.registration_number}</p>}
          </div>
          <div>
            <label className="board-eyebrow block mb-1.5">Name / Model</label>
            <input required className={`input-field ${fieldErrors.name ? '!border-signal-alert' : ''}`} value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })} />
            {fieldErrors.name && <p className="text-xs text-signal-alert mt-1">{fieldErrors.name}</p>}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="board-eyebrow block mb-1.5">Type</label>
              <input required className={`input-field ${fieldErrors.type ? '!border-signal-alert' : ''}`} value={form.type}
                onChange={(e) => setForm({ ...form, type: e.target.value })} />
              {fieldErrors.type && <p className="text-xs text-signal-alert mt-1">{fieldErrors.type}</p>}
            </div>
            <div>
              <label className="board-eyebrow block mb-1.5">Max Load (kg)</label>
              <input required type="number" min="1" className={`input-field ${fieldErrors.max_load_capacity ? '!border-signal-alert' : ''}`} value={form.max_load_capacity}
                onChange={(e) => setForm({ ...form, max_load_capacity: e.target.value })} />
              {fieldErrors.max_load_capacity && <p className="text-xs text-signal-alert mt-1">{fieldErrors.max_load_capacity}</p>}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="board-eyebrow block mb-1.5">Odometer (km)</label>
              <input type="number" min="0" className={`input-field ${fieldErrors.odometer ? '!border-signal-alert' : ''}`} value={form.odometer}
                onChange={(e) => setForm({ ...form, odometer: e.target.value })} />
              {fieldErrors.odometer && <p className="text-xs text-signal-alert mt-1">{fieldErrors.odometer}</p>}
            </div>
            <div>
              <label className="board-eyebrow block mb-1.5">Acquisition Cost (₹)</label>
              <input type="number" min="0" className={`input-field ${fieldErrors.acquisition_cost ? '!border-signal-alert' : ''}`} value={form.acquisition_cost}
                onChange={(e) => setForm({ ...form, acquisition_cost: e.target.value })} />
              {fieldErrors.acquisition_cost && <p className="text-xs text-signal-alert mt-1">{fieldErrors.acquisition_cost}</p>}
            </div>
          </div>
          <div>
            <label className="board-eyebrow block mb-1.5">Region</label>
            <input className="input-field" value={form.region || ''} onChange={(e) => setForm({ ...form, region: e.target.value })} />
          </div>
          {editing && (
            <div>
              <label className="board-eyebrow block mb-1.5">Status</label>
              <select className="input-field" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
                {['Available', 'On Trip', 'In Shop', 'Retired'].map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          )}
          {error && <div className="text-sm text-signal-alert">{error}</div>}
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={() => setModalOpen(false)} className="btn-secondary">Cancel</button>
            <button type="submit" disabled={saving} className="btn-primary">
              {saving ? 'Saving…' : editing ? 'Save Changes' : 'Register Vehicle'}
            </button>
          </div>
        </form>
      </Modal>
    </Layout>
  );
}
