# Krishi Sahayak Backend Architecture & Specification

Refer to [farmer_crop_advisory_backend_prompt.md](farmer_crop_advisory_backend_prompt.md) for the master prompt and detailed domain specifications.

## Technology Stack
- **Framework**: NestJS 11+ with TypeScript
- **Database**: MySQL 8+ via `mysql2/promise` using raw parameterized SQL (No ORM, as strictly specified)
- **Authentication**: JWT with Mobile OTP verification & role-based access control (Farmer, Field Officer, Admin)
- **External Adapters**: Open-Meteo for live weather, mock SMS & WhatsApp notification providers
- **Cache**: Redis with automatic in-memory fallback
- **File Storage**: Local uploads provider (`/uploads`) with static serving
- **Deployment**: Render-ready Web Service with `render.yaml` blueprint

## Schema & Tables
- Core Tables: `farmers`, `districts`, `crops`, `pests`, `farm_profiles`, `officers`, `advisory_queries`, `escalations`, `weather_cache`, `reports`, `device_tokens`, `broadcasts`, `outbreak_alerts`, `notifications`, `schemes`, `fertilizer_guidelines`, `yield_references`, `feedback`
- Integrated Features: `farmer_locations`, `farmer_crops`, `crop_activities`, `ai_conversations`, `ai_messages`, `audit_logs`

## Database Setup
To initialize or verify tables on any target MySQL instance:
```bash
npm run db:setup
```
