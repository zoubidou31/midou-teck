import { prisma } from '../database/client';

export interface PremiumFeatures {
  fasterNotifications: boolean;
  unlimitedChannels: boolean;
  advancedFilters: boolean;
  customMessages: boolean;
  earlyAccess: boolean;
  maxWishlistItems: number;
  notificationDelay: number; // minutes
}

type PremiumTier = 'BASIC' | 'PRO' | 'ENTERPRISE';

const TIER_FEATURES: Record<PremiumTier, PremiumFeatures> = {
  BASIC: {
    fasterNotifications: false,
    unlimitedChannels: false,
    advancedFilters: false,
    customMessages: false,
    earlyAccess: false,
    maxWishlistItems: 10,
    notificationDelay: 30,
  },
  PRO: {
    fasterNotifications: true,
    unlimitedChannels: false,
    advancedFilters: true,
    customMessages: false,
    earlyAccess: false,
    maxWishlistItems: 50,
    notificationDelay: 5,
  },
  ENTERPRISE: {
    fasterNotifications: true,
    unlimitedChannels: true,
    advancedFilters: true,
    customMessages: true,
    earlyAccess: true,
    maxWishlistItems: 200,
    notificationDelay: 0,
  },
};

export class PremiumService {
  async getUserPremium(userId: string): Promise<PremiumFeatures> {
    const premium = await prisma.premium.findUnique({ where: { userId } });

    if (!premium || (premium.expiresAt && premium.expiresAt < new Date())) {
      return TIER_FEATURES['BASIC'];
    }

    return TIER_FEATURES[premium.tier as PremiumTier] ?? TIER_FEATURES['BASIC'];
  }

  async getGuildPremium(guildId: string): Promise<PremiumFeatures> {
    const premium = await prisma.premium.findUnique({ where: { guildId } });

    if (!premium || (premium.expiresAt && premium.expiresAt < new Date())) {
      return TIER_FEATURES['BASIC'];
    }

    return TIER_FEATURES[premium.tier as PremiumTier] ?? TIER_FEATURES['BASIC'];
  }

  async getUserTier(userId: string): Promise<string> {
    const premium = await prisma.premium.findUnique({ where: { userId } });

    if (!premium || (premium.expiresAt && premium.expiresAt < new Date())) {
      return 'BASIC';
    }

    return premium.tier;
  }

  async isPremium(userId: string): Promise<boolean> {
    const tier = await this.getUserTier(userId);
    return tier !== 'BASIC';
  }

  async grantPremium(
    target: { userId?: string; guildId?: string },
    tier: string,
    durationDays?: number
  ): Promise<void> {
    const expiresAt = durationDays
      ? new Date(Date.now() + durationDays * 86400000)
      : undefined;

    const data = { tier, expiresAt, updatedAt: new Date() };

    if (target.userId) {
      await prisma.premium.upsert({
        where: { userId: target.userId },
        update: data,
        create: { userId: target.userId, ...data },
      });
    } else if (target.guildId) {
      await prisma.premium.upsert({
        where: { guildId: target.guildId },
        update: data,
        create: { guildId: target.guildId, ...data },
      });
    }
  }

  getTierName(tier: string): string {
    const names: Record<string, string> = {
      BASIC: '🆓 Free',
      PRO: '⭐ Pro',
      ENTERPRISE: '💎 Enterprise',
    };
    return names[tier] ?? '🆓 Free';
  }

  getFeatureList(tier: string): string[] {
    const features = TIER_FEATURES[tier as PremiumTier] ?? TIER_FEATURES['BASIC'];
    const list: string[] = [
      `📋 Wishlist: up to **${features.maxWishlistItems}** games`,
      `🔔 Notifications: **${features.notificationDelay === 0 ? 'instant' : `${features.notificationDelay}min delay`}**`,
    ];

    if (features.fasterNotifications) list.push('⚡ Faster notifications');
    if (features.unlimitedChannels) list.push('♾️ Unlimited notification channels');
    if (features.advancedFilters) list.push('🔍 Advanced deal filters');
    if (features.customMessages) list.push('✏️ Custom notification messages');
    if (features.earlyAccess) list.push('🚀 Early access to new features');

    return list;
  }
}

export const premiumService = new PremiumService();
