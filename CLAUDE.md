# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

pg-boss-ui is an admin dashboard for managing and monitoring pg-boss job queues in PostgreSQL databases. Built with Next.js 16 (App Router), React 19, TypeScript, and Tailwind CSS 4.

## Commands

```bash
npm run dev      # Start development server (localhost:3000)
npm run build    # Production build
npm start        # Start production server
npm run lint     # Run ESLint
```

## Architecture

### Data Flow
- **Client-side**: Zustand store persists database connections to localStorage
- **API requests**: Connection strings passed via query parameters to API routes
- **Data fetching**: SWR hooks with 5-second auto-refresh intervals
- **Real-time updates**: Server-Sent Events via `/api/stream`

### Key Directories
- `src/app/api/` - Backend API routes (databases, jobs, metrics, queues, schedules, stats, stream)
- `src/lib/db/` - PostgreSQL connection pooling (`pool-manager.ts`) and query functions (`queries.ts`)
- `src/lib/hooks/` - SWR-based data fetching hooks (use-stats, use-jobs, use-queues, etc.)
- `src/lib/stores/` - Zustand stores with localStorage persistence
- `src/components/ui/` - shadcn/ui components (new-york style)

### Database Layer
- `pool-manager.ts` - Singleton pattern managing multiple PostgreSQL connection pools
- `queries.ts` - All SQL queries for pg-boss schema (default schema: "pgboss")
- Job states: created, retry, active, completed, cancelled, failed

### UI Patterns
- Components marked `"use client"` for client-side interactivity
- Forms use react-hook-form with Zod validation
- Sonner for toast notifications
- next-themes for dark/light mode support
- Path alias: `@/*` maps to `./src/*`
