require('dotenv').config();
const bcrypt = require('bcryptjs');
const db = require('./db');

async function seed() {
  console.log('Seeding TransitOps demo data...');

  const users = [
    { name: 'Priya Sharma', email: 'fleet.manager@transitops.io', role: 'fleet_manager', region: 'East' },
    { name: 'Alex Fernandes', email: 'driver@transitops.io', role: 'driver', region: 'East' },
    { name: 'Rahul Nair', email: 'safety.officer@transitops.io', role: 'safety_officer', region: 'East' },
    { name: 'Meera Iyer', email: 'analyst@transitops.io', role: 'financial_analyst', region: 'East' },
  ];
  const passwordHash = await bcrypt.hash('TransitOps@123', 10);

  for (const u of users) {
    await db.query(
      `INSERT INTO users (name, email, password_hash, role, region) VALUES ($1,$2,$3,$4,$5)
       ON CONFLICT (email) DO NOTHING`,
      [u.name, u.email.toLowerCase(), passwordHash, u.role, u.region]
    );
  }

  const vehicles = [
    ['WB-05-AB-1201', 'Tata Ace Gold', 'Mini Truck', 750, 12500, 650000, 'East'],
    ['WB-05-AB-1450', 'Ashok Leyland Dost', 'Light Truck', 1250, 34200, 980000, 'East'],
    ['WB-06-CD-7788', 'Mahindra Bolero Pickup', 'Pickup', 900, 21000, 720000, 'East'],
    ['WB-07-EF-3321', 'Eicher Pro 2049', 'Medium Truck', 4500, 58900, 2150000, 'North'],
    ['WB-08-GH-9090', 'Tata 407', 'Light Truck', 2500, 44000, 1450000, 'North'],
  ];

  const vehicleIds = [];
  for (const v of vehicles) {
    const { rows } = await db.query(
      `INSERT INTO vehicles (registration_number, name, type, max_load_capacity, odometer, acquisition_cost, region)
       VALUES ($1,$2,$3,$4,$5,$6,$7) ON CONFLICT (registration_number) DO NOTHING RETURNING id`,
      v
    );
    if (rows[0]) vehicleIds.push(rows[0].id);
  }

  const drivers = [
    ['Alex Fernandes', 'DL-1420110012345', 'LMV', '2027-05-10', '9830011122', 96.5, 'East'],
    ['Sanjay Ghosh', 'DL-1420110023456', 'HMV', '2026-11-02', '9830022233', 88.0, 'East'],
    ['Farhan Ali', 'DL-1420110034567', 'LMV', '2025-01-15', '9830033344', 72.5, 'North'],
    ['Bikash Roy', 'DL-1420110045678', 'HMV', '2028-03-20', '9830044455', 91.0, 'North'],
  ];

  for (const d of drivers) {
    await db.query(
      `INSERT INTO drivers (name, license_number, license_category, license_expiry, contact_number, safety_score, region)
       VALUES ($1,$2,$3,$4,$5,$6,$7) ON CONFLICT (license_number) DO NOTHING`,
      d
    );
  }

  console.log('Seed complete. Demo login credentials (password: TransitOps@123):');
  users.forEach((u) => console.log(`  - ${u.role}: ${u.email}`));

  process.exit(0);
}

seed().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
