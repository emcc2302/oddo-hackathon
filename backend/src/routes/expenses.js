const express = require('express');
const db = require('../db');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();
router.use(authenticate);

router.get('/', async (req, res) => {
  const { vehicle_id } = req.query;
  const clauses = [];
  const params = [];
  if (vehicle_id) { params.push(vehicle_id); clauses.push(`e.vehicle_id = $${params.length}`); }
  const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';
  const { rows } = await db.query(
    `SELECT e.*, v.registration_number FROM expenses e JOIN vehicles v ON v.id = e.vehicle_id ${where} ORDER BY e.id DESC`,
    params
  );
  res.json(rows);
});

router.post('/', authorize('fleet_manager', 'driver', 'financial_analyst'), async (req, res) => {
  try {
    const { vehicle_id, trip_id, category, amount, expense_date, notes } = req.body;
    if (!vehicle_id || !category || amount === undefined) {
      return res.status(400).json({ error: 'Vehicle, category, and amount are required.' });
    }
    const { rows } = await db.query(
      `INSERT INTO expenses (vehicle_id, trip_id, category, amount, expense_date, notes, created_by)
       VALUES ($1,$2,$3,$4,COALESCE($5, CURRENT_DATE),$6,$7) RETURNING *`,
      [vehicle_id, trip_id || null, category, amount, expense_date || null, notes || null, req.user.id]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Could not record the expense.' });
  }
});

module.exports = router;
