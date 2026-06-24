import {
  ChatInputCommandInteraction,
  SlashCommandBuilder,
  SlashCommandSubcommandsOnlyBuilder,
  SlashCommandOptionsOnlyBuilder,
  Collection,
  Client,
  ColorResolvable,
} from 'discord.js';

export interface Command {
  data: SlashCommandBuilder | SlashCommandSubcommandsOnlyBuilder | SlashCommandOptionsOnlyBuilder;
  cooldown?: number;
  premiumOnly?: boolean;
  guildOnly?: boolean;
  ownerOnly?: boolean;
  execute: (interaction: ChatInputCommandInteraction) => Promise<void>;
}

export interface ExtendedClient extends Client {
  commands: Collection<string, Command>;
  cooldowns: Collection<string, Collection<string, number>>;
}

export interface SteamFreeGame {
  appid: string;
  name: string;
  header_image: string;
  price_overview?: {
    final_formatted: string;
    initial_formatted: string;
    discount_percent: number;
  };
  short_description: string;
  steam_url: string;
  release_date?: { date: string };
  endDate?: string;
}

export interface EpicFreeGame {
  id: string;
  title: string;
  description: string;
  keyImages: Array<{ type: string; url: string }>;
  price: {
    totalPrice: {
      discountPrice: number;
      originalPrice: number;
    };
  };
  promotions?: {
    promotionalOffers?: Array<{
      promotionalOffers: Array<{
        startDate: string;
        endDate: string;
      }>;
    }>;
    upcomingPromotionalOffers?: Array<{
      promotionalOffers: Array<{
        startDate: string;
        endDate: string;
      }>;
    }>;
  };
  productSlug?: string;
  urlSlug?: string;
}

export interface SteamDeal {
  gameID: string;
  external: string;
  thumb: string;
  title: string;
  metacriticLink?: string;
  dealID: string;
  storeID: string;
  gameID2: string;
  salePrice: string;
  normalPrice: string;
  isOnSale: string;
  savings: string;
  metacriticScore: string;
  steamRatingText?: string;
  steamRatingPercent: string;
  steamRatingCount: string;
  steamAppID?: string;
  releaseDate: number;
  lastChange: number;
  dealRating: string;
  storeID2: string;
}

export interface RawgGame {
  id: number;
  name: string;
  background_image: string;
  rating: number;
  rating_top: number;
  released: string;
  genres: Array<{ id: number; name: string }>;
  platforms: Array<{ platform: { id: number; name: string } }>;
  stores: Array<{ store: { id: number; name: string; slug: string }; url: string }>;
  short_screenshots: Array<{ id: number; image: string }>;
  description_raw?: string;
  clip?: { clip: string } | null;
  metacritic?: number;
  tags: Array<{ id: number; name: string; slug: string }>;
}

export interface PaginationOptions {
  page?: number;
  pageSize?: number;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  pagination?: {
    page: number;
    pageSize: number;
    total?: number;
  };
}

export type EmbedColor = ColorResolvable;

export const BOT_COLOR: EmbedColor = '#00BFFF';
export const SUCCESS_COLOR: EmbedColor = '#00FF7F';
export const ERROR_COLOR: EmbedColor = '#FF4444';
export const WARNING_COLOR: EmbedColor = '#FFA500';
export const EPIC_COLOR: EmbedColor = '#313131';
export const STEAM_COLOR: EmbedColor = '#1B2838';
