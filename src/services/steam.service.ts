import axios from 'axios';
import { config } from '../config';
import { SteamFreeGame, SteamDeal } from '../types';
import { steamCache, dealsCache } from '../utils/cache';
import { logger } from '../utils/logger';

export class SteamService {
  private readonly cheapSharkBase = config.apis.cheapSharkBase;
  private readonly steamBase = config.apis.steamFreeBase;

  async getFreeGames(): Promise<SteamFreeGame[]> {
    const cacheKey = 'steam:free_games';
    const cached = steamCache.get<SteamFreeGame[]>(cacheKey);
    if (cached) return cached;

    try {
      // CheapShark free games (price = 0)
      const response = await axios.get(`${this.cheapSharkBase}/deals`, {
        params: {
          storeID: '1', // Steam
          upperPrice: 0,
          pageSize: 20,
          sortBy: 'Recent',
          onSale: 1,
        },
        timeout: 10000,
      });

      const deals: SteamDeal[] = response.data;
      const games: SteamFreeGame[] = deals.map((deal) => ({
        appid: deal.steamAppID ?? deal.gameID,
        name: deal.title,
        header_image: deal.thumb,
        price_overview: {
          final_formatted: 'FREE',
          initial_formatted: `$${deal.normalPrice}`,
          discount_percent: 100,
        },
        short_description: `Originally $${deal.normalPrice} — Now FREE on Steam`,
        steam_url: deal.steamAppID
          ? `https://store.steampowered.com/app/${deal.steamAppID}`
          : `https://www.cheapshark.com/redirect?dealID=${deal.dealID}`,
        release_date: { date: new Date(deal.releaseDate * 1000).toLocaleDateString() },
      }));

      steamCache.set(cacheKey, games);
      return games;
    } catch (error) {
      logger.error('Failed to fetch Steam free games:', error);
      return [];
    }
  }

  async getDeals(options: {
    sortBy?: 'DealRating' | 'Price' | 'Savings' | 'Recent';
    upperPrice?: number;
    lowerPrice?: number;
    minDiscount?: number;
    genre?: string;
    pageSize?: number;
    pageNumber?: number;
  } = {}): Promise<SteamDeal[]> {
    const cacheKey = `steam:deals:${JSON.stringify(options)}`;
    const cached = dealsCache.get<SteamDeal[]>(cacheKey);
    if (cached) return cached;

    try {
      const response = await axios.get(`${this.cheapSharkBase}/deals`, {
        params: {
          storeID: '1',
          sortBy: options.sortBy ?? 'DealRating',
          upperPrice: options.upperPrice,
          lowerPrice: options.lowerPrice,
          lowerDiscount: options.minDiscount ?? 20,
          pageSize: options.pageSize ?? 10,
          pageNumber: options.pageNumber ?? 0,
          onSale: 1,
        },
        timeout: 10000,
      });

      const deals: SteamDeal[] = response.data;
      dealsCache.set(cacheKey, deals);
      return deals;
    } catch (error) {
      logger.error('Failed to fetch Steam deals:', error);
      return [];
    }
  }

  async getTopDeals(): Promise<SteamDeal[]> {
    return this.getDeals({ sortBy: 'DealRating', pageSize: 10 });
  }

  async getLatestDeals(): Promise<SteamDeal[]> {
    return this.getDeals({ sortBy: 'Recent', pageSize: 10 });
  }

  async getDealsByDiscount(): Promise<SteamDeal[]> {
    return this.getDeals({ sortBy: 'Savings', pageSize: 10 });
  }

  async getDealsByPrice(maxPrice: number): Promise<SteamDeal[]> {
    return this.getDeals({ sortBy: 'Price', upperPrice: maxPrice, pageSize: 10 });
  }

  async getAppDetails(appId: string): Promise<Record<string, unknown> | null> {
    const cacheKey = `steam:app:${appId}`;
    const cached = steamCache.get<Record<string, unknown>>(cacheKey);
    if (cached) return cached;

    try {
      const response = await axios.get(`${this.steamBase}/appdetails`, {
        params: { appids: appId, cc: 'us', l: 'en' },
        timeout: 10000,
      });

      const data = response.data[appId];
      if (data?.success) {
        steamCache.set(cacheKey, data.data, 3600);
        return data.data as Record<string, unknown>;
      }
      return null;
    } catch (error) {
      logger.error(`Failed to fetch Steam app ${appId}:`, error);
      return null;
    }
  }

  getSteamStoreUrl(appId: string): string {
    return `https://store.steampowered.com/app/${appId}`;
  }

  getDealUrl(dealId: string): string {
    return `https://www.cheapshark.com/redirect?dealID=${dealId}`;
  }
}

export const steamService = new SteamService();
