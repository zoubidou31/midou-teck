import { CronJob } from 'cron';
import { Client } from 'discord.js';
import { steamService } from '../services/steam.service';
import { epicService } from '../services/epic.service';
import { notificationService } from '../services/notification.service';
import { steamCache, epicCache } from '../utils/cache';
import { logger } from '../utils/logger';

let previousSteamFreeIds = new Set<string>();
let previousEpicFreeIds = new Set<string>();

async function checkSteamFreeGames(): Promise<void> {
  try {
    logger.debug('Running Steam free games check...');
    steamCache.delete('steam:free_games');
    const games = await steamService.getFreeGames();

    const currentIds = new Set(games.map((g) => g.appid));
    const newGames = games.filter((g) => !previousSteamFreeIds.has(g.appid));

    if (newGames.length > 0 && previousSteamFreeIds.size > 0) {
      logger.info(`Found ${newGames.length} new Steam free game(s)!`);
      await notificationService.notifySteamFreeGames(newGames);
    }

    previousSteamFreeIds = currentIds;
  } catch (error) {
    logger.error('Steam free games job failed:', error);
  }
}

async function checkEpicFreeGames(): Promise<void> {
  try {
    logger.debug('Running Epic free games check...');
    epicCache.delete('epic:free_games');
    const { current } = await epicService.getFreeGames();

    const currentIds = new Set(current.map((g) => g.id));
    const newGames = current.filter((g) => !previousEpicFreeIds.has(g.id));

    if (newGames.length > 0 && previousEpicFreeIds.size > 0) {
      logger.info(`Found ${newGames.length} new Epic free game(s)!`);
      await notificationService.notifyEpicFreeGames(newGames);
    }

    previousEpicFreeIds = currentIds;
  } catch (error) {
    logger.error('Epic free games job failed:', error);
  }
}

async function checkWishlistDeals(): Promise<void> {
  try {
    logger.debug('Running wishlist deal check...');
    const { prisma } = await import('../database/client');

    const wishlists = await prisma.wishlist.findMany({
      include: { user: { include: { notifications: { where: { type: 'WISHLIST_DEAL', enabled: true } } } } },
    });

    const steamDeals = await steamService.getDeals({ minDiscount: 50, pageSize: 20 });
    const dealTitleSet = new Set(steamDeals.map((d) => d.title.toLowerCase()));

    for (const item of wishlists) {
      if (item.user.notifications.length === 0) continue;

      const matchingDeal = steamDeals.find(
        (d) => d.title.toLowerCase().includes(item.gameName.toLowerCase()) ||
               item.gameName.toLowerCase().includes(d.title.toLowerCase())
      );

      if (matchingDeal) {
        const discount = Math.round(parseFloat(matchingDeal.savings));
        const dealUrl = steamService.getDealUrl(matchingDeal.dealID);
        await notificationService.notifyWishlistDeal(
          item.userId,
          item.gameName,
          dealUrl,
          `${discount}%`
        );
      }
    }
  } catch (error) {
    logger.error('Wishlist deal check failed:', error);
  }
}

export function startJobs(client: Client): void {
  // Check Steam every 30 minutes
  new CronJob('*/30 * * * *', checkSteamFreeGames, null, true, 'UTC');

  // Check Epic every hour
  new CronJob('0 * * * *', checkEpicFreeGames, null, true, 'UTC');

  // Check wishlist deals every hour (offset by 15 min)
  new CronJob('15 * * * *', checkWishlistDeals, null, true, 'UTC');

  // Initial run after 30 seconds to populate caches
  setTimeout(async () => {
    await checkSteamFreeGames();
    await checkEpicFreeGames();
    logger.info('✅ Initial game checks complete');
  }, 30000);

  logger.info('✅ Cron jobs started');
}
