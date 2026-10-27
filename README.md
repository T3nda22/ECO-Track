# A Proposed Waste Management System for Minglanilla, Cebu (ECO TRACK)
### Community Reporting & GIS-Based Waste Monitoring System — Piloted in Minglanilla Poblacion

> **Capstone Research Alignment (Deliverables No. 1 & No. 2):**
> This system implements the software-only community reporting and Geographic Information System (GIS) visualization platform described in **"A Proposed Waste Management System for Minglanilla, Cebu"**.

---

## 1. System Overview & Research Alignment

Based on the **Review of Related Literature Synthesis (Deliverable No. 2)** and **Scope and Limitations (Deliverable No. 1)**, this web-based system removes expensive IoT/RFID hardware dependencies by turning citizen observation into location-tagged, map-based waste reports:

1. **Reporting of Waste Concerns by Residents:** Residents pinpoint on an interactive GIS map the location of garbage bins that are full and in need of cleaning or collection, and submit these reports directly through the application.
2. **Recording of Waste-Related Information:** The system records each report's **location** (coordinates and street/landmark address), **photo**, **time submitted**, and **status**.
3. **Shared GIS-Based Map Visualization:** System administrators and garbage collection personnel view the submitted reports as markers on the **same GIS-based map** (`Leaflet.js` + `OpenStreetMap`).
4. **Updating of Report Status by Garbage Collection Personnel:** Garbage collection personnel mark reported bins as **`Collected`** or **`Cleaned`**, which updates the report's status on the map.
5. **Monitoring of Concerns by Administrators:** System administrators monitor all reported concerns, tracking which reports remain **Outstanding (`Pending`)** and which have been **Addressed (`Collected` / `Cleaned`)**.
6. **Geographical Coverage:** Coverage is limited to the Municipality of Minglanilla, Cebu, with piloting focused on **Minglanilla Poblacion (Wards 1–4)**.

---

## 2. Pre-Configured Test Credentials

You can switch between all 3 roles anytime using the **Demo Switcher** dropdown in the top navigation bar, or sign in with:

| Stakeholder Role | Email | Password | Primary Portal |
|---|---|---|---|
| **Resident / Community Member** | `juan.delacruz@gmail.com` | `ResidentPass123!` | `/resident/dashboard` |
| **Garbage Collection Personnel** | `collector1@ecotrack.ph` | `CollectorPass123!` | `/personnel/dashboard` |
| **System Administrator** | `admin@ecotrack.ph` | `AdminPass123!` | `/admin/dashboard` |

---

## 3. Running the System

```powershell
cd C:\Users\User\.gemini\antigravity\scratch\eco_track
.\.venv\Scripts\python.exe seed_data.py
.\.venv\Scripts\python.exe run.py
```

Then open **http://127.0.0.1:5000** in your browser.
