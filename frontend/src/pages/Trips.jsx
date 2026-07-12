import { useEffect, useState } from 'react';
import Layout from '../components/Layout';
import Modal from '../components/Modal';
import StatusBadge from '../components/StatusBadge';
import client from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { validateCargoWeight, validatePositiveNumber } from '../utils/validation';

const EMPTY_FORM = { source: '', destination: '', vehicle_id: '', driver_id: '', cargo_weight: '', planned_distance: '' };
const EMPTY_COMPLETE = { final_odometer: '', fuel_consumed: '', fuel_cost: '', revenue: '' };

export default function Trips() {
  const { user } = useAuth();
  const toast = useToast();
  const canManage = user?.role === 'fleet_manager' || user?.role === 'driver';
  const [trips, setTrips] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [drivers, setDrivers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [completeModal, setCompleteModal] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [completeForm, setCompleteForm] = useState(EMPTY_COMPLETE);
  const [fieldErrors, setFieldErrors] = useState({});
  const [completeErrors, setCompleteErrors] = useState({});
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const load = () => {
    setLoading(true);
    Promise.all([
      client.get('/trips'),
      client.get('/vehicles', { params: { dispatchable: true } }),
      client.get('/drivers', { params: { dispatchable: true } }),
    ]).then(([t, v, d]) => {
      setTrips(t.data);
      setVehicles(v.data);
      setDrivers(d.data);
    }).finally(() => setLoading(false));
  };
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional fetch-on-mount
    load();
  }, []);

  const openCreate = () => { setForm(EMPTY_FORM); setError(''); setFieldErrors({}); setModalOpen(true); };

  const validateCreate = () => {
    const errs = {};
    if (!form.source?.trim()) errs.source = 'Source is required.';
    if (!form.destination?.trim()) errs.destination = 'Destination is required.';
    if (!form.vehicle_id) errs.vehicle_id = 'Select a vehicle.';
    if (!form.driver_id) errs.driver_id = 'Select a driver.';

    const selectedVehicle = vehicles.find((v) => String(v.id) === String(form.vehicle_id));
    const cargoErr = validateCargoWeight(form.cargo_weight, selectedVehicle?.max_load_capacity);
    if (cargoErr) errs.cargo_weight = cargoErr;

    const distErr = validatePositiveNumber(form.planned_distance, 'Planned distance');
    if (distErr || Number(form.planned_distance) <= 0) errs.planned_distance = 'Planned distance must be greater than 0.';

    setFieldErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    setError('');
    if (!validateCreate()) {
      toast.error('Fix the highlighted fields before creating the trip.');
      return;
    }
    setSaving(true);
    try {
      await client.post('/trips', form);
      toast.success(`Trip ${form.source} → ${form.destination} created as Draft.`);
      setModalOpen(false);
      load();
    } catch (err) {
      const msg = err.response?.data?.error || 'Could not create the trip.';
      setError(msg);
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  const act = async (id, action) => {
    try {
      await client.post(`/trips/${id}/${action}`);
      const verb = { dispatch: 'dispatched', cancel: 'cancelled' }[action] || action;
      toast.success(`Trip ${verb}.`);
      load();
    } catch (err) {
      toast.error(err.response?.data?.error || `Could not ${action} the trip.`);
    }
  };

  const openComplete = (trip) => { setCompleteModal(trip); setCompleteForm(EMPTY_COMPLETE); setError(''); setCompleteErrors({}); };

  const validateComplete = () => {
    const errs = {};
    const odoErr = validatePositiveNumber(completeForm.final_odometer, 'Final odometer');
    if (!completeForm.final_odometer || odoErr) errs.final_odometer = odoErr || 'Final odometer is required.';
    if (completeForm.fuel_consumed !== '') {
      const fuelErr = validatePositiveNumber(completeForm.fuel_consumed, 'Fuel consumed');
      if (fuelErr) errs.fuel_consumed = fuelErr;
    }
    if (completeForm.fuel_cost !== '') {
      const costErr = validatePositiveNumber(completeForm.fuel_cost, 'Fuel cost');
      if (costErr) errs.fuel_cost = costErr;
    }
    if (completeForm.revenue !== '') {
      const revErr = validatePositiveNumber(completeForm.revenue, 'Revenue');
      if (revErr) errs.revenue = revErr;
    }
    setCompleteErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleComplete = async (e) => {
    e.preventDefault();
    setError('');
    if (!validateComplete()) {
      toast.error('Fix the highlighted fields before completing this trip.');
      return;
    }
    setSaving(true);
    try {
      await client.post(`/trips/${completeModal.id}/complete`, completeForm);
      toast.success('Trip marked as completed.');
      setCompleteModal(null);
      load();
    } catch (err) {
      const msg = err.response?.data?.error || 'Could not complete the trip.';
      setError(msg);
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  const filtered = trips.filter((t) => !statusFilter || t.status === statusFilter);

  return (
    <Layout title="Trip Management">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="input-field w-auto text-sm">
          <option value="">All statuses</option>
          {['Draft', 'Dispatched', 'Completed', 'Cancelled'].map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
        {canManage && <button onClick={openCreate} className="btn-primary">+ Create Trip</button>}
      </div>

      <div className="panel overflow-x-auto">
        <table className="w-full manifest-table">
          <thead>
            <tr>
              <th>Route</th>
              <th>Vehicle</th>
              <th>Driver</th>
              <th>Cargo</th>
              <th>Distance</th>
              <th>Status</th>
              {canManage && <th></th>}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={7} className="text-center py-8 text-ink/40 dark:text-paper/45">Loading trip log…</td></tr>
            ) : filtered.length === 0 ? (
                <tr><td colSpan={7} className="text-center py-8 text-ink/40 dark:text-paper/45">No trips match this filter.</td></tr>
            ) : filtered.map((t) => (
              <tr key={t.id}>
                <td>
                  <span className="font-medium">{t.source}</span>
                  <span className="text-ink/35 dark:text-paper/35 mx-1.5">→</span>
                  <span className="font-medium">{t.destination}</span>
                </td>
                <td className="font-mono">{t.registration_number}</td>
                <td>{t.driver_name}</td>
                <td className="font-mono">{Number(t.cargo_weight).toLocaleString()} kg</td>
                <td className="font-mono">{Number(t.planned_distance).toLocaleString()} km</td>
                <td><StatusBadge status={t.status} /></td>
                {canManage && (
                  <td className="text-right space-x-2 whitespace-nowrap">
                    {t.status === 'Draft' && (
                      <>
                        <button onClick={() => act(t.id, 'dispatch')} className="text-xs font-medium text-signal-route">Dispatch</button>
                        <button onClick={() => act(t.id, 'cancel')} className="text-xs font-medium text-signal-alert">Cancel</button>
                      </>
                    )}
                    {t.status === 'Dispatched' && (
                      <>
                        <button onClick={() => openComplete(t)} className="text-xs font-medium text-signal-transit">Complete</button>
                        <button onClick={() => act(t.id, 'cancel')} className="text-xs font-medium text-signal-alert">Cancel</button>
                      </>
                    )}
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Create Trip">
        <form onSubmit={handleCreate} className="space-y-3" noValidate>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="board-eyebrow block mb-1.5">Source</label>
              <input required className={`input-field ${fieldErrors.source ? '!border-signal-alert' : ''}`} value={form.source} onChange={(e) => setForm({ ...form, source: e.target.value })} />
              {fieldErrors.source && <p className="text-xs text-signal-alert mt-1">{fieldErrors.source}</p>}
            </div>
            <div>
              <label className="board-eyebrow block mb-1.5">Destination</label>
              <input required className={`input-field ${fieldErrors.destination ? '!border-signal-alert' : ''}`} value={form.destination} onChange={(e) => setForm({ ...form, destination: e.target.value })} />
              {fieldErrors.destination && <p className="text-xs text-signal-alert mt-1">{fieldErrors.destination}</p>}
            </div>
          </div>
          <div>
            <label className="board-eyebrow block mb-1.5">Vehicle (available only)</label>
            <select required className={`input-field ${fieldErrors.vehicle_id ? '!border-signal-alert' : ''}`} value={form.vehicle_id} onChange={(e) => setForm({ ...form, vehicle_id: e.target.value })}>
              <option value="">Select a vehicle…</option>
              {vehicles.map((v) => (
                <option key={v.id} value={v.id}>{v.registration_number} — {v.name} (max {v.max_load_capacity}kg)</option>
              ))}
            </select>
            {fieldErrors.vehicle_id && <p className="text-xs text-signal-alert mt-1">{fieldErrors.vehicle_id}</p>}
          </div>
          <div>
            <label className="board-eyebrow block mb-1.5">Driver (available &amp; licensed only)</label>
            <select required className={`input-field ${fieldErrors.driver_id ? '!border-signal-alert' : ''}`} value={form.driver_id} onChange={(e) => setForm({ ...form, driver_id: e.target.value })}>
              <option value="">Select a driver…</option>
              {drivers.map((d) => (
                <option key={d.id} value={d.id}>{d.name} — {d.license_category}</option>
              ))}
            </select>
            {fieldErrors.driver_id && <p className="text-xs text-signal-alert mt-1">{fieldErrors.driver_id}</p>}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="board-eyebrow block mb-1.5">Cargo Weight (kg)</label>
              <input required type="number" min="1" className={`input-field ${fieldErrors.cargo_weight ? '!border-signal-alert' : ''}`} value={form.cargo_weight} onChange={(e) => setForm({ ...form, cargo_weight: e.target.value })} />
              {fieldErrors.cargo_weight && <p className="text-xs text-signal-alert mt-1">{fieldErrors.cargo_weight}</p>}
            </div>
            <div>
              <label className="board-eyebrow block mb-1.5">Planned Distance (km)</label>
              <input required type="number" min="1" className={`input-field ${fieldErrors.planned_distance ? '!border-signal-alert' : ''}`} value={form.planned_distance} onChange={(e) => setForm({ ...form, planned_distance: e.target.value })} />
              {fieldErrors.planned_distance && <p className="text-xs text-signal-alert mt-1">{fieldErrors.planned_distance}</p>}
            </div>
          </div>
          {error && <div className="text-sm text-signal-alert">{error}</div>}
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={() => setModalOpen(false)} className="btn-secondary">Cancel</button>
            <button type="submit" disabled={saving} className="btn-primary">{saving ? 'Creating…' : 'Create Draft Trip'}</button>
          </div>
        </form>
      </Modal>

      <Modal open={!!completeModal} onClose={() => setCompleteModal(null)} title={`Complete Trip — ${completeModal?.source} → ${completeModal?.destination}`}>
        <form onSubmit={handleComplete} className="space-y-3" noValidate>
          <div>
            <label className="board-eyebrow block mb-1.5">Final Odometer (km)</label>
            <input required type="number" min="0" className={`input-field ${completeErrors.final_odometer ? '!border-signal-alert' : ''}`} value={completeForm.final_odometer}
              onChange={(e) => setCompleteForm({ ...completeForm, final_odometer: e.target.value })} />
            {completeErrors.final_odometer && <p className="text-xs text-signal-alert mt-1">{completeErrors.final_odometer}</p>}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="board-eyebrow block mb-1.5">Fuel Consumed (L)</label>
              <input type="number" min="0" className={`input-field ${completeErrors.fuel_consumed ? '!border-signal-alert' : ''}`} value={completeForm.fuel_consumed}
                onChange={(e) => setCompleteForm({ ...completeForm, fuel_consumed: e.target.value })} />
              {completeErrors.fuel_consumed && <p className="text-xs text-signal-alert mt-1">{completeErrors.fuel_consumed}</p>}
            </div>
            <div>
              <label className="board-eyebrow block mb-1.5">Fuel Cost (₹)</label>
              <input type="number" min="0" className={`input-field ${completeErrors.fuel_cost ? '!border-signal-alert' : ''}`} value={completeForm.fuel_cost}
                onChange={(e) => setCompleteForm({ ...completeForm, fuel_cost: e.target.value })} />
              {completeErrors.fuel_cost && <p className="text-xs text-signal-alert mt-1">{completeErrors.fuel_cost}</p>}
            </div>
          </div>
          <div>
            <label className="board-eyebrow block mb-1.5">Trip Revenue (₹)</label>
            <input type="number" min="0" className={`input-field ${completeErrors.revenue ? '!border-signal-alert' : ''}`} value={completeForm.revenue}
              onChange={(e) => setCompleteForm({ ...completeForm, revenue: e.target.value })} />
            {completeErrors.revenue && <p className="text-xs text-signal-alert mt-1">{completeErrors.revenue}</p>}
          </div>
          {error && <div className="text-sm text-signal-alert">{error}</div>}
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={() => setCompleteModal(null)} className="btn-secondary">Cancel</button>
            <button type="submit" disabled={saving} className="btn-primary">{saving ? 'Saving…' : 'Mark Completed'}</button>
          </div>
        </form>
      </Modal>
    </Layout>
  );
}
