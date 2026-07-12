import { useEffect, useState } from 'react';
import Layout from '../components/Layout';
import Modal from '../components/Modal';
import StatusBadge from '../components/StatusBadge';
import client from '../api/client';
import { useAuth } from '../context/AuthContext';

const EMPTY_FORM = { vehicle_id: '', service_type: '', description: '', cost: '' };

export default function Maintenance() {
  const { user } = useAuth();
  const canManage = user?.role === 'fleet_manager';
  const [records, setRecords] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [error, setError] = useState('');

  const load = () => {
    setLoading(true);
    Promise.all([client.get('/maintenance'), client.get('/vehicles')])
      .then(([m, v]) => { setRecords(m.data); setVehicles(v.data); })
      .finally(() => setLoading(false));
  };
  useEffect(load, []);

  const openCreate = () => { setForm(EMPTY_FORM); setError(''); setModalOpen(true); };

  const handleCreate = async (e) => {
    e.preventDefault();
    setError('');
    try {
      await client.post('/maintenance', form);
      setModalOpen(false);
      load();
    } catch (err) {
      setError(err.response?.data?.error || 'Could not create the maintenance record.');
    }
  };

  const closeRecord = async (id) => {
    try {
      await client.post(`/maintenance/${id}/close`);
      load();
    } catch (err) {
      alert(err.response?.data?.error || 'Could not close this record.');
    }
  };

  const eligibleVehicles = vehicles.filter((v) => v.status !== 'On Trip');

  return (
    <Layout title="Maintenance">
      <div className="flex items-center justify-between mb-5">
        <p className="text-sm text-ink/55 dark:text-paper/55 max-w-lg">
          Opening a record automatically moves the vehicle to <span className="font-medium">In Shop</span>, removing it from dispatch until every open record on it is closed.
        </p>
        {canManage && <button onClick={openCreate} className="btn-primary shrink-0">+ Log Maintenance</button>}
      </div>

      <div className="panel overflow-x-auto">
        <table className="w-full manifest-table">
          <thead>
            <tr>
              <th>Vehicle</th>
              <th>Service</th>
              <th>Cost</th>
              <th>Opened</th>
              <th>Status</th>
              {canManage && <th></th>}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={6} className="text-center py-8 text-ink/40">Loading records…</td></tr>
            ) : records.length === 0 ? (
              <tr><td colSpan={6} className="text-center py-8 text-ink/40">No maintenance records yet.</td></tr>
            ) : records.map((r) => (
              <tr key={r.id}>
                <td className="font-mono">{r.registration_number}</td>
                <td>
                  <div className="font-medium">{r.service_type}</div>
                  {r.description && <div className="text-xs text-ink/45 dark:text-paper/45">{r.description}</div>}
                </td>
                <td className="font-mono">₹{Number(r.cost).toLocaleString()}</td>
                <td className="text-ink/55 dark:text-paper/55">{new Date(r.opened_at).toLocaleDateString('en-IN')}</td>
                <td><StatusBadge status={r.status} /></td>
                {canManage && (
                  <td className="text-right">
                    {r.status === 'Open' && (
                      <button onClick={() => closeRecord(r.id)} className="text-xs font-medium text-signal-transit">Close Record</button>
                    )}
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Log Maintenance">
        <form onSubmit={handleCreate} className="space-y-3">
          <div>
            <label className="board-eyebrow block mb-1.5">Vehicle</label>
            <select required className="input-field" value={form.vehicle_id} onChange={(e) => setForm({ ...form, vehicle_id: e.target.value })}>
              <option value="">Select a vehicle…</option>
              {eligibleVehicles.map((v) => (
                <option key={v.id} value={v.id}>{v.registration_number} — {v.name} ({v.status})</option>
              ))}
            </select>
          </div>
          <div>
            <label className="board-eyebrow block mb-1.5">Service Type</label>
            <input required placeholder="Oil Change, Brake Service…" className="input-field" value={form.service_type}
              onChange={(e) => setForm({ ...form, service_type: e.target.value })} />
          </div>
          <div>
            <label className="board-eyebrow block mb-1.5">Description</label>
            <textarea className="input-field" rows={2} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          </div>
          <div>
            <label className="board-eyebrow block mb-1.5">Estimated Cost (₹)</label>
            <input type="number" className="input-field" value={form.cost} onChange={(e) => setForm({ ...form, cost: e.target.value })} />
          </div>
          {error && <div className="text-sm text-signal-alert">{error}</div>}
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={() => setModalOpen(false)} className="btn-secondary">Cancel</button>
            <button type="submit" className="btn-primary">Log Record</button>
          </div>
        </form>
      </Modal>
    </Layout>
  );
}
