import { useEffect, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import Layout from '../components/Layout';
import KPICard from '../components/KPICard';
import client from '../api/client';

export default function Reports() {
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    client.get('/reports/summary').then((res) => setSummary(res.data)).finally(() => setLoading(false));
  }, []);

  const downloadCsv = () => {
    const token = localStorage.getItem('transitops_token');
    const base = import.meta.env.VITE_API_URL || 'http://localhost:4000/api';
    fetch(`${base}/reports/vehicles/export.csv`, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.blob())
      .then((blob) => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'transitops-vehicle-report.csv';
        a.click();
        window.URL.revokeObjectURL(url);
      });
  };

  const costChartData = summary?.byVehicle.map((v) => ({
    name: v.registration_number,
    Fuel: v.total_fuel_cost,
    Maintenance: v.total_maintenance_cost,
    Other: v.total_other_expenses,
  })) || [];

  return (
    <Layout title="Reports & Analytics">
      <div className="flex justify-end mb-5">
        <button onClick={downloadCsv} className="btn-secondary text-sm">Export CSV</button>
      </div>

      {loading || !summary ? (
        <div className="text-sm text-ink/50 dark:text-paper/50">Compiling report…</div>
      ) : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
            <KPICard label="Fleet Fuel Efficiency" value={summary.totals.fleetFuelEfficiency ?? '—'} unit="km/L" accent="transit" />
            <KPICard label="Operational Cost" value={`₹${Math.round(summary.totals.operationalCost).toLocaleString()}`} accent="amber" />
            <KPICard label="Total Revenue" value={`₹${Math.round(summary.totals.revenue).toLocaleString()}`} accent="route" />
            <KPICard label="Total Distance" value={Math.round(summary.totals.distance).toLocaleString()} unit="km" accent="ink" />
          </div>

          <div className="panel p-5 mb-6">
            <span className="board-eyebrow">Operational Cost Breakdown by Vehicle</span>
            <div className="h-72 mt-2">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={costChartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#DEDACF33" vertical={false} />
                  <XAxis dataKey="name" tick={{ fontSize: 10, fontFamily: 'IBM Plex Mono' }} />
                  <YAxis tick={{ fontSize: 11, fontFamily: 'IBM Plex Mono' }} />
                  <Tooltip />
                  <Bar dataKey="Fuel" stackId="a" fill="#1F9D77" />
                  <Bar dataKey="Maintenance" stackId="a" fill="#E39B3A" />
                  <Bar dataKey="Other" stackId="a" fill="#D14B4B" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="panel overflow-x-auto">
            <table className="w-full manifest-table">
              <thead>
                <tr>
                  <th>Vehicle</th>
                  <th>Distance</th>
                  <th>Fuel Efficiency</th>
                  <th>Operational Cost</th>
                  <th>Revenue</th>
                  <th>ROI</th>
                </tr>
              </thead>
              <tbody>
                {summary.byVehicle.map((v) => (
                  <tr key={v.vehicle_id}>
                    <td className="font-mono">{v.registration_number}</td>
                    <td className="font-mono">{v.total_distance_km.toLocaleString()} km</td>
                    <td className="font-mono">{v.fuel_efficiency_km_per_l ?? '—'} km/L</td>
                    <td className="font-mono">₹{v.operational_cost.toLocaleString()}</td>
                    <td className="font-mono">₹{v.total_revenue.toLocaleString()}</td>
                    <td className={`font-mono ${v.roi_ratio > 0 ? 'text-signal-transit' : v.roi_ratio < 0 ? 'text-signal-alert' : ''}`}>
                      {v.roi_ratio !== null ? `${(v.roi_ratio * 100).toFixed(1)}%` : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </Layout>
  );
}
