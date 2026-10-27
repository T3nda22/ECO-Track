# ECO TRACK: Deployment & Testing Options Guide

This guide covers how to deploy **ECO TRACK** (`A Proposed Waste Management System for Minglanilla, Cebu`) to **Netlify**, as well as how to run the Python Flask server locally or on cloud Python hosts.

---

## Method 1: Deploy to Netlify (Recommended — 100% Free & Instant)

Because Netlify hosts static/SPA web applications rather than persistent Python WSGI servers, this project includes a complete, production-ready **Netlify Web & GIS Bundle** in [`netlify_dist/`](file:///C:/Users/User/.gemini/antigravity/scratch/eco_track/netlify_dist) along with [`netlify.toml`](file:///C:/Users/User/.gemini/antigravity/scratch/eco_track/netlify.toml).

It preserves the exact same modern UI design, Leaflet GIS map of **Barangay Poblacion, Minglanilla, Cebu**, ray-casting boundary validation, photo uploads, and all three user roles (**Resident**, **Garbage Collection Personnel**, and **System Administrator**) using browser persistence (`localStorage`).

### Option A: Netlify Drag-and-Drop (Fastest — 15 Seconds, No Git Required)
1. Open [https://app.netlify.com/drop](https://app.netlify.com/drop) (or go to your Netlify Dashboard &rarr; **Sites**).
2. Open Windows File Explorer to:
   ```text
   C:\Users\User\.gemini\antigravity\scratch\eco_track
   ```
3. Drag and drop the **`netlify_dist`** folder directly into the Netlify Drop box in your browser.
4. Netlify will immediately publish your live site (e.g., `https://eco-track-minglanilla.netlify.app`).

### Option B: Deploy to Netlify via GitHub (Automatic Continuous Deployment)
1. Push your `eco_track` project folder to a GitHub repository:
   ```powershell
   cd C:\Users\User\.gemini\antigravity\scratch\eco_track
   git init
   git add .
   git commit -m "Add ECO TRACK Minglanilla GIS system and Netlify build"
   git branch -M main
   git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO.git
   git push -u origin main
   ```
2. Log in to [https://app.netlify.com](https://app.netlify.com) and click **Add new site** &rarr; **Import an existing project** &rarr; **GitHub**.
3. Select your repository. Netlify will automatically detect [`netlify.toml`](file:///C:/Users/User/.gemini/antigravity/scratch/eco_track/netlify.toml) with:
   - **Publish directory:** `netlify_dist`
4. Click **Deploy site**.

### Option C: Deploy via Netlify CLI (From Terminal)
If you have Node.js installed, you can deploy directly from PowerShell:
```powershell
cd C:\Users\User\.gemini\antigravity\scratch\eco_track
npx netlify-cli deploy --prod --dir=netlify_dist
```

---

## Method 2: Local PC Testing (Python Flask + SQLite Server)

Run the Python Flask server on your computer:

```powershell
cd C:\Users\User\.gemini\antigravity\scratch\eco_track
.\.venv\Scripts\python.exe run.py
```

Open your web browser and go to:
👉 **`http://127.0.0.1:5000`**

---

## Method 3: Deploy the Python Flask Server (Render.com / PythonAnywhere)

If you also want to host the Python Flask + SQLAlchemy backend in the cloud:

1. Push the repository to GitHub.
2. On [Render.com](https://render.com), click **New +** &rarr; **Web Service** and connect your repository:
   - **Environment:** `Python 3`
   - **Build Command:** `pip install -r requirements.txt && python seed_data.py`
   - **Start Command:** `gunicorn wsgi:app`
