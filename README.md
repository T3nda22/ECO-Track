# ECO TRACK: GIS-Based Waste Management System
### Exclusively Serving Barangay Poblacion, Minglanilla, Cebu, Philippines

> **Academic BSIT Capstone Project Disclaimer:**
> ECO TRACK is an academic Bachelor of Science in Information Technology (BSIT) capstone prototype designed exclusively for **Barangay Poblacion (Wards 1, 2, 3, and 4), Minglanilla, Cebu, Philippines**. It is not officially deployed by the local government unit (LGU). In adherence to technical integrity, real garbage trucks are not claimed to be GPS-tracked; map markers represent verified resident-reported waste coordinates.

---

## 1. Project Overview

**ECO TRACK** modernizes municipal solid waste management in Barangay Poblacion, Minglanilla, Cebu. Residents pinpoint overflowing, full, or uncollected garbage bins directly on an interactive Geographic Information System (GIS) map. Municipal administrators verify incoming reports and assign collection tasks to field personnel, who update collection progress, upload photographic proof of collection, and log completion timestamps.

### Key Highlights
- **Strict Geographic Scope:** Exclusively bounded to Barangay Poblacion (Wards 1–4), Minglanilla. Any coordinates dropped outside the Poblacion perimeter are rejected by server-side validation.
- **Three Dedicated Roles:** Separate workflows and dashboards for Residents, Municipal Administrators, and Garbage Collection Personnel.
- **Seven-Stage Lifecycle Workflow:** `Pending` &rarr; `Verified` &rarr; `Assigned` &rarr; `In Progress` &rarr; `Collected` &rarr; `Completed` (or `Rejected`).
- **Interactive GIS Mapping:** OpenStreetMap base tiles and Leaflet.js with custom status pins, boundary overlays, landmark jumps, and coordinate preview.
- **Audit History & Proof Verification:** Complete history of who updated statuses and when, with mandatory clearance proof photos.

---

## 2. Technology Stack & Platform Architecture

| Layer | Technologies Used |
|---|---|
| **Backend** | Python 3, Flask, Flask-Login, Flask-SQLAlchemy, Flask-WTF, python-dotenv |
| **Frontend** | HTML5, CSS3, JavaScript (ES6+), Bootstrap 5, Bootstrap Icons |
| **GIS Mapping** | Leaflet.js (v1.9.4), OpenStreetMap Carto Tiles, Ray-casting Point-in-Polygon |
| **Database** | MySQL (Production/Schema Dump: `ecotrack_mysql_schema.sql`) / SQLite (Local Dev fallback) |
| **File Storage** | Safe local upload storage for report and proof photos |

### Note on Database Technology Substitution
In accordance with the project specification:
*The primary target database is **MySQL** (`ecotrack_mysql_schema.sql` is provided with complete DDL, foreign keys, and indexes).*
*On systems where a local MySQL/MariaDB server is not currently running, the application defaults seamlessly to **SQLite** (`sqlite:///ecotrack.db`) via SQLAlchemy so you can run and test the application immediately without database configuration.*
*To switch to MySQL, update `DATABASE_URL` in `.env`:*
```env
DATABASE_URL=mysql+pymysql://root:your_password@localhost:3306/ecotrack_db
```

---

## 3. Pre-Configured Test Credentials

The database initializes with clean tables (0 waste reports) and ready-to-test accounts for each role:

| Role | Email | Password | Primary Dashboard |
|---|---|---|---|
| **Administrator** | `admin@ecotrack.ph` | `AdminPass123!` | `/admin/dashboard` |
| **Collection Personnel** | `collector1@ecotrack.ph` | `CollectorPass123!` | `/personnel/dashboard` |
| **Collection Personnel 2** | `collector2@ecotrack.ph` | `CollectorPass123!` | `/personnel/dashboard` |
| **Resident** | `juan.delacruz@gmail.com` | `ResidentPass123!` | `/resident/dashboard` |
| **Resident 2** | `maria.santos@gmail.com` | `ResidentPass123!` | `/resident/dashboard` |

> *Tip: A **Demo Switcher** is also available in the navbar and on the login page for 1-click evaluation during presentations.*

---

## 4. Installation and Setup Guide

### Step 1: Navigate to Project Directory
```powershell
cd C:\Users\User\.gemini\antigravity\scratch\eco_track
```

