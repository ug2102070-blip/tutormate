# TutorMate

TutorMate is a modern AI-powered Tutor Management SaaS designed for tutors, students, and parents.

---

# Vision

Build the best tutor operating system for global scalability.
The product should feel polished, premium, and production-ready.

---

# Tech Stack

### Frontend & Core
- **Framework**: Next.js 16 (App Router)
- **UI Library**: React 19, Lucide React Icons
- **Language**: TypeScript (Strict Mode)
- **Styling**: Tailwind CSS v4, PostCSS, `next-themes` (Dark/Light mode)

### Backend & Database
- **Database & Auth**: Supabase (PostgreSQL, Supabase Auth, Row Level Security)
- **Rate Limiting**: Upstash Redis (`@upstash/ratelimit`, `@upstash/redis`)
- **API Protocol**: Next.js Server Actions & API Routes

### AI & Integrations
- **AI Engine**: Gemini API
- **PWA**: PWA Install Prompt & Offline Support capabilities

---

# Design Principles

- Minimalist & Clean
- Professional & Premium Look
- Mobile-First & Responsive
- High Performance & Fast Load Times
- Accessible & Accessible Contrast
- Dark Mode Native Support

---

# Coding Standards

- TypeScript Strict Mode enabled
- Reusable, modular components
- Feature-based / Layered file structure
- Server Components by default; Client Components (`'use client'`) only when interactive state/hooks are required
- Zod validation for form/input schemas
- Clean error handling with actionable user feedback

---

# Database Rules

- Design with future scalability in mind
- UUID Primary Keys (`id uuid default gen_random_uuid()`)
- Automatic timestamps (`created_at`, `updated_at`)
- Row Level Security (RLS) enabled on all tables
- Appropriate B-tree indexes for foreign keys & filtered queries
- Soft deletes where appropriate (`deleted_at`)

---

# Product & Feature Rules

Every feature must answer:
1. Why does this feature exist?
2. Who uses it? (Admin / Tutor / Student / Parent)
3. What core problem does it solve?
4. Can it scale efficiently?
5. Can it be simplified without sacrificing user experience?

---

# Performance & Security Goals

- Fast Page Load & Server Side Rendering (SSR)
- Strict Rate Limiting on sensitive endpoints & actions
- Role-based permissions enforcement (Tutor, Student, Parent, Admin)
- Secure token & cookie management via `@supabase/ssr`
- Optimized queries avoiding N+1 loops
