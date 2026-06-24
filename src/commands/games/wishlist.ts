import { SlashCommandBuilder, ChatInputCommandInteraction } from 'discord.js';
import { Command, BOT_COLOR } from '../../types';
import { prisma } from '../../database/client';
import { premiumService } from '../../services/premium.service';
import { createEmbed, errorEmbed, successEmbed } from '../../utils/embeds';

export const command: Command = {
  data: new SlashCommandBuilder()
    .setName('wishlist')
    .setDescription('📋 Manage your game wishlist')
    .addSubcommand((sub) =>
      sub
        .setName('add')
        .setDescription('Add a game to your wishlist')
        .addStringOption((opt) =>
          opt.setName('name').setDescription('Game name').setRequired(true)
        )
        .addStringOption((opt) =>
          opt
            .setName('store')
            .setDescription('Which store?')
            .addChoices(
              { name: 'Steam', value: 'STEAM' },
              { name: 'Epic Games', value: 'EPIC' }
            )
        )
        .addStringOption((opt) =>
          opt.setName('game_id').setDescription('Game ID (optional, for accurate tracking)')
        )
    )
    .addSubcommand((sub) =>
      sub
        .setName('remove')
        .setDescription('Remove a game from your wishlist')
        .addStringOption((opt) =>
          opt.setName('name').setDescription('Game name to remove').setRequired(true)
        )
    )
    .addSubcommand((sub) =>
      sub.setName('view').setDescription('View your wishlist')
    ),

  cooldown: 3,

  async execute(interaction: ChatInputCommandInteraction) {
    await interaction.deferReply({ ephemeral: true });

    const sub = interaction.options.getSubcommand();
    const userId = interaction.user.id;

    // Upsert user
    await prisma.user.upsert({
      where: { id: userId },
      update: { username: interaction.user.username },
      create: { id: userId, username: interaction.user.username },
    });

    if (sub === 'add') {
      const gameName = interaction.options.getString('name', true);
      const store = interaction.options.getString('store') ?? 'STEAM';
      const gameId = interaction.options.getString('game_id') ?? `custom_${Date.now()}`;

      const features = await premiumService.getUserPremium(userId);
      const count = await prisma.wishlist.count({ where: { userId } });

      if (count >= features.maxWishlistItems) {
        await interaction.editReply({
          embeds: [
            errorEmbed(
              `You've reached your wishlist limit (**${features.maxWishlistItems}** games).\n` +
              `Upgrade to Premium for a higher limit!`
            ),
          ],
        });
        return;
      }

      const existing = await prisma.wishlist.findFirst({
        where: { userId, gameName: { contains: gameName } },
      });

      if (existing) {
        await interaction.editReply({
          embeds: [errorEmbed(`**${gameName}** is already in your wishlist!`)],
        });
        return;
      }

      await prisma.wishlist.create({
        data: { userId, gameId, gameName, storeType: store },
      });

      await interaction.editReply({
        embeds: [successEmbed('Added to Wishlist', `**${gameName}** (${store}) has been added to your wishlist!\nYou'll be notified when it goes on sale.`)],
      });
    } else if (sub === 'remove') {
      const gameName = interaction.options.getString('name', true);

      const item = await prisma.wishlist.findFirst({
        where: { userId, gameName: { contains: gameName } },
      });

      if (!item) {
        await interaction.editReply({
          embeds: [errorEmbed(`**${gameName}** was not found in your wishlist.`)],
        });
        return;
      }

      await prisma.wishlist.delete({ where: { id: item.id } });
      await interaction.editReply({
        embeds: [successEmbed('Removed', `**${item.gameName}** removed from wishlist.`)],
      });
    } else if (sub === 'view') {
      const items = await prisma.wishlist.findMany({
        where: { userId },
        orderBy: { addedAt: 'desc' },
      });

      if (!items.length) {
        await interaction.editReply({
          embeds: [
            createEmbed({
              title: '📋 Your Wishlist',
              description: 'Your wishlist is empty! Add games with `/wishlist add`',
              color: BOT_COLOR,
            }),
          ],
        });
        return;
      }

      const features = await premiumService.getUserPremium(userId);
      const fields = items.slice(0, 25).map((item, i) => ({
        name: `${i + 1}. ${item.gameName}`,
        value: `Store: **${item.storeType}** | Added: ${new Date(item.addedAt).toLocaleDateString()}`,
        inline: false,
      }));

      await interaction.editReply({
        embeds: [
          createEmbed({
            title: '📋 Your Wishlist',
            description: `**${items.length}/${features.maxWishlistItems}** games`,
            color: BOT_COLOR,
            fields,
            timestamp: true,
          }),
        ],
      });
    }
  },
};
