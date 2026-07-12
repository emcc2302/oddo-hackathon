const express = require('express');
const db = require('../db');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();
router.use(authenticate);

router.get('/', async (req, res) => {
  const { vehicle_id } = req.query;
  const clauses = [];
  const params = [];
  if (vehicle_id) { params.push(vehicle_id); clauses.push(`f.vehicle_id = $${params.length}`); }
  const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';
  const { rows } = await db.query(
    `SELECT f.*, v.registration_number FROM fuel_logs f JOIN vehicles v ON v.id = f.vehicle_id ${where} ORDER BY f.id DESC`,
    params
  );
  res.json(rows);
});

router.post('/', authorize('fleet_manager', 'driver', 'financial_analyst'), async (req, res) => {
  try {
    const { vehicle_id, trip_id, liters, cost, log_date } = req.body;
    if (!vehicle_id || !liters || cost === undefined) {
      return res.status(400).json({ error: 'Vehicle, liters, and cost are required.' });
    }
    const { rows } = await db.query(
      `INSERT INTO fuel_logs (vehicle_id, trip_id, liters, cost, log_date, created_by)
       VALUES ($1,$2,$3,$4,COALESCE($5, CURRENT_DATE),$6) RETURNING *`,
      [vehicle_id, trip_id || null, liters, cost, log_date || null, req.user.id]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Could not record the fuel log.' });
  }
});

module.exports = router;
