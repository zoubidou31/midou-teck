import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} from 'discord.js';
import { Command, EPIC_COLOR } from '../../types';
import { epicService } from '../../services/epic.service';
import { createEmbed, errorEmbed } from '../../utils/embeds';

export const command: Command = {
  data: new SlashCommandBuilder()
    .setName('epicfree')
    .setDescription('🎮 View current and upcoming free Epic Games giveaways'),

  cooldown: 10,

  async execute(interaction: ChatInputCommandInteraction) {
    await interaction.deferReply();

    const { current, upcoming } = await epicService.getFreeGames();

    if (!current.length && !upcoming.length) {
      await interaction.editReply({
        embeds: [errorEmbed('No Epic Games giveaways found right now.')],
      });
      return;
    }

    const embeds = [];

    if (current.length) {
      for (const game of current.slice(0, 3)) {
        const offers = game.promotions?.promotionalOffers?.[0]?.promotionalOffers ?? [];
        const startDate = offers[0]?.startDate ? epicService.formatDate(offers[0].startDate) : 'Now';
        const endDate = offers[0]?.endDate ? epicService.formatDate(offers[0].endDate) : 'Limited time';
        const originalPrice = game.price?.totalPrice?.originalPrice
          ? `$${(game.price.totalPrice.originalPrice / 100).toFixed(2)}`
          : 'N/A';

        embeds.push(
          createEmbed({
            title: `🆓 ${game.title}`,
            description: game.description?.slice(0, 200) + '...' || 'Claim this game for free!',
            color: EPIC_COLOR,
            image: epicService.getGameImage(game),
            fields: [
              { name: '💰 Original Price', value: originalPrice, inline: true },
              { name: '🏷️ Current Price', value: '**FREE**', inline: true },
              { name: '📅 Available', value: `${startDate} → ${endDate}`, inline: false },
            ],
            url: epicService.getGameUrl(game),
            timestamp: true,
          })
        );
      }
    }

    if (upcoming.length) {
      const upcomingFields = upcoming.slice(0, 5).map((game) => {
        const offers = game.promotions?.upcomingPromotionalOffers?.[0]?.promotionalOffers ?? [];
        const startDate = offers[0]?.startDate ? epicService.formatDate(offers[0].startDate) : 'Coming soon';
        return {
          name: `🔜 ${game.title}`,
          value: `Free from: **${startDate}**`,
          inline: true,
        };
      });

      embeds.push(
        createEmbed({
          title: '📅 Upcoming Epic Games Giveaways',
          description: `**${upcoming.length}** game(s) coming soon!`,
          color: '#313131',
          fields: upcomingFields,
          timestamp: true,
        })
      );
    }

    const claimButtons = current.slice(0, 3).map((game) =>
      new ButtonBuilder()
        .setLabel(`Claim ${game.title.slice(0, 20)}`)
        .setStyle(ButtonStyle.Link)
        .setURL(epicService.getGameUrl(game))
    );

    const components = claimButtons.length
      ? [new ActionRowBuilder<ButtonBuilder>().addComponents(...claimButtons.slice(0, 5))]
      : [];

    await interaction.editReply({ embeds: embeds.slice(0, 10), components });
  },
};
