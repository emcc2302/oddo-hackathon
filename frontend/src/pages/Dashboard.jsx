import { useEffect, useState } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';
import Layout from '../components/Layout';
import KPICard from '../components/KPICard';
import client from '../api/client';

const VEHICLE_COLORS = { Available: '#1F9D77', 'On Trip': '#3D6FE0', 'In Shop': '#E39B3A', Retired: '#8A8578' };

export default function Dashboard() {
  const [kpis, setKpis] = useState({
    "activeVehicles": 18,
    "availableVehicles": 11,
    "vehiclesInMaintenance": 3,
    "retiredVehicles": 2,
    "activeTrips": 9,
    "pendingTrips": 4,
    "completedTrips": 120,
    "cancelledTrips": 7,
    "driversOnDuty": 9,
    "driversAvailable": 12,
    "driversSuspended": 1,
    "fleetUtilization": 45.0
  });
  const [filters, setFilters] = useState({ types: [], regions: [] });
  const [type, setType] = useState([
    "Truck",
    "Mini Truck",
    "Trailer",
    "Container",
    "Van"
  ]);
  const [region, setRegion] = useState([
    "North",
    "South",
    "East",
    "West",
    "Central"
  ]);
  const [vehicles, setVehicles] = useState([
    {
      "id": 1,
      "vehicleNumber": "WB12AB1234",
      "type": "Truck",
      "status": "Available",
      "region": "East"
    },
    {
      "id": 2,
      "vehicleNumber": "WB12AB5678",
      "type": "Truck",
      "status": "On Trip",
      "region": "East"
    },
    {
      "id": 3,
      "vehicleNumber": "DL10CD1111",
      "type": "Trailer",
      "status": "In Shop",
      "region": "North"
    },
    {
      "id": 4,
      "vehicleNumber": "MH20EF2222",
      "type": "Container",
      "status": "Available",
      "region": "West"
    },
    {
      "id": 5,
      "vehicleNumber": "KA05GH3333",
      "type": "Mini Truck",
      "status": "On Trip",
      "region": "South"
    },
    {
      "id": 6,
      "vehicleNumber": "TN09JK4444",
      "type": "Van",
      "status": "Retired",
      "region": "South"
    },
    {
      "id": 7,
      "vehicleNumber": "WB22LM5555",
      "type": "Truck",
      "status": "Available",
      "region": "East"
    },
    {
      "id": 8,
      "vehicleNumber": "RJ14NO6666",
      "type": "Trailer",
      "status": "On Trip",
      "region": "North"
    },
    {
      "id": 9,
      "vehicleNumber": "GJ18PQ7777",
      "type": "Container",
      "status": "Available",
      "region": "West"
    },
    {
      "id": 10,
      "vehicleNumber": "UP32RS8888",
      "type": "Truck",
      "status": "In Shop",
      "region": "Central"
    }
  ]);
  const [loading, setLoading] = useState(false);

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
