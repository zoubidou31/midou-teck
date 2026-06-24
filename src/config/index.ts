import { z } from 'zod';
import dotenv from 'dotenv';

dotenv.config();

const envSchema = z.object({
  // Discord
  DISCORD_TOKEN: z.string().min(1, 'DISCORD_TOKEN is required'),
  DISCORD_CLIENT_ID: z.string().min(1, 'DISCORD_CLIENT_ID is required'),
  DISCORD_CLIENT_SECRET: z.string().optional(),
  DISCORD_GUILD_ID: z.string().optional(),

  // Database
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
  DATABASE_PROVIDER: z.enum(['sqlite', 'postgresql']).default('sqlite'),

  // Dashboard
  DASHBOARD_PORT: z.string().default('3000'),
  DASHBOARD_URL: z.string().default('http://localhost:3000'),
  SESSION_SECRET: z.string().default('change-this-secret-in-production'),
  COOKIE_SECURE: z.string().default('false'),

  // APIs
  STEAM_API_KEY: z.string().optional(),
  RAWG_API_KEY: z.string().optional(),

  // Bot
  BOT_PREFIX: z.string().default('/'),
  BOT_OWNER_ID: z.string().optional(),
  SUPPORT_SERVER_ID: z.string().optional(),
  SUPPORT_INVITE: z.string().default('https://discord.gg/support'),

  // Logging
  LOG_LEVEL: z.enum(['error', 'warn', 'info', 'debug']).default('info'),

  // Environment
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('❌ Invalid environment variables:');
  console.error(parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const env = parsed.data;

export const config = {
  bot: {
    token: env.DISCORD_TOKEN,
    clientId: env.DISCORD_CLIENT_ID,
    clientSecret: env.DISCORD_CLIENT_SECRET,
    guildId: env.DISCORD_GUILD_ID,
    prefix: env.BOT_PREFIX,
    ownerId: env.BOT_OWNER_ID,
    supportServerId: env.SUPPORT_SERVER_ID,
    supportInvite: env.SUPPORT_INVITE,
    color: 0x00bfff as number,
    name: 'midou_Teck',
    tagline: 'Never Miss a Free Game 🎮',
  },
  db: {
    url: env.DATABASE_URL,
    provider: env.DATABASE_PROVIDER,
  },
  dashboard: {
    port: parseInt(env.DASHBOARD_PORT, 10),
    url: env.DASHBOARD_URL,
    sessionSecret: env.SESSION_SECRET,
    cookieSecure: env.COOKIE_SECURE === 'true',
  },
  apis: {
    steamKey: env.STEAM_API_KEY,
    rawgKey: env.RAWG_API_KEY,
    cheapSharkBase: 'https://www.cheapshark.com/api/1.0',
    epicGamesBase: 'https://store-site-backend-static.ak.epicgames.com/freeGamesPromotions',
    steamFreeBase: 'https://store.steampowered.com/api',
    rawgBase: 'https://api.rawg.io/api',
  },
  logging: {
    level: env.LOG_LEVEL,
  },
  isDev: env.NODE_ENV === 'development',
  isProd: env.NODE_ENV === 'production',
  cooldowns: {
    default: 3,
    games: 10,
    economy: 5,
  },
} as const;
