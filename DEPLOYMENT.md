# ECO TRACK: Deployment & Testing Options Guide

This guide provides 4 different ways to deploy and test **ECO TRACK**, ranging from instant local testing on your PC/phone to free 24/7 cloud hosting on the internet.

---

## Method 1: Local PC Testing (Instant, 5 seconds)

Run the real Flask server on your computer:

```powershell
cd C:\Users\User\.gemini\antigravity\scratch\eco_track
python run.py
```

Open your web browser and go to:
👉 **`http://127.0.0.1:5000`**

---

## Method 2: Test on Your Mobile Phone / Tablet (Same Wi-Fi)

ECO TRACK is configured to listen on all network interfaces (`0.0.0.0`). You can test the app on your phone, snap real photos with your phone camera, and use real mobile GPS:

1. Connect your smartphone/tablet to the **same Wi-Fi network** as your PC.
2. Run `python run.py` on your computer.
3. Open your mobile browser (Chrome/Safari) and go to your PC's IP address:
   👉 **`http://192.168.1.39:5000`**

*(Note: If the page doesn't load on your phone, Windows Defender Firewall might be blocking incoming port 5000. Allow Python through the firewall or use Method 3 below).*

---

## Method 3: Instant Public HTTPS Link (Share with Anyone Anywhere)

If you want a public link to send to your capstone groupmates, panelists, or professor without setting up cloud servers, use a free secure tunnel.

### Option A: Using Localtunnel (Free, No Sign-up required)
If you have Node.js / npx installed:
```powershell
# In terminal 1: run ECO TRACK
python run.py

# In terminal 2: create public URL
npx localtunnel --port 5000
```
It gives you an instant public HTTPS link (e.g. `https://eco-track-minglanilla.loca.lt`).

### Option B: Using Cloudflare Tunnel (Free, No Port Forwarding)
Download the free `cloudflared` binary from Cloudflare:
```powershell
cloudflared tunnel --url http://localhost:5000
```
It provides a free secure `https://random-name.trycloudflare.com` URL.

### Option C: Using ngrok
1. Download from [ngrok.com](https://ngrok.com) (free account).
2. Run:
   ```powershell
   ngrok http 5000
   ```
3. Copy the `https://...ngrok-free.app` URL and share it.

---

## Method 4: Free Permanent Cloud Hosting (24/7 Online)

### Option A: Deploy on Render.com (Recommended - 100% Free)
Render supports Python web services for free:

1. Push your project to a GitHub repository:
   ```powershell
   cd C:\Users\User\.gemini\antigravity\scratch\eco_track
   git init
   git add .
   git commit -m "Initial ECO TRACK deployment commit"
   # Push to your GitHub repo
   ```
2. Go to [Render.com](https://render.com) & sign in (free).
3. Click **New +** &rarr; **Web Service**.
4. Select your GitHub repository.
5. Configure:
   - **Environment:** `Python 3`
   - **Build Command:** `pip install -r requirements.txt && python seed_data.py`
   - **Start Command:** `gunicorn wsgi:app`
6. Add Environment Variable:
   - `SECRET_KEY`: `your-random-secret-key`
   - `FLASK_ENV`: `production`
7. Click **Create Web Service**. Within 2 minutes, Render gives you a free live URL:
   👉 `https://eco-track-xxxx.onrender.com`

---

### Option B: Deploy on PythonAnywhere (Free Python & MySQL)
PythonAnywhere offers free Python web app hosting with a free MySQL database:

1. Create a free account at [pythonanywhere.com](https://www.pythonanywhere.com).
2. Go to the **Web** tab &rarr; **Add a new web app** &rarr; Select **Flask** &rarr; **Python 3.10+**.
3. Upload the `eco_track` directory files or clone from GitHub.
4. Go to the **Databases** tab and enable your free **MySQL database**.
5. Set `DATABASE_URL=mysql+pymysql://username:password@username.mysql.pythonanywhere-services.com/username$ecotrack` in `.env`.
6. Run `python seed_data.py` in the Bash console.
7. Your app is live 24/7 at `https://yourusername.pythonanywhere.com`!

---

## Quick Summary: Which Should You Use?

| Goal | Best Method | Setup Time |
|---|---|---|
| **Test right now on your PC** | Method 1 (`python run.py`) | 5 seconds |
| **Test on phone camera & GPS** | Method 2 (`http://192.168.1.39:5000`) | 10 seconds |
| **Share link with groupmates/teacher today** | Method 3 (Localtunnel / Cloudflared / ngrok) | 1 minute |
| **Permanent 24/7 live website for defense** | Method 4 (Render.com or PythonAnywhere) | 5 minutes |
