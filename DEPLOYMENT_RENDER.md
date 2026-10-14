# Render Deployment Guide — Krishi Sahayak Platform

This guide outlines how to deploy the **Krishi Sahayak** backend (and bundled frontend) to [Render](https://render.com) with zero errors.

---

## 🚀 Key Deployment Highlights

1. **Unified Web Service**:
   - The NestJS backend serves both the API (`/api/v1`), Swagger Documentation (`/api/v1/docs`), and the responsive Farmer Web UI (`/`) on a single service.
2. **Dynamic Port & IP Binding**:
   - Automatically reads `PORT` from Render (default: `10000`) and binds to `0.0.0.0` to pass Render's port detection without timeout errors.
3. **Database URL & Cloud SSL Support**:
   - Accepts standard `DATABASE_URL` / `MYSQL_URL` provided by managed MySQL services (Aiven, TiDB, PlanetScale, Railway, Clever Cloud).
   - Automatically enables SSL (`{ rejectUnauthorized: false }`) when connecting to cloud MySQL providers.
4. **Resilient Redis Fallback**:
   - If a Redis instance is not configured, the platform automatically falls back to an internal in-memory store for OTP cooldowns and caching without crashing.
5. **Dynamic Frontend API Routing**:
   - The frontend in `app.js` dynamically routes requests to the current host (`/api/v1`), preventing any hardcoded `localhost` connection errors.

---

## 🛠️ Step-by-Step Deployment on Render

### Method 1: Using `render.yaml` (Recommended / 1-Click)

1. Push your repository to GitHub or GitLab.
2. Log in to [Render Dashboard](https://dashboard.render.com).
3. Click **New +** → **Blueprint**.
4. Select your `polyhouseadvisory` repository.
5. Render will detect `render.yaml` and configure:
   - **Environment**: Node
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `npm run start:prod`
   - **Health Check Path**: `/api/v1/health`
6. Under **Environment Variables**, provide your MySQL credentials:
   - Either set `DATABASE_URL` (e.g. `mysql://user:pass@host:port/crop_advisory?ssl-mode=REQUIRED`)
   - OR set individual `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`, `DB_SSL=true`.
7. Click **Apply**.

---

### Method 2: Manual Web Service Setup

If setting up manually without Blueprint:

1. Click **New +** → **Web Service**.
2. Connect your Git repository.
3. Configure the following:
   - **Name**: `krishi-sahayak-backend`
   - **Runtime**: `Node`
   - **Region**: Singapore / Frankfurt / Oregon (nearest to your users)
   - **Branch**: `main`
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `npm run start:prod`
   - **Plan**: `Free`
4. In **Advanced Settings**:
   - **Health Check Path**: `/api/v1/health`
5. Add the following **Environment Variables**:

| Variable | Value | Description |
|---|---|---|
| `NODE_ENV` | `production` | Node environment |
| `API_PREFIX` | `api/v1` | Base API routing prefix |
| `DATABASE_URL` | *Your cloud MySQL connection string* | e.g. `mysql://user:pass@host:port/crop_advisory` |
| `DB_SSL` | `true` | Required for Aiven / TiDB / Railway MySQL |
| `JWT_ACCESS_SECRET` | *(Random 32+ character string)* | Secret for signing JWT access tokens |
| `JWT_REFRESH_SECRET` | *(Random 32+ character string)* | Secret for refresh tokens |
| `WEATHER_PROVIDER` | `open_meteo` | Open-Meteo weather adapter |
| `WEATHER_BASE_URL` | `https://api.open-meteo.com/v1` | Open-Meteo API URL |
| `OTP_MODE` | `mock` | Mock SMS mode (or production provider) |

---

## 🗄️ Database Initialization

To set up the MySQL tables and seed data in your cloud database:

Run the setup command from your local terminal pointing to the cloud database:

```bash
# Using DATABASE_URL
DATABASE_URL="mysql://user:pass@host:port/crop_advisory" npm run db:setup
```

Or set the variables in your local `.env` and run:

```bash
npm run db:setup
```

This executes:
1. `farmer database.sql` (Creates all 18 core tables and reference lookups)
2. `migrations/001_integrated_features.sql` (Creates location, farmer crops, activities, AI chat, and audit tables)

---

## 🔍 Verification Checklist

After deployment succeeds on Render:

- **Frontend UI**: Visit `https://<your-subdomain>.onrender.com`
- **Swagger Documentation**: Visit `https://<your-subdomain>.onrender.com/api/v1/docs`
- **Health Check**: Visit `https://<your-subdomain>.onrender.com/api/v1/health`
- **Government Schemes**: `GET https://<your-subdomain>.onrender.com/api/v1/schemes`
- **Crop Pest & Weather Lookups**: `GET https://<your-subdomain>.onrender.com/api/v1/crops`
