import express from 'express';
import session from 'express-session';
import helmet from 'helmet';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import passport from 'passport';
import { Strategy as DiscordStrategy } from 'passport-discord';
import { Client } from 'discord.js';
import path from 'path';

import { config } from '../config';
import { logger } from '../utils/logger';
import { prisma } from '../database/client';
import { apiRouter } from '../api';
import { dashboardRouter } from './routes/dashboard';
import { authRouter } from './routes/auth';

declare module 'express-session' {
  interface SessionData {
    passport: { user: string };
    returnTo?: string;
  }
}

export function startDashboard(client: Client): void {
  if (!config.bot.clientSecret) {
    logger.warn('DISCORD_CLIENT_SECRET not set — dashboard OAuth will be disabled');
  }

  const app = express();

  // Security middleware
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'", "'unsafe-inline'", 'cdn.jsdelivr.net'],
          styleSrc: ["'self'", "'unsafe-inline'", 'cdn.jsdelivr.net', 'fonts.googleapis.com'],
          fontSrc: ["'self'", 'fonts.gstatic.com'],
          imgSrc: ["'self'", 'data:', 'cdn.discordapp.com', 'media.rawg.io', 'cdn.cloudflare.steamstatic.com', '*.epicgames.com'],
        },
      },
    })
  );

  app.use(cors({ origin: config.dashboard.url, credentials: true }));
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // Rate limiting
  const limiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    standardHeaders: true,
    legacyHeaders: false,
  });
  app.use(limiter);

  // Session
  app.use(
    session({
      secret: config.dashboard.sessionSecret,
      resave: false,
      saveUninitialized: false,
      cookie: {
        secure: config.dashboard.cookieSecure,
        httpOnly: true,
        maxAge: 7 * 24 * 60 * 60 * 1000,
      },
    })
  );

  // Passport
  passport.serializeUser((user: Express.User, done) => done(null, (user as { id: string }).id));
  passport.deserializeUser(async (id: string, done) => {
    try {
      const user = await prisma.user.findUnique({ where: { id } });
      done(null, user);
    } catch (err) {
      done(err, null);
    }
  });

  if (config.bot.clientSecret) {
    passport.use(
      new DiscordStrategy(
        {
          clientID: config.bot.clientId,
          clientSecret: config.bot.clientSecret,
          callbackURL: `${config.dashboard.url}/auth/discord/callback`,
          scope: ['identify', 'guilds'],
        },
        async (_accessToken, _refreshToken, profile, done) => {
          try {
            const user = await prisma.user.upsert({
              where: { id: profile.id },
              update: { username: profile.username, avatar: profile.avatar },
              create: { id: profile.id, username: profile.username, avatar: profile.avatar },
            });
            done(null, user);
          } catch (err) {
            done(err as Error, undefined);
          }
        }
      )
    );
  }

  app.use(passport.initialize());
  app.use(passport.session());

  // Static files
  app.use(express.static(path.join(__dirname, 'public')));
  app.set('view engine', 'ejs');
  app.set('views', path.join(__dirname, 'views'));

  // Make client available to routes
  app.locals.discordClient = client;

  // Routes
  app.use('/auth', authRouter);
  app.use('/api', apiRouter);
  app.use('/', dashboardRouter);

  // 404 handler
  app.use((_req, res) => {
    res.status(404).render('error', { code: 404, message: 'Page not found', config });
  });

  // Error handler
  app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    logger.error('Dashboard error:', err);
    res.status(500).render('error', { code: 500, message: 'Internal server error', config });
  });

  app.listen(config.dashboard.port, () => {
    logger.info(`🌐 Dashboard running at ${config.dashboard.url}`);
  });
}
