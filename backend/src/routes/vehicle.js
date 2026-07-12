const express = require('express');
const db = require('../db');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();
router.use(authenticate);

// List vehicles, with optional filters: type, status, region
router.get('/', async (req, res) => {
  const { type, status, region, dispatchable } = req.query;
  const clauses = [];
  const params = [];

  if (type) { params.push(type); clauses.push(`type = $${params.length}`); }
  if (status) { params.push(status); clauses.push(`status = $${params.length}`); }
  if (region) { params.push(region); clauses.push(`region = $${params.length}`); }
  if (dispatchable === 'true') { clauses.push(`status = 'Available'`); }

  const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';
  const { rows } = await db.query(`SELECT * FROM vehicles ${where} ORDER BY id DESC`, params);
  res.json(rows);
});

router.get('/:id', async (req, res) => {
  const { rows } = await db.query('SELECT * FROM vehicles WHERE id = $1', [req.params.id]);
  if (!rows[0]) return res.status(404).json({ error: 'Vehicle not found.' });
  res.json(rows[0]);
});

router.post('/', authorize('fleet_manager'), async (req, res) => {
  try {
    const { registration_number, name, type, max_load_capacity, odometer, acquisition_cost, region } = req.body;
    if (!registration_number || !name || !type || !max_load_capacity) {
      return res.status(400).json({ error: 'Registration number, name, type, and max load capacity are required.' });
    }
    const { rows } = await db.query(
      `INSERT INTO vehicles (registration_number, name, type, max_load_capacity, odometer, acquisition_cost, region)
       VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
      [registration_number, name, type, max_load_capacity, odometer || 0, acquisition_cost || 0, region || null]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    if (err.code === '23505') {
      return res.status(409).json({ error: 'That registration number is already in use.' });
    }
    console.error(err);
    res.status(500).json({ error: 'Could not register the vehicle.' });
  }
});

router.put('/:id', authorize('fleet_manager'), async (req, res) => {
  try {
    const { name, type, max_load_capacity, odometer, acquisition_cost, region, status } = req.body;
    const { rows } = await db.query(
      `UPDATE vehicles SET
        name = COALESCE($1, name),
        type = COALESCE($2, type),
        max_load_capacity = COALESCE($3, max_load_capacity),
        odometer = COALESCE($4, odometer),
        acquisition_cost = COALESCE($5, acquisition_cost),
        region = COALESCE($6, region),
        status = COALESCE($7, status),
        updated_at = now()
       WHERE id = $8 RETURNING *`,
      [name, type, max_load_capacity, odometer, acquisition_cost, region, status, req.params.id]
    );
    if (!rows[0]) return res.status(404).json({ error: 'Vehicle not found.' });
    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Could not update the vehicle.' });
  }
});

router.delete('/:id', authorize('fleet_manager'), async (req, res) => {
  await db.query('DELETE FROM vehicles WHERE id = $1', [req.params.id]);
  res.status(204).send();
});

module.exports = router;
