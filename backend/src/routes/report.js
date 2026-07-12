const express = require('express');
const db = require('../db');
const { authenticate } = require('../middleware/auth');
const { sendCsv } = require('../utils/csv');

const router = express.Router();
router.use(authenticate);

// Per-vehicle report: fuel efficiency, utilization inputs, operational cost, ROI
async function buildVehicleReport() {
  const { rows } = await db.query(`
    SELECT
      v.id, v.registration_number, v.name, v.type, v.status, v.acquisition_cost,
      COALESCE(SUM(DISTINCT_FUEL.total_liters), 0) AS total_liters,
      COALESCE(SUM(DISTINCT_FUEL.total_fuel_cost), 0) AS total_fuel_cost,
      COALESCE(MAINT.total_maintenance_cost, 0) AS total_maintenance_cost,
      COALESCE(EXP.total_expenses, 0) AS total_expenses,
      COALESCE(TRIP.total_distance, 0) AS total_distance,
      COALESCE(TRIP.total_revenue, 0) AS total_revenue,
      COALESCE(TRIP.completed_trips, 0) AS completed_trips
    FROM vehicles v
    LEFT JOIN (
      SELECT vehicle_id, SUM(liters) AS total_liters, SUM(cost) AS total_fuel_cost
      FROM fuel_logs GROUP BY vehicle_id
    ) DISTINCT_FUEL ON DISTINCT_FUEL.vehicle_id = v.id
    LEFT JOIN (
      SELECT vehicle_id, SUM(cost) AS total_maintenance_cost
      FROM maintenance_logs GROUP BY vehicle_id
    ) MAINT ON MAINT.vehicle_id = v.id
    LEFT JOIN (
      SELECT vehicle_id, SUM(amount) AS total_expenses
      FROM expenses GROUP BY vehicle_id
    ) EXP ON EXP.vehicle_id = v.id
    LEFT JOIN (
      SELECT vehicle_id,
        SUM(planned_distance) FILTER (WHERE status = 'Completed') AS total_distance,
        SUM(revenue) FILTER (WHERE status = 'Completed') AS total_revenue,
        COUNT(*) FILTER (WHERE status = 'Completed') AS completed_trips
      FROM trips GROUP BY vehicle_id
    ) TRIP ON TRIP.vehicle_id = v.id
    GROUP BY v.id, MAINT.total_maintenance_cost, EXP.total_expenses, TRIP.total_distance, TRIP.total_revenue, TRIP.completed_trips
    ORDER BY v.id
  `);

  return rows.map((r) => {
    const fuelEfficiency = Number(r.total_liters) > 0 ? Number(r.total_distance) / Number(r.total_liters) : null;
    const operationalCost = Number(r.total_fuel_cost) + Number(r.total_maintenance_cost) + Number(r.total_expenses);
    const roi = Number(r.acquisition_cost) > 0
      ? (Number(r.total_revenue) - (Number(r.total_maintenance_cost) + Number(r.total_fuel_cost))) / Number(r.acquisition_cost)
      : null;

    return {
      vehicle_id: r.id,
      registration_number: r.registration_number,
      name: r.name,
      type: r.type,
      status: r.status,
      total_distance_km: Number(r.total_distance),
      total_liters: Number(r.total_liters),
      fuel_efficiency_km_per_l: fuelEfficiency !== null ? Number(fuelEfficiency.toFixed(2)) : null,
      total_fuel_cost: Number(r.total_fuel_cost),
      total_maintenance_cost: Number(r.total_maintenance_cost),
      total_other_expenses: Number(r.total_expenses),
      operational_cost: Number(operationalCost.toFixed(2)),
      total_revenue: Number(r.total_revenue),
      roi_ratio: roi !== null ? Number(roi.toFixed(3)) : null,
      completed_trips: Number(r.completed_trips),
    };
  });
}

router.get('/vehicles', async (req, res) => {
  const report = await buildVehicleReport();
  res.json(report);
});

router.get('/vehicles/export.csv', async (req, res) => {
  const report = await buildVehicleReport();
  sendCsv(res, 'transitops-vehicle-report.csv', report);
});

// Fleet-wide summary used for analytics charts
router.get('/summary', async (req, res) => {
  const report = await buildVehicleReport();
  const totals = report.reduce(
    (acc, r) => ({
      fuelCost: acc.fuelCost + r.total_fuel_cost,
      maintenanceCost: acc.maintenanceCost + r.total_maintenance_cost,
      otherExpenses: acc.otherExpenses + r.total_other_expenses,
      revenue: acc.revenue + r.total_revenue,
      distance: acc.distance + r.total_distance_km,
      liters: acc.liters + r.total_liters,
    }),
    { fuelCost: 0, maintenanceCost: 0, otherExpenses: 0, revenue: 0, distance: 0, liters: 0 }
  );

  res.json({
    byVehicle: report,
    totals: {
      ...totals,
      operationalCost: totals.fuelCost + totals.maintenanceCost + totals.otherExpenses,
      fleetFuelEfficiency: totals.liters > 0 ? Number((totals.distance / totals.liters).toFixed(2)) : null,
    },
  });
});

module.exports = router;
