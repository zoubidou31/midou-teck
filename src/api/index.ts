import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { steamService } from '../services/steam.service';
import { epicService } from '../services/epic.service';
import { prisma } from '../database/client';
import { ApiResponse } from '../types';

export const apiRouter = Router();

const apiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  message: { success: false, error: 'Too many requests' },
});

apiRouter.use(apiLimiter);

// GET /api/freegames
apiRouter.get('/freegames', async (_req, res) => {
  try {
    const [steam, epicData] = await Promise.all([
      steamService.getFreeGames(),
      epicService.getFreeGames(),
    ]);

    const response: ApiResponse<{ steam: typeof steam; epic: typeof epicData }> = {
      success: true,
      data: { steam, epic: epicData },
    };
    res.json(response);
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to fetch free games' });
  }
});

// GET /api/deals
apiRouter.get('/deals', async (req, res) => {
  try {
    const sortBy = (req.query.sort as 'DealRating' | 'Price' | 'Savings' | 'Recent') ?? 'DealRating';
    const deals = await steamService.getDeals({ sortBy, pageSize: 20 });
    res.json({ success: true, data: deals });
  } catch {
    res.status(500).json({ success: false, error: 'Failed to fetch deals' });
  }
});

// GET /api/games (alias)
apiRouter.get('/games', async (_req, res) => {
  try {
    const games = await steamService.getFreeGames();
    res.json({ success: true, data: games });
  } catch {
    res.status(500).json({ success: false, error: 'Failed to fetch games' });
  }
});

// GET /api/stats
apiRouter.get('/stats', async (_req, res) => {
  try {
    const [guildCount, userCount, wishlistCount, activeGiveaways] = await Promise.all([
      prisma.guild.count(),
      prisma.user.count(),
      prisma.wishlist.count(),
      prisma.giveaway.count({ where: { ended: false } }),
    ]);

    res.json({
      success: true,
      data: {
        guilds: guildCount,
        users: userCount,
        wishlists: wishlistCount,
        activeGiveaways,
        uptime: process.uptime(),
        memoryMB: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
      },
    });
  } catch {
    res.status(500).json({ success: false, error: 'Failed to fetch stats' });
  }
});

// GET /api/guilds (admin only - basic public info)
apiRouter.get('/guilds', async (_req, res) => {
  try {
    const guilds = await prisma.guild.findMany({
      select: { id: true, name: true, memberCount: true, joinedAt: true },
      orderBy: { memberCount: 'desc' },
      take: 50,
    });
    res.json({ success: true, data: guilds });
  } catch {
    res.status(500).json({ success: false, error: 'Failed to fetch guilds' });
  }
});

// GET /api/health
apiRouter.get('/health', (_req, res) => {
  res.json({ success: true, status: 'ok', timestamp: new Date().toISOString() });
});
