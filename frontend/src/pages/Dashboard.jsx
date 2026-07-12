import { useEffect, useState } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';
import Layout from '../components/Layout';
import KPICard from '../components/KPICard';
import client from '../api/client';

const VEHICLE_COLORS = { Available: '#1F9D77', 'On Trip': '#3D6FE0', 'In Shop': '#E39B3A', Retired: '#8A8578' };

export default function Dashboard() {
  const [kpis, setKpis] = useState(null);
  const [filters, setFilters] = useState({ types: [], regions: [] });
  const [type, setType] = useState('');
  const [region, setRegion] = useState('');
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    client.get('/dashboard/filters').then((res) => setFilters(res.data)).catch(() => {});
  }, []);

  useEffect(() => {
    setLoading(true);
    const params = {};
    if (type) params.type = type;
    if (region) params.region = region;
    Promise.all([
      client.get('/dashboard/kpis', { params }),
      client.get('/vehicles', { params }),
    ])
      .then(([kpiRes, vehicleRes]) => {
        setKpis(kpiRes.data);
        setVehicles(vehicleRes.data);
      })
      .finally(() => setLoading(false));
  }, [type, region]);

  const vehicleStatusData = vehicles.reduce((acc, v) => {
    const found = acc.find((a) => a.name === v.status);
    if (found) found.value += 1;
    else acc.push({ name: v.status, value: 1 });
    return acc;
  }, []);

  const typeData = vehicles.reduce((acc, v) => {
    const found = acc.find((a) => a.name === v.type);
    if (found) found.count += 1;
    else acc.push({ name: v.type, count: 1 });
    return acc;
  }, []);

  return (
    <Layout title="Operations Board">
      <div className="flex flex-wrap items-center gap-3 mb-6">
        <select value={type} onChange={(e) => setType(e.target.value)} className="input-field w-auto text-sm">
          <option value="">All vehicle types</option>
          {filters.types.map((t) => <option key={t} value={t}>{t}</option>)}
        </select>
        <select value={region} onChange={(e) => setRegion(e.target.value)} className="input-field w-auto text-sm">
          <option value="">All regions</option>
          {filters.regions.map((r) => <option key={r} value={r}>{r}</option>)}
        </select>
        {(type || region) && (
          <button onClick={() => { setType(''); setRegion(''); }} className="text-xs text-signal-transit font-medium">
            Clear filters
          </button>
        )}
      </div>

      {loading || !kpis ? (
        <div className="text-sm text-ink/50 dark:text-paper/50">Loading board…</div>
      ) : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3 mb-8">
            <KPICard label="Active Vehicles" value={kpis.activeVehicles} accent="transit" />
            <KPICard label="Available" value={kpis.availableVehicles} accent="transit" />
            <KPICard label="In Maintenance" value={kpis.vehiclesInMaintenance} accent="amber" />
            <KPICard label="Active Trips" value={kpis.activeTrips} accent="route" />
            <KPICard label="Pending Trips" value={kpis.pendingTrips} accent="ink" />
            <KPICard label="Drivers On Duty" value={kpis.driversOnDuty} accent="route" />
            <KPICard label="Fleet Utilization" value={kpis.fleetUtilization} unit="%" accent="transit" />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="panel p-5">
              <span className="board-eyebrow">Vehicle Status Mix</span>
              <div className="h-64 mt-2">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={vehicleStatusData} dataKey="value" nameKey="name" innerRadius={55} outerRadius={85} paddingAngle={2}>
                      {vehicleStatusData.map((entry) => (
                        <Cell key={entry.name} fill={VEHICLE_COLORS[entry.name] || '#8A8578'} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{ background: 'var(--tw-bg)', fontFamily: 'IBM Plex Mono', fontSize: 12 }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="flex flex-wrap gap-3 mt-2 justify-center">
                {vehicleStatusData.map((entry) => (
                  <div key={entry.name} className="flex items-center gap-1.5 text-xs">
                    <span className="w-2.5 h-2.5 rounded-full" style={{ background: VEHICLE_COLORS[entry.name] || '#8A8578' }} />
                    {entry.name} ({entry.value})
                  </div>
                ))}
              </div>
            </div>

            <div className="panel p-5">
              <span className="board-eyebrow">Fleet by Vehicle Type</span>
              <div className="h-64 mt-2">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={typeData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#DEDACF33" vertical={false} />
                    <XAxis dataKey="name" tick={{ fontSize: 11, fontFamily: 'IBM Plex Mono' }} />
                    <YAxis tick={{ fontSize: 11, fontFamily: 'IBM Plex Mono' }} allowDecimals={false} />
                    <Tooltip />
                    <Bar dataKey="count" fill="#1F9D77" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </>
      )}
    </Layout>
  );
}
