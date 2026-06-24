import axios from 'axios';
import { EpicFreeGame } from '../types';
import { epicCache } from '../utils/cache';
import { logger } from '../utils/logger';

interface EpicApiResponse {
  data: {
    Catalog: {
      searchStore: {
        elements: EpicFreeGame[];
      };
    };
  };
}

export class EpicService {
  private readonly baseUrl =
    'https://store-site-backend-static.ak.epicgames.com/freeGamesPromotions';

  async getFreeGames(): Promise<{ current: EpicFreeGame[]; upcoming: EpicFreeGame[] }> {
    const cacheKey = 'epic:free_games';
    const cached = epicCache.get<{ current: EpicFreeGame[]; upcoming: EpicFreeGame[] }>(cacheKey);
    if (cached) return cached;

    try {
      const response = await axios.get<EpicApiResponse>(this.baseUrl, {
        params: { locale: 'en-US', country: 'US', allowCountries: 'US' },
        timeout: 15000,
      });

      const games = response.data?.data?.Catalog?.searchStore?.elements ?? [];

      const current: EpicFreeGame[] = [];
      const upcoming: EpicFreeGame[] = [];

      for (const game of games) {
        if (!game.promotions) continue;

        const currentOffers = game.promotions.promotionalOffers?.[0]?.promotionalOffers ?? [];
        const upcomingOffers = game.promotions.upcomingPromotionalOffers?.[0]?.promotionalOffers ?? [];

        if (currentOffers.length > 0 && game.price?.totalPrice?.discountPrice === 0) {
          current.push(game);
        } else if (upcomingOffers.length > 0) {
          upcoming.push(game);
        }
      }

      const result = { current, upcoming };
      epicCache.set(cacheKey, result, 3600);
      return result;
    } catch (error) {
      logger.error('Failed to fetch Epic free games:', error);
      return { current: [], upcoming: [] };
    }
  }

  getGameImage(game: EpicFreeGame): string {
    const thumbnail = game.keyImages?.find(
      (img) =>
        img.type === 'Thumbnail' ||
        img.type === 'DieselStoreFrontWide' ||
        img.type === 'OfferImageWide'
    );
    return thumbnail?.url ?? 'https://cdn2.unrealengine.com/epic-games-logo-1200x630-1200x630-a0e1e7f3951a.png';
  }

  getGameUrl(game: EpicFreeGame): string {
    const slug = game.productSlug ?? game.urlSlug ?? game.id;
    return `https://store.epicgames.com/en-US/p/${slug}`;
  }

  formatDate(dateStr: string): string {
    return new Date(dateStr).toLocaleDateString('en-US', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  }
}

export const epicService = new EpicService();
