# TutorMate — Project Context & Master Guide

> **Single Source of Truth** for TutorMate SaaS codebase, architecture, rules, database schemas, and feature roadmap.

---

## 📌 1. Project Overview & Vision

**TutorMate** is a modern, AI-powered Tutor Management SaaS designed specifically to streamline private tutoring, coaching management, student-parent-tutor communication, fee tracking, batch management, and attendance tracking.

* **Target Market**: Global, engineered for SaaS scalability.
* **Core Philosophy**: Fast, mobile-first, highly secure, minimal UI, zero friction for tutors, students, and parents.

---

## 👥 2. User Roles & Permission Matrix

1. **Tutor (Primary User)**:
   - Manages batches, student enrollments, attendance, fees/payments, study materials, and schedules.
   - Access to Tutor Dashboard (`/tutor/...`).
2. **Student**:
   - Views enrolled classes, schedules, study materials, homework, and payment status.
   - Access to Student Portal (`/student/...`).
3. **Parent**:
   - Tracks child's attendance, test results, fee dues, and direct tutor contact/reports.
   - Access to Parent Portal (`/parent/...`).
4. **Admin**:
   - Platform analytics, system settings, subscription management, user roles, system audit logs.

---

## 🛠️ 3. Tech Stack & System Architecture

### Frontend
- **Framework**: Next.js 16 (App Router)
- **UI Library**: React 19, Lucide React Icons
- **Language**: TypeScript (Strict Mode)
- **Styling**: Tailwind CSS v4, PostCSS, `next-themes` (Dark/Light mode)
- **PWA**: Custom PWA Installation Prompt (`PwaInstallPrompt.tsx`) & Offline Queue (`offlineQueue.ts`)

### Backend & Database
- **Database & Auth**: Supabase (PostgreSQL with RLS, Supabase Auth via `@supabase/ssr`)
- **Rate Limiting**: Upstash Redis (`@upstash/ratelimit`, `@upstash/redis`)
- **API Strategy**: Next.js Server Actions (`src/actions/`) & REST/Route Handlers (`src/app/api/`)

### Key Helpers & Services
- **Auth & Permissions**: `src/lib/authHelpers.ts`, `src/lib/permissions.ts`
- **Rate Limiting**: `src/lib/ratelimit.ts`
- **Subscriptions**: `src/lib/subscriptions.ts`, `src/lib/serverSubscriptions.ts`

---

## 📂 4. Project Folder Structure

```
tutormate/
├── .agents/                    # Custom agent instructions & skills
├── public/                     # Static assets & PWA manifest/icons
├── src/
│   ├── actions/                # Next.js Server Actions (media, enrollments, fees, etc.)
│   ├── app/                    # Next.js App Router
│   │   ├── (auth)/             # Auth routes (login, register, reset-password)
│   │   ├── (public)/           # Public landing pages
│   │   ├── api/                # API route handlers & webhooks
│   │   ├── tutor/              # Tutor Dashboard & management routes
│   │   ├── student/            # Student Portal routes
│   │   ├── parent/             # Parent Portal routes
│   │   ├── globals.css         # Global Tailwind v4 styles & theme tokens
│   │   └── layout.tsx          # Root Layout (Theme & Context Providers)
│   ├── components/             # Reusable UI components
│   │   ├── navigation/         # Mobile & Desktop Navigation
│   │   ├── ui/                 # Core design system components (buttons, modals, cards)
│   │   └── PwaInstallPrompt.tsx
│   ├── context/                # React Contexts (Auth, Theme, Toast)
│   ├── hooks/                  # Custom React hooks
│   ├── lib/                    # Core utilities & database clients
│   │   ├── supabase/           # Supabase client & server instances
│   │   ├── authHelpers.ts      # Role verification & user context
│   │   ├── permissions.ts      # Permission checks
│   │   ├── ratelimit.ts        # Upstash Redis rate limiting logic
│   │   └── utils.ts            # General formatting & helper functions
│   ├── locales/                # Internationalization (English / Bangla strings)
│   ├── types/                  # TypeScript interfaces & database definitions
│   └── proxy.ts                # Middleware / Proxy utilities
├── AGENTS.md                   # Primary AI Agent Rules
├── SYSTEM.md                   # Senior Architect rules & AI behaviors
├── PROJECT.md                  # Project vision, tech stack & quality standards
├── FEATURE_TEMPLATE.md         # Template for planning new features
└── CONTEXT.md                  # Master context document (This file)
```

