import { Router, Request, Response } from 'express';
import { prisma } from '../../database/client';
import { config } from '../../config';

export const dashboardRouter = Router();

function requireAuth(req: Request, res: Response, next: () => void) {
  if (req.isAuthenticated()) return next();
  req.session.returnTo = req.originalUrl;
  res.redirect('/auth/discord');
}

dashboardRouter.get('/', async (_req, res) => {
  try {
    const [guildCount, userCount] = await Promise.all([
      prisma.guild.count(),
      prisma.user.count(),
    ]);
    res.render('home', { config, guildCount, userCount, user: _req.user });
  } catch {
    res.render('home', { config, guildCount: 0, userCount: 0, user: null });
  }
});

dashboardRouter.get('/features', (_req, res) => {
  res.render('features', { config, user: _req.user });
});

dashboardRouter.get('/commands', (_req, res) => {
  res.render('commands', { config, user: _req.user });
});

dashboardRouter.get('/support', (_req, res) => {
  res.render('support', { config, user: _req.user });
});

dashboardRouter.get('/privacy', (_req, res) => {
  res.render('privacy', { config, user: _req.user });
});

dashboardRouter.get('/terms', (_req, res) => {
  res.render('terms', { config, user: _req.user });
});

dashboardRouter.get('/dashboard', requireAuth, async (req, res) => {
  const user = req.user as { id: string; username: string; avatar: string | null };
  try {
    const [wishlist, economy, notifications, premium] = await Promise.all([
      prisma.wishlist.findMany({ where: { userId: user.id } }),
      prisma.economy.findUnique({ where: { userId: user.id } }),
      prisma.notification.findMany({ where: { userId: user.id } }),
      prisma.premium.findUnique({ where: { userId: user.id } }),
    ]);

    res.render('dashboard', { config, user, wishlist, economy, notifications, premium });
  } catch {
    res.render('dashboard', { config, user, wishlist: [], economy: null, notifications: [], premium: null });
  }
});

dashboardRouter.get('/dashboard/guild/:guildId', requireAuth, async (req, res) => {
  const user = req.user as { id: string };
  const { guildId } = req.params;

  const client = req.app.locals.discordClient;
  const guild = client?.guilds.cache.get(guildId);

  if (!guild) {
    return res.redirect('/dashboard?error=guild_not_found');
  }

  const member = guild.members.cache.get(user.id);
  if (!member?.permissions.has('ManageGuild' as import('discord.js').PermissionResolvable)) {
    return res.redirect('/dashboard?error=no_permission');
  }

  try {
    const settings = await prisma.guildSettings.findUnique({ where: { guildId } });
    res.render('guild', { config, user, guild: { id: guild.id, name: guild.name, icon: guild.iconURL() }, settings });
  } catch {
    res.render('guild', { config, user, guild: { id: guildId, name: 'Unknown', icon: null }, settings: null });
  }
});
