import { SlashCommandBuilder, ChatInputCommandInteraction } from 'discord.js';
import { Command, BOT_COLOR } from '../../types';
import { prisma } from '../../database/client';
import { createEmbed, successEmbed, errorEmbed } from '../../utils/embeds';

export const command: Command = {
  data: new SlashCommandBuilder()
    .setName('notify')
    .setDescription('🔔 Manage your game notification preferences')
    .addSubcommand((sub) =>
      sub
        .setName('enable')
        .setDescription('Enable notifications')
        .addStringOption((opt) =>
          opt
            .setName('type')
            .setDescription('What to be notified about')
            .setRequired(true)
            .addChoices(
              { name: '🆓 Free Steam Games', value: 'FREE_STEAM' },
              { name: '🎮 Free Epic Games', value: 'FREE_EPIC' },
              { name: '💰 Wishlist Deals', value: 'WISHLIST_DEAL' },
              { name: '🎁 Giveaways', value: 'GIVEAWAY' },
              { name: '✅ All', value: 'ALL' }
            )
        )
    )
    .addSubcommand((sub) =>
      sub
        .setName('disable')
        .setDescription('Disable notifications')
        .addStringOption((opt) =>
          opt
            .setName('type')
            .setDescription('Which notification to disable')
            .setRequired(true)
            .addChoices(
              { name: '🆓 Free Steam Games', value: 'FREE_STEAM' },
              { name: '🎮 Free Epic Games', value: 'FREE_EPIC' },
              { name: '💰 Wishlist Deals', value: 'WISHLIST_DEAL' },
              { name: '🎁 Giveaways', value: 'GIVEAWAY' },
              { name: '🚫 All', value: 'ALL' }
            )
        )
    )
    .addSubcommand((sub) =>
      sub.setName('status').setDescription('View your notification settings')
    ),

  cooldown: 3,

  async execute(interaction: ChatInputCommandInteraction) {
    await interaction.deferReply({ ephemeral: true });

    const sub = interaction.options.getSubcommand();
    const userId = interaction.user.id;

    await prisma.user.upsert({
      where: { id: userId },
      update: { username: interaction.user.username },
      create: { id: userId, username: interaction.user.username },
    });

    const ALL_TYPES = ['FREE_STEAM', 'FREE_EPIC', 'WISHLIST_DEAL', 'GIVEAWAY'];

    if (sub === 'enable' || sub === 'disable') {
      const typeValue = interaction.options.getString('type', true);
      const enabled = sub === 'enable';
      const types = typeValue === 'ALL' ? ALL_TYPES : [typeValue];

      for (const type of types) {
        await prisma.notification.upsert({
          where: { userId_type: { userId, type } },
          update: { enabled },
          create: { userId, type, enabled },
        });
      }

      const action = enabled ? 'enabled' : 'disabled';
      const icon = enabled ? '✅' : '🚫';
      await interaction.editReply({
        embeds: [
          successEmbed(
            `Notifications ${action}`,
            `${icon} You have **${action}** ${typeValue === 'ALL' ? 'all notifications' : `**${typeValue}** notifications`}.\n\n` +
            (enabled ? '📬 You\'ll receive DMs when events occur.' : '📭 No more DMs for this type.')
          ),
        ],
      });
    } else {
      const notifications = await prisma.notification.findMany({ where: { userId } });

      const statusMap = new Map(notifications.map((n) => [n.type, n.enabled]));

      const fields = [
        { name: '🆓 Free Steam Games', value: statusMap.get('FREE_STEAM') ? '✅ Enabled' : '❌ Disabled', inline: true },
        { name: '🎮 Free Epic Games', value: statusMap.get('FREE_EPIC') ? '✅ Enabled' : '❌ Disabled', inline: true },
        { name: '💰 Wishlist Deals', value: statusMap.get('WISHLIST_DEAL') ? '✅ Enabled' : '❌ Disabled', inline: true },
        { name: '🎁 Giveaways', value: statusMap.get('GIVEAWAY') ? '✅ Enabled' : '❌ Disabled', inline: true },
      ];

      await interaction.editReply({
        embeds: [
          createEmbed({
            title: '🔔 Your Notification Settings',
            description: 'Use `/notify enable` or `/notify disable` to change settings.\nNotifications are sent via **Direct Message**.',
            color: BOT_COLOR,
            fields,
            timestamp: true,
          }),
        ],
      });
    }
  },
};
