import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
} from 'discord.js';
import { Command } from '../../types';
import { steamService } from '../../services/steam.service';
import { createEmbed, errorEmbed, loadingEmbed } from '../../utils/embeds';
import { STEAM_COLOR } from '../../types';

export const command: Command = {
  data: new SlashCommandBuilder()
    .setName('freegames')
    .setDescription('🆓 Browse current free games on Steam'),

  cooldown: 10,

  async execute(interaction: ChatInputCommandInteraction) {
    await interaction.deferReply();

    const games = await steamService.getFreeGames();

    if (!games.length) {
      await interaction.editReply({
        embeds: [errorEmbed('No free games found right now. Check back later!')],
      });
      return;
    }

    let currentIndex = 0;

    const buildEmbed = (index: number): EmbedBuilder => {
      const game = games[index];
      return createEmbed({
        title: `🆓 ${game.name}`,
        description: game.short_description,
        color: STEAM_COLOR,
        image: game.header_image,
        fields: [
          {
            name: '💰 Original Price',
            value: game.price_overview?.initial_formatted || 'N/A',
            inline: true,
          },
          {
            name: '🏷️ Current Price',
            value: '**FREE**',
            inline: true,
          },
          {
            name: '📅 Release Date',
            value: game.release_date?.date || 'N/A',
            inline: true,
          },
          {
            name: '⏰ Offer Ends',
            value: game.endDate || 'Limited time',
            inline: true,
          },
        ],
        footer: `Game ${index + 1}/${games.length} • midou_Teck`,
        timestamp: true,
        url: game.steam_url,
      });
    };

    const buildButtons = (index: number): ActionRowBuilder<ButtonBuilder> => {
      return new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder()
          .setCustomId('prev')
          .setLabel('◀ Previous')
          .setStyle(ButtonStyle.Secondary)
          .setDisabled(index === 0),
        new ButtonBuilder()
          .setLabel('🎮 Claim on Steam')
          .setStyle(ButtonStyle.Link)
          .setURL(games[index].steam_url),
        new ButtonBuilder()
          .setCustomId('next')
          .setLabel('Next ▶')
          .setStyle(ButtonStyle.Secondary)
          .setDisabled(index === games.length - 1)
      );
    };

    const reply = await interaction.editReply({
      embeds: [buildEmbed(currentIndex)],
      components: [buildButtons(currentIndex)],
    });

    const collector = reply.createMessageComponentCollector({ time: 60000 });

    collector.on('collect', async (i) => {
      if (i.user.id !== interaction.user.id) {
        await i.reply({ content: 'These buttons are not for you!', ephemeral: true });
        return;
      }

      if (i.customId === 'prev' && currentIndex > 0) currentIndex--;
      if (i.customId === 'next' && currentIndex < games.length - 1) currentIndex++;

      await i.update({
        embeds: [buildEmbed(currentIndex)],
        components: [buildButtons(currentIndex)],
      });
    });

    collector.on('end', async () => {
      try {
        await interaction.editReply({ components: [] });
      } catch { /* message may have been deleted */ }
    });
  },
};
