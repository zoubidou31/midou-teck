import { Client, TextChannel, EmbedBuilder } from 'discord.js';
import { prisma } from '../database/client';
import { EpicFreeGame, SteamFreeGame, EPIC_COLOR, STEAM_COLOR } from '../types';
import { epicService } from './epic.service';
import { createEmbed } from '../utils/embeds';
import { logger } from '../utils/logger';
import { config } from '../config';

export class NotificationService {
  private client: Client | null = null;

  setClient(client: Client): void {
    this.client = client;
  }

  async notifyEpicFreeGames(games: EpicFreeGame[]): Promise<void> {
    if (!this.client || !games.length) return;

    const embed = this.buildEpicEmbed(games);
    await this.broadcastToChannels('epicChannelId', embed);
    await this.dmEnabledUsers('FREE_EPIC', embed);
  }

  async notifySteamFreeGames(games: SteamFreeGame[]): Promise<void> {
    if (!this.client || !games.length) return;

    const embed = this.buildSteamEmbed(games);
    await this.broadcastToChannels('steamChannelId', embed);
    await this.dmEnabledUsers('FREE_STEAM', embed);
  }

  async notifyWishlistDeal(userId: string, gameName: string, dealUrl: string, discount: string): Promise<void> {
    if (!this.client) return;

    try {
      const user = await this.client.users.fetch(userId);
      const embed = createEmbed({
        title: '🔔 Wishlist Alert!',
        description: `**${gameName}** is now **${discount} off**!\n\n[🛒 Get the Deal](${dealUrl})`,
        color: config.bot.color,
        timestamp: true,
      });

      await user.send({ embeds: [embed] });
    } catch (error) {
      logger.debug(`Could not DM user ${userId}:`, error);
    }
  }

  private buildEpicEmbed(games: EpicFreeGame[]): EmbedBuilder {
    const fields = games.slice(0, 3).map((game) => {
      const offers = game.promotions?.promotionalOffers?.[0]?.promotionalOffers ?? [];
      const endDate = offers[0]?.endDate ? epicService.formatDate(offers[0].endDate) : 'Limited time';
      return {
        name: `🎮 ${game.title}`,
        value: `Until: **${endDate}**\n[Claim Now](${epicService.getGameUrl(game)})`,
        inline: true,
      };
    });

    return createEmbed({
      title: '🆓 Epic Games Free Games!',
      description: `**${games.length}** free game(s) available this week!`,
      color: EPIC_COLOR,
      fields,
      image: games[0] ? epicService.getGameImage(games[0]) : undefined,
      timestamp: true,
    });
  }

  private buildSteamEmbed(games: SteamFreeGame[]): EmbedBuilder {
    const fields = games.slice(0, 5).map((game) => ({
      name: `🎮 ${game.name}`,
      value: `~~${game.price_overview?.initial_formatted ?? 'N/A'}~~ → **FREE**\n[Claim](${game.steam_url})`,
      inline: true,
    }));

    return createEmbed({
      title: '🆓 Steam Free Games!',
      description: `**${games.length}** free game(s) available on Steam!`,
      color: STEAM_COLOR,
      fields,
      timestamp: true,
    });
  }

  private async broadcastToChannels(
    channelField: 'epicChannelId' | 'steamChannelId' | 'dealsChannelId',
    embed: EmbedBuilder
  ): Promise<void> {
    if (!this.client) return;

    try {
      const settings = await prisma.guildSettings.findMany({
        where: { [channelField]: { not: null }, notificationsEnabled: true },
        include: { guild: true },
      });

      for (const setting of settings) {
        const channelId = setting[channelField];
        if (!channelId) continue;

        try {
          const channel = await this.client.channels.fetch(channelId) as TextChannel;
          if (channel?.isTextBased()) {
            await channel.send({ embeds: [embed] });
          }
        } catch (err) {
          logger.debug(`Could not send to channel ${channelId}:`, err);
        }
      }
    } catch (error) {
      logger.error('Failed to broadcast to channels:', error);
    }
  }

  private async dmEnabledUsers(type: 'FREE_STEAM' | 'FREE_EPIC', embed: EmbedBuilder): Promise<void> {
    if (!this.client) return;

    try {
      const notifications = await prisma.notification.findMany({
        where: { type, enabled: true },
        include: { user: true },
      });

      for (const notification of notifications) {
        try {
          const discordUser = await this.client.users.fetch(notification.userId);
          await discordUser.send({ embeds: [embed] });
          await new Promise((r) => setTimeout(r, 500)); // Rate limit protection
        } catch {
          // User has DMs disabled, skip silently
        }
      }
    } catch (error) {
      logger.error('Failed to DM users:', error);
    }
  }
}

export const notificationService = new NotificationService();
