import axios from 'axios';
import { config } from '../config';
import { RawgGame } from '../types';
import { rawgCache } from '../utils/cache';
import { logger } from '../utils/logger';

export class RawgService {
  private readonly base = config.apis.rawgBase;
  private readonly key = config.apis.rawgKey;

  private get hasKey(): boolean {
    return !!this.key;
  }

  async getRandomGame(options: {
    genre?: string;
    multiplayer?: boolean;
    freeOnly?: boolean;
    platform?: string;
  } = {}): Promise<RawgGame | null> {
    if (!this.hasKey) {
      logger.warn('RAWG_API_KEY not set, returning mock data');
      return this.getMockGame();
    }

    const cacheKey = `rawg:random:${JSON.stringify(options)}`;
    const cached = rawgCache.get<RawgGame>(cacheKey);
    if (cached) return cached;

    try {
      const params: Record<string, string | number | boolean> = {
        key: this.key!,
        page_size: 20,
        ordering: '-rating',
        metacritic: '70,100',
      };

      if (options.genre) params.genres = options.genre.toLowerCase();
      if (options.platform) params.platforms = this.getPlatformId(options.platform);
      if (options.multiplayer) params.tags = 'multiplayer';
      if (options.freeOnly) params.tags = params.tags ? `${params.tags},free-to-play` : 'free-to-play';

      const response = await axios.get<{ results: RawgGame[] }>(`${this.base}/games`, {
        params,
        timeout: 10000,
      });

      const games = response.data.results;
      if (!games.length) return null;

      const game = games[Math.floor(Math.random() * Math.min(games.length, 10))];

      // Fetch game details for description
      const details = await this.getGameDetails(game.id.toString());
      const fullGame = details ?? game;

      rawgCache.set(cacheKey, fullGame, 300); // 5 min cache for variety
      return fullGame;
    } catch (error) {
      logger.error('Failed to fetch RAWG game:', error);
      return null;
    }
  }

  async getGameDetails(id: string): Promise<RawgGame | null> {
    if (!this.hasKey) return null;

    const cacheKey = `rawg:game:${id}`;
    const cached = rawgCache.get<RawgGame>(cacheKey);
    if (cached) return cached;

    try {
      const response = await axios.get<RawgGame>(`${this.base}/games/${id}`, {
        params: { key: this.key },
        timeout: 10000,
      });

      rawgCache.set(cacheKey, response.data);
      return response.data;
    } catch (error) {
      logger.error(`Failed to fetch RAWG game ${id}:`, error);
      return null;
    }
  }

  getStoreUrl(game: RawgGame, storeName: string): string | null {
    const store = game.stores?.find(
      (s) => s.store.slug.toLowerCase().includes(storeName.toLowerCase())
    );
    return store?.url ?? null;
  }

  private getPlatformId(platform: string): string {
    const platforms: Record<string, string> = {
      pc: '4',
      windows: '4',
      playstation: '187,18,16',
      ps5: '187',
      ps4: '18',
      xbox: '186,1,14',
      nintendo: '7',
      switch: '7',
      mac: '5',
      linux: '6',
      android: '21',
      ios: '3',
    };
    return platforms[platform.toLowerCase()] ?? '4';
  }

  private getMockGame(): RawgGame {
    return {
      id: 3498,
      name: 'Grand Theft Auto V',
      background_image: 'https://media.rawg.io/media/games/456/456dea5e1c7e3cd07060c14e96612001.jpg',
      rating: 4.47,
      rating_top: 5,
      released: '2013-09-17',
      genres: [{ id: 4, name: 'Action' }],
      platforms: [{ platform: { id: 4, name: 'PC (Windows)' } }],
      stores: [{ store: { id: 1, name: 'Steam', slug: 'steam' }, url: 'https://store.steampowered.com/app/271590' }],
      short_screenshots: [],
      description_raw: 'Grand Theft Auto V is an action-adventure game. Set within the fictional state of San Andreas.',
      metacritic: 97,
      tags: [{ id: 31, name: 'Singleplayer', slug: 'singleplayer' }],
    };
  }
}

export const rawgService = new RawgService();
