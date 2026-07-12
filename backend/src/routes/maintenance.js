const express = require('express');
const db = require('../db');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();
router.use(authenticate);

router.get('/', async (req, res) => {
  const { rows } = await db.query(
    `SELECT m.*, v.registration_number, v.name AS vehicle_name
     FROM maintenance_logs m JOIN vehicles v ON v.id = m.vehicle_id
     ORDER BY m.id DESC`
  );
  res.json(rows);
});

// Opening a maintenance record flips the vehicle to In Shop, removing it from dispatch pool
router.post('/', authorize('fleet_manager'), async (req, res) => {
  const client = await db.pool.connect();
  try {
    const { vehicle_id, service_type, description, cost } = req.body;
    if (!vehicle_id || !service_type) {
      return res.status(400).json({ error: 'Vehicle and service type are required.' });
    }
    await client.query('BEGIN');
    const vRes = await client.query('SELECT * FROM vehicles WHERE id = $1 FOR UPDATE', [vehicle_id]);
    const vehicle = vRes.rows[0];
    if (!vehicle) { await client.query('ROLLBACK'); return res.status(404).json({ error: 'Vehicle not found.' }); }
    if (vehicle.status === 'On Trip') {
      await client.query('ROLLBACK');
      return res.status(422).json({ error: `${vehicle.registration_number} is on a trip and cannot enter maintenance.` });
    }

    const mRes = await client.query(
      `INSERT INTO maintenance_logs (vehicle_id, service_type, description, cost, status, created_by)
       VALUES ($1,$2,$3,$4,'Open',$5) RETURNING *`,
      [vehicle_id, service_type, description || null, cost || 0, req.user.id]
    );

    if (vehicle.status !== 'Retired') {
      await client.query(`UPDATE vehicles SET status = 'In Shop', updated_at = now() WHERE id = $1`, [vehicle_id]);
    }

    await client.query('COMMIT');
    res.status(201).json(mRes.rows[0]);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error(err);
    res.status(500).json({ error: 'Could not create the maintenance record.' });
  } finally {
    client.release();
  }
});

// Closing maintenance restores vehicle to Available, unless it is Retired
router.post('/:id/close', authorize('fleet_manager'), async (req, res) => {
  const client = await db.pool.connect();
  try {
    await client.query('BEGIN');
    const mRes = await client.query('SELECT * FROM maintenance_logs WHERE id = $1 FOR UPDATE', [req.params.id]);
    const record = mRes.rows[0];
    if (!record) { await client.query('ROLLBACK'); return res.status(404).json({ error: 'Maintenance record not found.' }); }
    if (record.status === 'Closed') {
      await client.query('ROLLBACK');
      return res.status(422).json({ error: 'Record is already closed.' });
    }

    const vRes = await client.query('SELECT * FROM vehicles WHERE id = $1 FOR UPDATE', [record.vehicle_id]);
    const vehicle = vRes.rows[0];

    // Only restore to Available if no other Open maintenance records remain
    const openOthers = await client.query(
      `SELECT COUNT(*) FROM maintenance_logs WHERE vehicle_id = $1 AND status = 'Open' AND id != $2`,
      [record.vehicle_id, record.id]
    );

    if (vehicle.status !== 'Retired' && Number(openOthers.rows[0].count) === 0) {
      await client.query(`UPDATE vehicles SET status = 'Available', updated_at = now() WHERE id = $1`, [record.vehicle_id]);
    }

    const upd = await client.query(
      `UPDATE maintenance_logs SET status = 'Closed', closed_at = now(), cost = COALESCE($2, cost) WHERE id = $1 RETURNING *`,
      [record.id, req.body.cost]
    );

    await client.query('COMMIT');
    res.json(upd.rows[0]);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error(err);
    res.status(500).json({ error: 'Could not close the maintenance record.' });
  } finally {
    client.release();
  }
});

module.exports = router;