---

## 🗄️ 5. Database Schema & Data Models

TutorMate relies on Supabase PostgreSQL with strict **Row Level Security (RLS)** rules:

* **`profiles`**: User details (id `uuid references auth.users`, full_name, email, role `tutor|student|parent|admin`, phone, avatar_url, created_at).
* **`batches`**: Coaching/Tutor classes (id, tutor_id, name, subject, schedule_days, fee_amount, created_at).
* **`enrollments`**: Student-Batch associations (id, batch_id, student_id, parent_id, status, joined_at).
* **`attendance`**: Daily attendance records (id, batch_id, student_id, date, status `present|absent|late`, notes).
* **`payments` / `fees`**: Fee invoices & payment tracking (id, student_id, batch_id, amount, due_date, status `paid|pending|overdue`, payment_method).
* **`study_materials`**: File uploads & links (id, tutor_id, batch_id, title, file_url, created_at).
* **`subscriptions`**: Tutor platform subscriptions (plan_name, status, expires_at).

---

## 🎨 6. UI/UX & Design System Guidelines

- **Typography & Layout**: Clean, readable sans-serif fonts, generous white space, mobile-first navigation drawer/bar.
- **Color Palette**: Dark mode neutral slates/blacks with vibrant primary accents (Indigo/Blue/Emerald for success).
- **Responsive Navigation**: Desktop sidebar + Mobile bottom nav ([MobileNav.tsx](file:///c:/Users/Zahid/OneDrive/Desktop/tutormate/src/components/navigation/MobileNav.tsx)).
- **Interactive Feedback**: Loading skeletons, toast notifications, offline indicators.

---

## 🔒 7. Security, Auth & Rate Limiting Conventions

1. **Authentication**: Handled via Supabase SSR Cookies (`@supabase/ssr`).
2. **Role Authorization**: Every Server Action and API route must verify user authentication and role permissions (`authHelpers.ts` / `permissions.ts`).
3. **Rate Limiting**: Critical endpoints (Auth, File upload, Payment submission) use Upstash Redis rate limiters (`src/lib/ratelimit.ts`).
4. **Data Privacy**: RLS policies prevent Tutors or Students from accessing data outside their own assigned batches/students.

---

## ✅ 8. Completed Features & Current Status

- [x] Multi-role Auth System (Tutor, Student, Parent dashboards)
- [x] Supabase SSR authentication & middleware setup
- [x] Tutor Dashboard Layout & Mobile Navigation
- [x] Upstash Redis Rate Limiting integration
- [x] Role permission helper functions
- [x] Dark/Light Mode support via `next-themes`
- [x] PWA Install Prompt component
- [x] Timetable & Routine Management System (Conflict detection, slot editor, custom periods/days, CSV & print export)

---

## 🚀 9. Pending Features & Future Roadmap

- [ ] Interactive Batch & Student Enrollment management UI
- [ ] Automated Fee Reminders & SMS/WhatsApp Notification integration
- [ ] Offline-first Attendance Tracking with sync queue
- [ ] AI-Powered Student Progress Reports & Quiz Generator (Gemini API)
- [ ] Parent Portal Mobile Dashboard with Instant Notification feeds
- [ ] Payment Gateway Integration (bkash/Nagad/SSLCommerz for BD market)

---

## 📜 10. Key Architectural Decisions (ADR)

* **Why Next.js Server Actions?**: To minimize client-side bundle size, eliminate boilerplate API routes, and execute type-safe database calls directly on the server with user cookies.
* **Why Upstash Redis for Rate Limiting?**: Serverless-compatible, sub-millisecond edge rate limiting without requiring persistent server infrastructure.
* **Why Supabase RLS?**: Ensures data isolation directly at the database layer, protecting multi-tenant user data even if application-level checks fail.
