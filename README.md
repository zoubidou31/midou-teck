# 🎮 midou_Teck — Never Miss a Free Game

The ultimate Discord bot for free games, Steam deals, and Epic Games giveaways.

![Discord.js](https://img.shields.io/badge/discord.js-v14-5865F2?logo=discord)
![Node.js](https://img.shields.io/badge/node.js-22-339933?logo=node.js)
![TypeScript](https://img.shields.io/badge/TypeScript-5.3-3178C6?logo=typescript)
![License](https://img.shields.io/badge/license-MIT-green)

---

## ✨ Features

| Category | Commands |
|---|---|
| 🆓 Free Games | `/freegames`, `/epicfree` |
| 💰 Deals | `/steamdeals` |
| 🎲 Discovery | `/game` |
| 📋 Wishlist | `/wishlist add/remove/view` |
| 🔔 Notifications | `/notify enable/disable` |
| ⚙️ Server Setup | `/set-steam-channel`, `/set-epic-channel`, `/set-deals-channel` |
| 💰 Economy | `/balance`, `/work`, `/daily`, `/rank`, `/leaderboard`, `/profile` |
| 🎁 Giveaways | `/giveaway create/end/reroll` |
| 🛠️ Utility | `/ping`, `/help`, `/botinfo`, `/invite`, `/serverinfo`, `/userinfo` |

### Automatic Jobs

- **Steam** free games checked every **30 minutes**
- **Epic Games** giveaways checked every **hour**
- **Wishlist deals** checked every **hour**
- Automatic DM + channel notifications on new events

---

## 🚀 Quick Start

### Prerequisites

- Node.js 22+
- A Discord Application ([Discord Developer Portal](https://discord.com/developers/applications))

### 1. Clone & Install

```bash
git clone https://github.com/your-username/midou_teck.git
cd midou_teck
npm install
```

### 2. Configure Environment

```bash
cp .env.example .env
```

Edit `.env` with your values:

```env
DISCORD_TOKEN=your_token_here
DISCORD_CLIENT_ID=your_client_id_here
DATABASE_PROVIDER=sqlite
DATABASE_URL=file:./dev.db
SESSION_SECRET=any-random-string
```

### 3. Setup Database

```bash
npm run db:generate   # Generate Prisma Client
npm run db:push       # Create database tables
```

### 4. Register Slash Commands

```bash
npm run register-commands
```

> For instant registration during development, set `DISCORD_GUILD_ID` in `.env` to your test server ID.

### 5. Run the Bot

```bash
# Development (hot reload)
npm run dev

# Production
npm run build && npm start
```

---

## 🐳 Docker Deployment

### Production (PostgreSQL)

```bash
# Set required env vars
export DISCORD_TOKEN=your_token
export DISCORD_CLIENT_ID=your_client_id
export DISCORD_CLIENT_SECRET=your_secret
export POSTGRES_PASSWORD=strongpassword
export SESSION_SECRET=strongsecret
export DASHBOARD_URL=https://yourdomain.com

# Build and start
docker compose up -d
```

### Development (SQLite, hot reload)

```bash
docker compose --profile dev up bot_dev
```

---

## ☁️ Cloud Deployment

### Render

1. Fork this repository
2. Create a new **Web Service** on [render.com](https://render.com)
3. Connect your GitHub repository
4. Render will detect `render.yaml` automatically
5. Fill in the required environment variables in the Render dashboard
6. Deploy

### Railway

1. Fork this repository
2. Create a new project on [railway.app](https://railway.app)
3. Connect your GitHub repository — `railway.json` is auto-detected
4. Add a PostgreSQL plugin
5. Set environment variables
6. Deploy

### PM2 (VPS)

```bash
npm run build
npx prisma migrate deploy
pm2 start pm2.config.js
pm2 save
pm2 startup
```

---

## 📊 Web Dashboard

The dashboard runs on port `3000` by default.

- **`/`** — Landing page with stats
- **`/features`** — Feature overview
- **`/commands`** — Full command reference
- **`/dashboard`** — User management (requires Discord OAuth2 login)
- **`/api/health`** — Health check endpoint
- **`/api/stats`** — Bot statistics
- **`/api/freegames`** — Free games JSON API
- **`/api/deals`** — Deals JSON API

To enable OAuth2 login, set `DISCORD_CLIENT_SECRET` in your environment and add `{DASHBOARD_URL}/auth/discord/callback` to your Discord application's OAuth2 redirect URIs.

---

## 🗄️ Database

The bot uses **Prisma ORM** with:
- **SQLite** for development (zero setup)
- **PostgreSQL** for production

Switch by changing `DATABASE_PROVIDER` and `DATABASE_URL` in `.env`.

### Schema

| Table | Purpose |
|---|---|
| `guilds` | Server registry |
| `guild_settings` | Per-server channel config |
| `users` | User registry |
| `notifications` | User DM notification preferences |
| `wishlists` | User game wishlists |
| `premium` | Premium subscriptions |
| `economy` | XP, level, balance, streak |
| `inventory` | User item inventory |
| `giveaways` | Active and ended giveaways |
| `game_history` | User game interaction log |
| `cache_entries` | Persistent API cache |

---

## 🔑 Environment Variables

| Variable | Required | Description |
|---|---|---|
| `DISCORD_TOKEN` | ✅ | Bot token from Discord Developer Portal |
| `DISCORD_CLIENT_ID` | ✅ | Application client ID |
| `DISCORD_CLIENT_SECRET` | ⚠️ | Required for dashboard OAuth2 login |
| `DISCORD_GUILD_ID` | ❌ | Test guild ID for instant command registration |
| `DATABASE_PROVIDER` | ✅ | `sqlite` or `postgresql` |
| `DATABASE_URL` | ✅ | Database connection string |
| `SESSION_SECRET` | ✅ | Random secret for session cookies |
| `DASHBOARD_URL` | ✅ | Public URL of the dashboard |
| `DASHBOARD_PORT` | ❌ | Port to listen on (default: `3000`) |
| `COOKIE_SECURE` | ❌ | Set `true` in production with HTTPS |
| `STEAM_API_KEY` | ❌ | Steam Web API key (optional) |
| `RAWG_API_KEY` | ❌ | RAWG API key for `/game` command |
| `BOT_OWNER_ID` | ❌ | Your Discord user ID (owner-only commands) |
| `SUPPORT_INVITE` | ❌ | Discord invite link for your support server |
| `LOG_LEVEL` | ❌ | `error` / `warn` / `info` / `debug` |
| `NODE_ENV` | ❌ | `development` or `production` |

---

## 🔌 External APIs

| API | Used For | Key Required |
|---|---|---|
| [CheapShark API](https://apidocs.cheapshark.com) | Steam free games & deals | No |
| [Epic Games Store API](https://store-site-backend-static.ak.epicgames.com) | Epic giveaways | No |
| [Steam Web API](https://steamcommunity.com/dev) | Game details | Optional |
| [RAWG API](https://rawg.io/apidocs) | `/game` recommendations | Yes (free) |

---

## 🏗️ Project Structure

```
src/
├── commands/
│   ├── admin/         # set-steam-channel, etc.
│   ├── economy/       # balance, work, daily, rank
│   ├── games/         # freegames, epicfree, steamdeals, game, wishlist, notify
│   ├── giveaway/      # giveaway create/end/reroll
│   └── utility/       # ping, help, botinfo, invite, serverinfo, userinfo
├── events/
│   ├── ready.ts       # Bot startup, cron jobs
│   ├── commandHandler.ts  # Slash command routing + cooldowns
│   └── guildEvents.ts     # Guild join/leave, button interactions
├── services/
│   ├── steam.service.ts   # CheapShark + Steam API
│   ├── epic.service.ts    # Epic Games API
│   ├── rawg.service.ts    # RAWG game database
│   ├── economy.service.ts # XP, levels, currency
│   ├── premium.service.ts # Feature flags & tiers
│   └── notification.service.ts  # DM & channel broadcasts
├── jobs/
│   └── index.ts       # Cron job scheduler
├── database/
│   └── client.ts      # Prisma singleton
├── dashboard/
│   ├── index.ts       # Express app setup
│   ├── routes/        # Web & auth routes
│   ├── views/         # EJS templates
│   └── public/        # Static assets (CSS)
├── api/
│   └── index.ts       # REST API routes
├── utils/
│   ├── logger.ts      # Winston logger
│   ├── cache.ts       # In-memory cache
│   └── embeds.ts      # Discord embed builders
├── config/
│   └── index.ts       # Zod-validated config
├── types/
│   └── index.ts       # TypeScript interfaces
└── index.ts           # Bot entry point
```

---

## 🛡️ Security

- **Rate limiting** on all API endpoints (express-rate-limit)
- **Command cooldowns** per-user per-command
- **Input validation** with Zod
- **Helmet** for HTTP security headers
- **Secure session cookies** (httpOnly, secure in production)
- **Permission checks** for admin commands
- **Environment validation** at startup — bot refuses to start with missing required config
- **Non-root Docker user** for container security

---

## 📄 License

MIT — see [LICENSE](LICENSE)

---

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/my-feature`)
3. Commit your changes
4. Push to the branch
5. Open a Pull Request
