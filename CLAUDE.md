# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a **Next.js 14 App Router** application for weekly priority management aligned to strategic initiatives. It uses **MongoDB Atlas** for the database, **NextAuth.js** for authentication, and is deployed on **Vercel**.

**Key concepts:**
- Users create up to 5 weekly priorities aligned to strategic initiatives
- Each priority has status (EN_TIEMPO, EN_RIESGO, BLOQUEADO, COMPLETADO) and completion percentage
- Two roles: ADMIN (manages users/initiatives) and USER (manages own priorities)
- Automatic weekly cycles (Monday-Friday)

## Development Commands

```bash
# Install dependencies
npm install

# Development server (runs on http://localhost:3000)
npm run dev

# Production build
npm run build

# Start production server
npm start

# Lint
npm run lint

# Initialize database (run once after MongoDB setup)
npx tsx scripts/init-db.ts
```

## Environment Variables

Required environment variables (see `.env.example`):
- `MONGODB_URI`: MongoDB Atlas connection string
- `NEXTAUTH_URL`: Application URL (http://localhost:3000 for dev)
- `NEXTAUTH_SECRET`: Generate with `openssl rand -base64 32`
- `ADMIN_INITIAL_PASSWORD`: Initial admin password (default: GCPGlobaldsdsd323232)

## Architecture

### Database Models (Mongoose)

**Main collections:**

1. **User** (`models/User.ts`)
   - Fields: name, email, password (bcrypt hashed), role (ADMIN/USER), isActive
   - Methods: `comparePassword()` for authentication
   - Pre-save hook to hash passwords

2. **Priority** (`models/Priority.ts`)
   - Fields: title, description, weekStart, weekEnd, completionPercentage, status, userId (ref), initiativeId (ref)
   - Statuses: EN_TIEMPO, EN_RIESGO, BLOQUEADO, COMPLETADO
   - Indexes on userId, weekStart, and status for performance

3. **StrategicInitiative** (`models/StrategicInitiative.ts`)
   - Fields: name, description, color (hex), order, isActive
   - Used to categorize priorities

4. **KPI** (`models/KPI.ts`)
   - Fields: name, description, strategicObjective, initiativeId (ref), unit, periodicity, responsible (ref), formula, dataSource, target, tolerance, kpiType, tags, status, currentVersion, versions, createdBy (ref), isActive
   - Statuses: BORRADOR, EN_REVISION, APROBADO, ACTIVO, INACTIVO, ARCHIVADO
   - Includes versioning system for formula/target changes
   - Uses hot-formula-parser for formula calculations

5. **KPIValue** (`models/KPIValue.ts`)
   - Fields: kpiId (ref), kpiVersion, value, calculatedValue, variables, periodStart, periodEnd, status, registeredBy (ref), notes, approvedBy (ref)
   - Statuses: PRELIMINAR, CONFIRMADO, REVISADO, APROBADO
   - Stores manual or calculated values for KPIs

### Database Connection

**Global connection caching** is implemented in `lib/mongodb.ts`:
- Stores connection in `global.mongoose` cache to prevent multiple connections in serverless environment
- Always use `await connectDB()` before database operations in API routes
- Connection is reused across requests in development

### Authentication (NextAuth.js)

Configuration: `app/api/auth/[...nextauth]/route.ts`

- **Provider**: Credentials (email/password)
- **Session strategy**: JWT (no database sessions)
- **Session duration**: 30 days
- **Callbacks**: Custom JWT and session callbacks add `id` and `role` to session
- **Login page**: `/login` (custom)

**Authentication flow:**
1. User submits email/password via credentials provider
2. `authorize()` checks database for user, validates password with bcrypt
3. JWT token created with user id and role
4. Session object enriched with id and role via callbacks

### App Structure (Next.js App Router)

```
app/
├── api/
│   └── auth/[...nextauth]/route.ts    # NextAuth handler
├── dashboard/page.tsx                  # Main dashboard (authenticated)
├── login/page.tsx                      # Login page (public)
├── layout.tsx                          # Root layout with AuthProvider
├── providers.tsx                       # Client-side SessionProvider wrapper
├── page.tsx                            # Root redirect
└── globals.css                         # Tailwind styles
```

**Note**: Additional API routes for users, initiatives, and priorities appear to be in development but not yet present.

### Session Management

- Use `'use client'` and `useSession()` from `next-auth/react` in client components
- For server components, use `getServerSession()` from `next-auth/next`
- Session includes: `user.id`, `user.email`, `user.name`, `user.role`

## Database Initialization

The `scripts/init-db.ts` script creates:
1. Admin user (email: admin@empresa.com)
2. Five strategic initiatives (Generación de ingresos, Nuevo negocio, Eficiencia Operativa, Analítica Avanzada, Orca SNS)

**Run only once** after setting up MongoDB Atlas. Safe to re-run (checks if data exists).

## TypeScript Configuration

- Path alias: `@/*` maps to project root (e.g., `@/lib/mongodb`)
- Scripts directory excluded from compilation
- Strict mode enabled

## Common Patterns

### API Route Pattern

```typescript
import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Model from '@/models/Model';

export async function GET() {
  try {
    await connectDB();
    const data = await Model.find();
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json({ error: 'Message' }, { status: 500 });
  }
}
```

### Protected Routes

Check user role in API routes:
```typescript
import { getServerSession } from 'next-auth/next';

const session = await getServerSession();
if (!session) {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
}
if (session.user.role !== 'ADMIN') {
  return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
}
```

## Deployment

**Target platform**: Vercel

**Pre-deployment checklist:**
1. MongoDB Atlas cluster created with Network Access configured (0.0.0.0/0 for Vercel)
2. Environment variables set in Vercel dashboard
3. Database initialized via `npx tsx scripts/init-db.ts`
4. Test build locally: `npm run build`

**Post-deployment:**
- Change default admin password immediately
- Create user accounts for team members
- Verify/adjust strategic initiatives

## Automatic Priority Rescheduling

The system can reschedule priorities that expire (pass their `weekEnd`) in `EN_TIEMPO` status:

- **How it works**: Just like manual rescheduling in Kanban, the original is marked `REPROGRAMADO` and a copy is created for the next week with `status: EN_TIEMPO`, `isCarriedOver: true`, and progress reset to 0%
- **Admin Panel**: Access `/admin/auto-reschedule` to view statistics and execute manually with "▶️ Ejecutar Ahora" button
- **Manual trigger**: Call `POST /api/priorities/auto-reschedule`
- **External cron (optional)**: Use `GET /api/cron/weekly-reschedule` with free services like cron-job.org for weekly automation
- **Testing**: Run `npx tsx scripts/test-auto-reschedule.ts`

See `docs/AUTO_RESCHEDULE.md` for detailed documentation.

## KPI Management System

The application includes a comprehensive KPI (Key Performance Indicators) management system:

### Key Features

- **KPI Definition**: Name, description, strategic objective, initiative, unit, periodicity, responsible, formula, target, tolerance, type, tags
- **Lifecycle Management**: BORRADOR → EN_REVISION → APROBADO → ACTIVO
- **Versioning**: Automatic versioning when formula, target, or tolerance changes
- **Formula Editor**: WYSIWYG editor with hot-formula-parser integration
  - Supports functions: SUM, AVERAGE, MAX, MIN, IF, ABS, ROUND, SQRT, POW
  - Real-time validation
  - Code completion
- **Manual Value Entry**: Users can register values for active KPIs with period tracking
- **Status Tracking**: Automatic calculation of status vs targets (En meta, En alerta, Por debajo, Crítico)

### Admin Pages

- `/admin/kpis` - KPI management dashboard
- `/admin/kpis/new` - Create new KPI

### User Pages

- `/kpi-tracking` - View active KPIs and register values

### API Routes

- `/api/kpis` - CRUD operations for KPIs
- `/api/kpis/[id]/review` - Mark KPI for review
- `/api/kpis/[id]/approve` - Approve KPI
- `/api/kpis/[id]/activate` - Activate KPI
- `/api/kpi-values` - CRUD operations for KPI values

See `docs/KPI_MANAGEMENT.md` for detailed documentation.

## Performance Reports System

The application includes an automatic performance reporting system that sends statistical analysis to users via email:

### Key Features

- **Automated Reports**: Weekly and/or monthly reports sent automatically to all active users
- **Performance Metrics**: Priorities attended, completion rate, delayed priorities, tasks executed, hours reported
- **Comparative Analysis**: Each metric compares current period vs previous period with percentage changes
- **Top Priorities**: List of top 5 priorities from the period
- **Personalized Insights**: Automatic messages based on performance trends (improvement, opportunity, stable)

### Admin Configuration

- **Admin Panel**: Access `/admin/report-settings` to configure report frequency and schedule
- **Frequency Options**: NINGUNO (disabled), SEMANAL (weekly), MENSUAL (monthly), AMBOS (both)
- **Weekly Reports**: Configure day of week (0-6) and hour (0-23) for sending
- **Monthly Reports**: Configure day of month (1-28) and hour (0-23) for sending
- **Test Mode**: Send test reports to specific email before enabling for all users

### API Routes

- `/api/admin/report-settings` - GET/PUT for admin-only configuration
- `/api/reports/send` - POST to manually send reports (admin only)
- `/api/cron/send-reports` - GET endpoint for external cron automation

### Automation Setup

Use a free service like cron-job.org to call `/api/cron/send-reports` every hour. The system automatically checks configuration and sends reports only when scheduled.

### Testing

- **UI Test**: Use test mode in `/admin/report-settings` to send sample reports
- **Script Test**: Run `npx tsx scripts/test-reports.ts` to generate reports without sending emails

See `docs/REPORTS.md` for detailed documentation.

## Important Notes

- **Password security**: All passwords are hashed with bcrypt (salt rounds: 10)
- **Mongoose models**: Always check if model exists before defining (`mongoose.models.ModelName || mongoose.model(...)`) to prevent recompilation errors in development
- **Weekly periods**: Priorities are tied to week ranges (weekStart/weekEnd)
- **Maximum priorities**: Recommended limit is 5 per user per week
- **Auto-rescheduling**: Priorities in `EN_TIEMPO` status are automatically rescheduled when they expire
- **KPI formulas**: Use hot-formula-parser syntax; formulas are validated in real-time
- **Language**: All UI and messages are in Spanish
