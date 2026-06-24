import { Events, Guild } from 'discord.js';
import { prisma } from '../database/client';
import { logger } from '../utils/logger';

export const guildCreateHandler = {
  name: Events.GuildCreate,
  async execute(guild: Guild): Promise<void> {
    logger.info(`Joined guild: ${guild.name} (${guild.id})`);

    await prisma.guild.upsert({
      where: { id: guild.id },
      update: { name: guild.name, icon: guild.icon, memberCount: guild.memberCount },
      create: {
        id: guild.id,
        name: guild.name,
        icon: guild.icon,
        ownerId: guild.ownerId,
        memberCount: guild.memberCount,
      },
    });

    await prisma.guildSettings.upsert({
      where: { guildId: guild.id },
      update: {},
      create: { guildId: guild.id },
    });
  },
};

export const guildDeleteHandler = {
  name: Events.GuildDelete,
  async execute(guild: Guild): Promise<void> {
    logger.info(`Left guild: ${guild.name} (${guild.id})`);
    // We keep the data for potential re-join
  },
};

// Button interaction handler for giveaway entries
export const buttonInteractionHandler = {
  name: Events.InteractionCreate,
  async execute(interaction: import('discord.js').Interaction): Promise<void> {
    if (!interaction.isButton()) return;

    const { customId } = interaction;

    if (customId.startsWith('giveaway:enter:')) {
      const giveawayId = customId.replace('giveaway:enter:', '');

      const giveaway = await prisma.giveaway.findUnique({ where: { id: giveawayId } });

      if (!giveaway || giveaway.ended) {
        await interaction.reply({ content: 'This giveaway has ended!', ephemeral: true });
        return;
      }

      const participants: string[] = JSON.parse(giveaway.participants ?? '[]');

      if (participants.includes(interaction.user.id)) {
        const updated = participants.filter((p) => p !== interaction.user.id);
        await prisma.giveaway.update({ where: { id: giveawayId }, data: { participants: JSON.stringify(updated) } });
        await interaction.reply({ content: '❌ You have left the giveaway.', ephemeral: true });
      } else {
        participants.push(interaction.user.id);
        await prisma.giveaway.update({ where: { id: giveawayId }, data: { participants: JSON.stringify(participants) } });
        await interaction.reply({ content: '🎉 You have entered the giveaway! Good luck!', ephemeral: true });
      }
    }
  },
};
