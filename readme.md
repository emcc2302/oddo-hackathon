# Odoo Hackathon

## TransitOps — Smart Transport Operations Platform

A full PERN-stack (PostgreSQL, Express, React, Node) build of the Smart Transport Operations Platform, brief: vehicle registry, driver management, trip dispatch with business-rule enforcement, maintenance workflow, fuel & expense tracking, a KPI dashboard, and cost/ROI reporting with CSV export. Light and dark themes are both first-class.

## Stack

- **Database:** PostgreSQL (enums for status fields, transactional writes for every status-changing action)
- **API:** Node.js + Express, JWT auth, role-based access control (RBAC)
- **Frontend:** React 18 + Vite + Tailwind CSS, Recharts for analytics, React Router
- **Design:** a bespoke "fleet control board" theme — Space Grotesk / IBM Plex Sans / IBM Plex Mono, transit-green / route-blue / signal-amber accent system, departure-board style KPI cards. No template UI kit.

## 1. Set up PostgreSQL (local install)

Install PostgreSQL 14+ for your OS if you don't already have it:

- **macOS:** `brew install postgresql@16 && brew services start postgresql@16`
- **Ubuntu/Debian:** `sudo apt install postgresql postgresql-contrib && sudo systemctl start postgresql`
- **Windows:** install via the [official installer](https://www.postgresql.org/download/windows/), which also starts the service for you.

Then create the role and database, and load the schema:

```bash
# Create a login role for the app (skip if you already have a superuser or use a custom name and password.)
sudo -u postgres createuser --superuser transitops_user
sudo -u postgres psql -c "ALTER USER transitops_user WITH PASSWORD 'transitops_pass';"

# Create the database
createdb -U transitops_user -h localhost transitops

# Load the schema (tables, enums, indexes) from root folder of this project
psql -U transitops_user -h localhost -d transitops -f backend/schema.sql
```

On Windows, run the equivalent commands from the "SQL Shell (psql)" app that ships with the installer, or from `psql` on your `PATH`.

Confirm it worked:
```bash
psql -U transitops_user -h localhost -d transitops -c "\dt"
```
You should see `users`, `vehicles`, `drivers`, `trips`, `maintenance_logs`, `fuel_logs`, and `expenses`.

Update `backend/.env` (see step 2) if you used a different username, password, host, port, or database name — `DATABASE_URL` must match whatever you created above.

## 2. Backend

```bash
cd backend
cp .env.example .env      # edit DATABASE_URL / JWT_SECRET if needed
npm install
npm run seed               # loads demo users, vehicles, and drivers
npm run dev                 # starts the API on http://localhost:4000
```

Demo accounts (password for all: `TransitOps@123`):

| Role               | Email                          |
|--------------------|---------------------------------|
| Fleet Manager      | fleet.manager@transitops.io    |
| Driver             | driver@transitops.io           |
| Safety Officer     | safety.officer@transitops.io   |
| Financial Analyst  | analyst@transitops.io          |

## 3. Frontend

```bash
cd frontend
cp .env.example .env       # points to the API, defaults to localhost:4000
npm install
npm run dev                 # starts the app on http://localhost:5173
```

Open `http://localhost:5173` and sign in with any demo account above.

## Business rules enforced by the API

- Vehicle registration numbers and driver license numbers are unique.
- Retired or In Shop vehicles never appear in the trip dispatch pool.
- Drivers who are Suspended or whose license has expired cannot be assigned.
- A vehicle or driver already On Trip cannot be assigned to a second trip.
- Cargo weight is rejected if it exceeds the vehicle's max load capacity.
- Dispatch moves both vehicle and driver to On Trip inside a single DB transaction.
- Completing a trip returns both to Available and can log a fuel entry in the same step.
- Cancelling a Dispatched trip restores vehicle and driver to Available.
- Opening a maintenance record flips the vehicle to In Shop; closing it restores Available (unless Retired, or another Open record remains).
- All of the above use row-level locks (`SELECT … FOR UPDATE`) inside a transaction, so two dispatchers can't double-book the same vehicle.

## Project layout

```
transitops/
├── backend/
│   ├── schema.sql            # tables, enums, indexes
│   ├── src/
│   │   ├── index.js          # Express app
│   │   ├── db.js             # pg pool
│   │   ├── seed.js           # demo data
│   │   ├── middleware/auth.js
│   │   └── routes/           # auth, vehicles, drivers, trips, maintenance, fuel, expenses, dashboard, reports
└── frontend/
    └── src/
        ├── pages/            # Login, Dashboard, Vehicles, Drivers, Trips, Maintenance, FuelExpenses, Reports, Settings
        ├── components/       # Sidebar, Topbar, KPICard, StatusBadge, Modal, ThemeToggle, Layout
        ├── context/          # AuthContext, ThemeContext, ToastContext
        └── api/client.js
```

## Project Screenshots
<img width="1907" height="966" alt="image" src="https://github.com/user-attachments/assets/7efe9d8f-0838-4707-b0b3-bc4559f7ad63" />

<img width="1918" height="917" alt="image" src="https://github.com/user-attachments/assets/5f7a2640-5555-4084-9c2e-b06ee3ed2323" />
<img width="1917" height="972" alt="image" src="https://github.com/user-attachments/assets/f0351bab-69d4-4e27-8e8d-afe38c4bbe54" />
<img width="1915" height="966" alt="image" src="https://github.com/user-attachments/assets/7bffb87b-63e5-470d-b26d-c4364c4c8584" />
<img width="1917" height="953" alt="image" src="https://github.com/user-attachments/assets/664a6606-7860-46c6-a0ff-393d3d7d6fe1" />




## Access control (RBAC)

Every write action is enforced server-side in `backend/src/middleware/auth.js` (`authorize(...roles)`), so a rejected request always gets a `403` even if the UI is bypassed. The frontend mirrors those same rules so users only see actions they're actually allowed to perform:

| Module              | View          | Manage (create/edit/act)                                   |
|---------------------|---------------|------------------------------------------------------------|
| Dashboard & Reports | all roles     | — (read-only for everyone)                                 |
| Vehicle Registry    | all roles     | Fleet Manager only                                         |
| Drivers             | all roles     | Fleet Manager, Safety Officer (delete: Fleet Manager only) |
| Trips               | all roles     | Fleet Manager, Driver                                      |
| Maintenance         | all roles     | Fleet Manager only                                         |
| Fuel & Expenses     | all roles     | Fleet Manager, Driver, Financial Analyst                   |

The **Settings & RBAC** page in the app (`/settings`) shows this same table to whoever is signed in, alongside their own account/role details.
