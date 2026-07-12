import { useEffect, useState } from 'react';
import Layout from '../components/Layout';
import Modal from '../components/Modal';
import StatusBadge from '../components/StatusBadge';
import client from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { validatePhone, validateLicenseNumber, validateSafetyScore, validateLicenseExpiry } from '../utils/validation';

const EMPTY_FORM = { name: '', license_number: '', license_category: '', license_expiry: '', contact_number: '', safety_score: 100, region: '' };

export default function Drivers() {
  const { user } = useAuth();
  const toast = useToast();
  const canManage = user?.role === 'fleet_manager' || user?.role === 'safety_officer';
  const canDelete = user?.role === 'fleet_manager';
  const [drivers, setDrivers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [fieldErrors, setFieldErrors] = useState({});
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const load = () => {
    setLoading(true);
    client.get('/drivers').then((res) => setDrivers(res.data)).finally(() => setLoading(false));
  };
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional fetch-on-mount
    load();
  }, []);

  const openCreate = () => { setEditing(null); setForm(EMPTY_FORM); setError(''); setFieldErrors({}); setModalOpen(true); };
  const openEdit = (d) => {
    setEditing(d);
    setForm({ ...d, license_expiry: d.license_expiry?.slice(0, 10) });
    setError('');
    setFieldErrors({});
    setModalOpen(true);
  };

  const validate = () => {
    const errs = {};
    if (!form.name?.trim()) errs.name = 'Full name is required.';

    const licenseErr = validateLicenseNumber(form.license_number, drivers, editing?.id);
    if (licenseErr) errs.license_number = licenseErr;

    if (!form.license_category?.trim()) errs.license_category = 'License category is required.';

    const expiryErr = validateLicenseExpiry(form.license_expiry);
    if (expiryErr) errs.license_expiry = expiryErr;

    const phoneErr = validatePhone(form.contact_number);
    if (phoneErr) errs.contact_number = phoneErr;

    const scoreErr = validateSafetyScore(form.safety_score);
    if (scoreErr) errs.safety_score = scoreErr;

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
      const payload = {
        ...form,
        license_number: form.license_number.trim().toUpperCase(),
        contact_number: form.contact_number ? form.contact_number.replace(/\D/g, '') : '',
      };
      if (editing) {
        await client.put(`/drivers/${editing.id}`, payload);
        toast.success(`${payload.name}'s profile updated.`);
      } else {
        await client.post('/drivers', payload);
        toast.success(`${payload.name} added to the roster.`);
      }
      setModalOpen(false);
      load();
    } catch (err) {
      const msg = err.response?.data?.error || 'Could not save the driver.';
      setError(msg);
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (d) => {
    if (!confirm(`Remove ${d.name} from the driver roster?`)) return;
    try {
      await client.delete(`/drivers/${d.id}`);
      toast.success(`${d.name} removed from the roster.`);
      load();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Could not remove this driver.');
    }
  };

  const isExpired = (d) => new Date(d.license_expiry) < new Date();

  const filtered = drivers.filter((d) => `${d.name} ${d.license_number}`.toLowerCase().includes(search.toLowerCase()));

  return (
    <Layout title="Drivers">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
        <input
          placeholder="Search name or license number…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="input-field w-72 text-sm"
        />
        {canManage && <button onClick={openCreate} className="btn-primary">+ Add Driver</button>}
      </div>

      <div className="panel overflow-x-auto">
        <table className="w-full manifest-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>License No.</th>
              <th>Category</th>
              <th>Expiry</th>
              <th>Safety Score</th>
              <th>Status</th>
              {canManage && <th></th>}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={7} className="text-center py-8 text-ink/40 dark:text-paper/45">Loading roster…</td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={7} className="text-center py-8 text-ink/40 dark:text-paper/45">No drivers match this search.</td></tr>
            ) : filtered.map((d) => (
              <tr key={d.id}>
                <td className="font-medium">{d.name}</td>
                <td className="font-mono">{d.license_number}</td>
                <td>{d.license_category}</td>
                <td className={`font-mono ${isExpired(d) ? 'text-signal-alert' : ''}`}>
                  {new Date(d.license_expiry).toLocaleDateString('en-IN')}
                  {isExpired(d) && <span className="ml-1.5 text-[10px] uppercase">Expired</span>}
                </td>
                <td className="font-mono">{Number(d.safety_score).toFixed(1)}</td>
                <td><StatusBadge status={d.status} /></td>
                {canManage && (
                  <td className="text-right space-x-2 whitespace-nowrap">
                    <button onClick={() => openEdit(d)} className="text-xs font-medium text-signal-route">Edit</button>
                    {canDelete && <button onClick={() => handleDelete(d)} className="text-xs font-medium text-signal-alert">Remove</button>}
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Edit Driver' : 'Add Driver'}>
        <form onSubmit={handleSubmit} className="space-y-3" noValidate>
          <div>
            <label className="board-eyebrow block mb-1.5">Full Name</label>
            <input required className={`input-field ${fieldErrors.name ? '!border-signal-alert' : ''}`} value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })} />
            {fieldErrors.name && <p className="text-xs text-signal-alert mt-1">{fieldErrors.name}</p>}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="board-eyebrow block mb-1.5">License Number</label>
              <input required disabled={!!editing} className={`input-field disabled:opacity-60 ${fieldErrors.license_number ? '!border-signal-alert' : ''}`} value={form.license_number}
                onChange={(e) => setForm({ ...form, license_number: e.target.value })} />
              {fieldErrors.license_number && <p className="text-xs text-signal-alert mt-1">{fieldErrors.license_number}</p>}
            </div>
            <div>
              <label className="board-eyebrow block mb-1.5">Category</label>
              <input required placeholder="LMV / HMV" className={`input-field ${fieldErrors.license_category ? '!border-signal-alert' : ''}`} value={form.license_category}
                onChange={(e) => setForm({ ...form, license_category: e.target.value })} />
              {fieldErrors.license_category && <p className="text-xs text-signal-alert mt-1">{fieldErrors.license_category}</p>}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="board-eyebrow block mb-1.5">License Expiry</label>
              <input required type="date" className={`input-field ${fieldErrors.license_expiry ? '!border-signal-alert' : ''}`} value={form.license_expiry}
                onChange={(e) => setForm({ ...form, license_expiry: e.target.value })} />
              {fieldErrors.license_expiry && <p className="text-xs text-signal-alert mt-1">{fieldErrors.license_expiry}</p>}
            </div>
            <div>
              <label className="board-eyebrow block mb-1.5">Contact Number</label>
              <input
                placeholder="9876543210"
                maxLength={10}
                inputMode="numeric"
                className={`input-field ${fieldErrors.contact_number ? '!border-signal-alert' : ''}`}
                value={form.contact_number || ''}
                onChange={(e) => setForm({ ...form, contact_number: e.target.value.replace(/\D/g, '').slice(0, 10) })}
              />
              {fieldErrors.contact_number && <p className="text-xs text-signal-alert mt-1">{fieldErrors.contact_number}</p>}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="board-eyebrow block mb-1.5">Safety Score (0–100)</label>
              <input type="number" min="0" max="100" step="0.1" className={`input-field ${fieldErrors.safety_score ? '!border-signal-alert' : ''}`} value={form.safety_score}
                onChange={(e) => setForm({ ...form, safety_score: e.target.value })} />
              {fieldErrors.safety_score && <p className="text-xs text-signal-alert mt-1">{fieldErrors.safety_score}</p>}
            </div>
            <div>
              <label className="board-eyebrow block mb-1.5">Region</label>
              <input className="input-field" value={form.region || ''} onChange={(e) => setForm({ ...form, region: e.target.value })} />
            </div>
          </div>
          {editing && (
            <div>
              <label className="board-eyebrow block mb-1.5">Status</label>
              <select className="input-field" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
                {['Available', 'On Trip', 'Off Duty', 'Suspended'].map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          )}
          {error && <div className="text-sm text-signal-alert">{error}</div>}
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={() => setModalOpen(false)} className="btn-secondary">Cancel</button>
            <button type="submit" disabled={saving} className="btn-primary">
              {saving ? 'Saving…' : editing ? 'Save Changes' : 'Add Driver'}
            </button>
          </div>
        </form>
      </Modal>
    </Layout>
  );
}
