# pg-boss-ui

A modern, real-time admin dashboard for managing and monitoring [pg-boss](https://github.com/timgit/pg-boss) job queues in PostgreSQL databases.

![License](https://img.shields.io/badge/license-MIT-blue.svg)

## Features

- 📊 **Real-time Monitoring** - Live job queue statistics and metrics with Server-Sent Events
- 🔐 **Secure Credential Storage** - AES-256-GCM encryption with PBKDF2-derived keys for database credentials
- 🗄️ **Multiple Database Connections** - Manage multiple pg-boss instances simultaneously
- 📈 **Performance Analytics** - Throughput graphs, speed metrics, and percentile analysis
- 🎯 **Job Management** - View, filter, and manage jobs across all states (created, active, completed, failed, etc.)
- ⚙️ **Queue Controls** - Monitor queue health, pause/resume operations
- 📅 **Schedule Viewer** - Track recurring and scheduled jobs
- 🌓 **Dark Mode** - Built-in theme support
- 🔒 **Security-First** - Master password protection, restricted database user setup script
- 🔄 **Auto-refresh** - 5-second polling intervals with SWR for optimal data freshness

## Tech Stack

- **Framework:** Next.js 16 (App Router)
- **UI:** React 19, Tailwind CSS 4, shadcn/ui (new-york style)
- **State Management:** Zustand with localStorage persistence
- **Data Fetching:** SWR with real-time updates
- **Database:** PostgreSQL with connection pooling
- **Encryption:** PBKDF2 + AES-256-GCM
- **TypeScript:** Full type safety

## Prerequisites

- Node.js 18+ (recommended: 20+)
- PostgreSQL database with an active pg-boss schema
- Database credentials with read access to the pg-boss schema

## Quick Start

### 1. Clone the repository

```bash
git clone https://github.com/your-username/pg-boss-ui.git
cd pg-boss-ui
```

### 2. Install dependencies

```bash
npm install
```

### 3. Configure environment

```bash
cp .env.example .env.local
```

Generate a secure session secret:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

Add the generated value to `.env.local`:

```env
SESSION_SECRET=<your-generated-secret>
```

### 4. Run the development server

```bash
npm run dev
```

Open [http://localhost:3001](http://localhost:3001) in your browser.

## Database User Setup (Recommended)

For enhanced security, create a dedicated PostgreSQL user with **read-only** access to the pg-boss schema:

```bash
chmod +x setup-pgboss-user.sh
./setup-pgboss-user.sh
```

This script will:
- Create a restricted PostgreSQL user
- Grant access exclusively to the pg-boss schema
- Revoke access to other schemas (including `public`)
- Generate a secure connection string

## Usage

### Adding a Database Connection

1. Click **Settings** in the sidebar
2. Click **Add Database**
3. Choose connection method:
   - **Connection String**: Paste a full PostgreSQL connection URL
   - **Connection Form**: Enter individual connection parameters
4. Configure SSL mode if needed (disable, require, verify-ca, verify-full)
5. Set a master password to encrypt credentials (first connection only)
6. Click **Test Connection** to verify
7. Save the connection

### Managing Jobs

- **Dashboard**: Overview of all queues with real-time metrics
- **Jobs Tab**: Filter by state (created, active, completed, failed, etc.)
- **Queues Tab**: Monitor queue-specific statistics
- **Schedules Tab**: View recurring and scheduled jobs
- **Metrics Tab**: Analyze throughput and performance over time

### Security Features

- **Encryption**: All database credentials are encrypted using AES-256-GCM with a PBKDF2-derived key
- **Master Password**: Required to decrypt stored connections (not stored anywhere)
- **Session Management**: JWT-based sessions with configurable expiration
- **SSL Support**: Full SSL/TLS configuration for database connections

## Production Deployment

### Build the application

```bash
npm run build
```

### Start the production server

```bash
npm start
```

The app will run on [http://localhost:3001](http://localhost:3001).

### Environment Variables

```env
SESSION_SECRET=<required>  # 32-byte base64-encoded secret for JWT signing
```

### Deployment Platforms

Deploy to any Node.js hosting platform:

- **Vercel**: [![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/your-username/pg-boss-ui)
- **Railway**, **Render**, **Fly.io**, etc.

Make sure to set the `SESSION_SECRET` environment variable in your deployment platform.

## Project Structure

```
pg-boss-ui/
├── src/
│   ├── app/
│   │   ├── api/          # API routes (databases, jobs, metrics, stats, stream)
│   │   ├── page.tsx      # Main dashboard
│   │   └── layout.tsx    # Root layout
│   ├── components/
│   │   ├── auth/         # Password protection components
│   │   ├── settings/     # Database connection management
│   │   ├── ui/           # shadcn/ui components
│   │   └── ...           # Feature components (jobs, queues, schedules, etc.)
│   ├── lib/
│   │   ├── db/           # PostgreSQL connection pooling & queries
│   │   ├── hooks/        # SWR data fetching hooks
│   │   ├── stores/       # Zustand state management
│   │   └── crypto.ts     # Encryption utilities
│   └── types/            # TypeScript type definitions
├── setup-pgboss-user.sh  # Database user setup script
└── CLAUDE.md             # Claude Code project guidance
```

## API Routes

- `GET /api/databases` - List available databases
- `GET /api/jobs?connectionString=...` - Fetch jobs with filters
- `GET /api/queues?connectionString=...` - Fetch queue statistics
- `GET /api/schedules?connectionString=...` - Fetch scheduled jobs
- `GET /api/stats?connectionString=...` - Fetch dashboard statistics
- `GET /api/metrics?connectionString=...` - Fetch performance metrics
- `GET /api/stream?connectionString=...` - Server-Sent Events stream

## Development

```bash
npm run dev      # Start development server (localhost:3001)
npm run build    # Production build
npm start        # Start production server
npm run lint     # Run ESLint
```

## Security Considerations

1. **Never commit `.env.local`** - Contains sensitive session secrets
2. **Use strong master passwords** - Required for credential encryption
3. **Restrict database access** - Use the `setup-pgboss-user.sh` script to create read-only users
4. **Enable SSL connections** - When connecting to remote databases
5. **Regenerate SESSION_SECRET** - Before deploying to production

## pg-boss Schema Support

This dashboard works with the default pg-boss schema structure:

- **Default schema name**: `pgboss`
- **Custom schemas**: Supported via connection string parameter `?schema=custom_schema`
- **Job states**: created, retry, active, completed, cancelled, failed, expired
- **Tables**: job, queue, schedule, archive, version

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

MIT

## Acknowledgments

- Built with [Next.js](https://nextjs.org/)
- UI components from [shadcn/ui](https://ui.shadcn.com/)
- Job queue system by [pg-boss](https://github.com/timgit/pg-boss)
