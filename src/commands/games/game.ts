import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} from 'discord.js';
import { Command, BOT_COLOR } from '../../types';
import { rawgService } from '../../services/rawg.service';
import { createEmbed, errorEmbed } from '../../utils/embeds';

export const command: Command = {
  data: new SlashCommandBuilder()
    .setName('game')
    .setDescription('🎲 Get a random game recommendation')
    .addStringOption((opt) =>
      opt
        .setName('genre')
        .setDescription('Filter by genre')
        .addChoices(
          { name: 'Action', value: 'action' },
          { name: 'RPG', value: 'role-playing-games-rpg' },
          { name: 'Strategy', value: 'strategy' },
          { name: 'Shooter', value: 'shooter' },
          { name: 'Puzzle', value: 'puzzle' },
          { name: 'Adventure', value: 'adventure' },
          { name: 'Sports', value: 'sports' },
          { name: 'Racing', value: 'racing' },
          { name: 'Simulation', value: 'simulation' },
          { name: 'Horror', value: 'horror' }
        )
    )
    .addBooleanOption((opt) =>
      opt.setName('multiplayer').setDescription('Only show multiplayer games')
    )
    .addBooleanOption((opt) =>
      opt.setName('free_only').setDescription('Only show free-to-play games')
    )
    .addStringOption((opt) =>
      opt
        .setName('platform')
        .setDescription('Filter by platform')
        .addChoices(
          { name: 'PC', value: 'pc' },
          { name: 'PlayStation 5', value: 'ps5' },
          { name: 'PlayStation 4', value: 'ps4' },
          { name: 'Xbox', value: 'xbox' },
          { name: 'Nintendo Switch', value: 'switch' },
          { name: 'Android', value: 'android' },
          { name: 'iOS', value: 'ios' }
        )
    ),

  cooldown: 10,

  async execute(interaction: ChatInputCommandInteraction) {
    await interaction.deferReply();

    const genre = interaction.options.getString('genre') ?? undefined;
    const multiplayer = interaction.options.getBoolean('multiplayer') ?? false;
    const freeOnly = interaction.options.getBoolean('free_only') ?? false;
    const platform = interaction.options.getString('platform') ?? undefined;

    const game = await rawgService.getRandomGame({ genre, multiplayer, freeOnly, platform });

    if (!game) {
      await interaction.editReply({
        embeds: [errorEmbed('No games found matching your criteria. Try different filters!')],
      });
      return;
    }

    const genreList = game.genres?.map((g) => g.name).join(', ') || 'Unknown';
    const platformList = game.platforms?.slice(0, 3).map((p) => p.platform.name).join(', ') || 'Unknown';
    const description = game.description_raw?.slice(0, 300) + '...' || 'No description available.';

    const steamUrl = rawgService.getStoreUrl(game, 'steam');
    const epicUrl = rawgService.getStoreUrl(game, 'epic');

    const embed = createEmbed({
      title: `🎮 ${game.name}`,
      description,
      color: BOT_COLOR,
      image: game.background_image,
      fields: [
        { name: '⭐ Rating', value: `${game.rating}/5 (${game.metacritic ?? 'N/A'} Metacritic)`, inline: true },
        { name: '📅 Released', value: game.released ?? 'Unknown', inline: true },
        { name: '🎭 Genres', value: genreList, inline: true },
        { name: '🖥️ Platforms', value: platformList, inline: true },
      ],
      url: steamUrl ?? epicUrl ?? undefined,
      timestamp: true,
    });

    const buttons = [
      new ButtonBuilder()
        .setCustomId('reroll')
        .setLabel('🎲 Reroll')
        .setStyle(ButtonStyle.Primary),
    ];

    if (steamUrl) {
      buttons.push(
        new ButtonBuilder()
          .setLabel('Steam')
          .setStyle(ButtonStyle.Link)
          .setURL(steamUrl)
      );
    }

    if (epicUrl) {
      buttons.push(
        new ButtonBuilder()
          .setLabel('Epic Games')
          .setStyle(ButtonStyle.Link)
          .setURL(epicUrl)
      );
    }

    if (game.clip?.clip) {
      buttons.push(
        new ButtonBuilder()
          .setLabel('🎬 Trailer')
          .setStyle(ButtonStyle.Link)
          .setURL(game.clip.clip)
      );
    }

    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(...buttons.slice(0, 5));
    const reply = await interaction.editReply({ embeds: [embed], components: [row] });

    const collector = reply.createMessageComponentCollector({ time: 30000 });

    collector.on('collect', async (i) => {
      if (i.user.id !== interaction.user.id) {
        await i.reply({ content: 'Only the command user can reroll!', ephemeral: true });
        return;
      }

      if (i.customId === 'reroll') {
        await i.deferUpdate();
        const newGame = await rawgService.getRandomGame({ genre, multiplayer, freeOnly, platform });
        if (!newGame) {
          await i.editReply({ content: 'No more games found!', embeds: [], components: [] });
          return;
        }

        const newSteamUrl = rawgService.getStoreUrl(newGame, 'steam');
        const newEpicUrl = rawgService.getStoreUrl(newGame, 'epic');
        const newDesc = newGame.description_raw?.slice(0, 300) + '...' || 'No description available.';
        const newGenreList = newGame.genres?.map((g) => g.name).join(', ') || 'Unknown';
        const newPlatformList = newGame.platforms?.slice(0, 3).map((p) => p.platform.name).join(', ') || 'Unknown';

        const newEmbed = createEmbed({
          title: `🎮 ${newGame.name}`,
          description: newDesc,
          color: BOT_COLOR,
          image: newGame.background_image,
          fields: [
            { name: '⭐ Rating', value: `${newGame.rating}/5`, inline: true },
            { name: '📅 Released', value: newGame.released ?? 'Unknown', inline: true },
            { name: '🎭 Genres', value: newGenreList, inline: true },
            { name: '🖥️ Platforms', value: newPlatformList, inline: true },
          ],
          url: newSteamUrl ?? newEpicUrl ?? undefined,
          timestamp: true,
        });

        const newButtons = [
          new ButtonBuilder().setCustomId('reroll').setLabel('🎲 Reroll').setStyle(ButtonStyle.Primary),
        ];
        if (newSteamUrl) newButtons.push(new ButtonBuilder().setLabel('Steam').setStyle(ButtonStyle.Link).setURL(newSteamUrl));
        if (newEpicUrl) newButtons.push(new ButtonBuilder().setLabel('Epic Games').setStyle(ButtonStyle.Link).setURL(newEpicUrl));

        await i.editReply({
          embeds: [newEmbed],
          components: [new ActionRowBuilder<ButtonBuilder>().addComponents(...newButtons.slice(0, 5))],
        });
      }
    });
  },
};