### Step 2: Install Python Dependencies
```powershell
pip install -r requirements.txt
```

### Step 3: Initialize Database & User Accounts
```powershell
python seed_data.py
```

### Step 4: Run the Web Application
```powershell
python run.py
```
Open your browser and navigate to:
```
http://127.0.0.1:5000
```

---

## 5. End-to-End Workflow Testing Guide

To test the complete workflow from start to finish:

1. **Step 1: Resident Reports Waste**
   - Log in as Resident (`juan.delacruz@gmail.com` or click **Demo Switcher &rarr; Resident**).
   - Click **"Report Waste (+ Pin)"**.
   - Click anywhere inside the green boundary on the map (or use the landmark jump buttons, e.g. *Minglanilla Public Market*).
   - Enter title, description, and street location (optional: attach a photo).
   - Click **"Review & Confirm Report"** and submit.
   - Note the generated tracking ID (e.g., `ECO-2026-XXXX`).

2. **Step 2: Administrator Reviews & Verifies**
   - Click **Demo Switcher &rarr; Administrator**.
   - Navigate to **"Manage Reports"** or open the pending report from the dashboard.
   - Click **"Review"** &rarr; select **"Verify Report"** &rarr; Submit. Status becomes `Verified`.

3. **Step 3: Administrator Assigns Task**
   - On the same report page, select a collector (e.g., *Danilo Santos*) and set priority (e.g. *High*).
   - Click **"Confirm Assignment"**. Status transitions to `Assigned`.

4. **Step 4: Collector Picks Up & Clears Waste**
   - Click **Demo Switcher &rarr; Collection Personnel**.
   - See the task in your active queue &rarr; click **"Attend Task"**.
   - Select **"Mark as In Progress"** &rarr; Submit. Status becomes `In Progress`.
   - Once cleared, select **"Mark as Collected"**, attach an optional clearance proof photo and notes, and submit. Status transitions to `Collected`.

5. **Step 5: Administrator Confirms Resolution**
   - Switch back to **Administrator**.
   - Open the collected report, inspect the collector's proof photo and notes.
   - Click **"Officially Confirm as COMPLETED"**. Status transitions to `Completed`.

6. **Step 6: Resident Verifies Completion**
   - Switch back to **Resident**.
   - View your notifications and open your report tracking page to view the full resolution audit trail.

---

## 6. Project Directory Structure

```
eco_track/
│── config.py                      # Application configuration (SQLite & MySQL)
│── run.py                         # Application execution entry point
│── seed_data.py                   # User seeding & baseline schedule setup
│── test_app.py                    # Automated test suite
│── ecotrack_mysql_schema.sql      # Standalone MySQL DDL schema dump
│── requirements.txt               # Python package dependencies
│── .env                           # Environment configuration
│── .env.example                   # Template environment configuration
│── app/
│   ├── __init__.py                # Flask application factory
│   ├── models.py                  # Relational SQLAlchemy database models
│   ├── forms.py                   # Flask-WTF forms and validators
│   ├── routes/
│   │   ├── main.py                # Public landing page, schedules, capstone info
│   │   ├── auth.py                # Authentication, register, demo login switcher
│   │   ├── resident.py            # Resident dashboard, GIS reporting, tracking
│   │   ├── admin.py               # Centralized map, review, assignment, users
│   │   ├── personnel.py           # Task management, route map, proof upload
│   │   └── api.py                 # REST GeoJSON endpoints & coordinate validator
│   ├── utils/
│   │   ├── geo.py                 # Poblacion boundary polygon & ray-casting validator
│   │   └── security.py            # Role decorators, upload security, audit logger
│   ├── static/
│   │   ├── css/style.css          # Forest green & navy custom styling
│   │   ├── js/gis_map.js          # Leaflet GIS controller (Pins, boundary, validation)
│   │   └── uploads/               # Report and collection proof image uploads
│   └── templates/
│       ├── shared/                # Base layout, landing page, schedules, about
│       ├── auth/                  # Login and resident registration
│       ├── resident/              # Resident dashboard, new report, track, history
│       ├── admin/                 # Admin dashboard, map, reports, users, schedules
│       └── personnel/             # Personnel dashboard, task detail, route map
```
