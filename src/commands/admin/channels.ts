import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  PermissionFlagsBits,
  ChannelType,
} from 'discord.js';
import { Command, BOT_COLOR } from '../../types';
import { prisma } from '../../database/client';
import { createEmbed, successEmbed, errorEmbed } from '../../utils/embeds';

async function ensureGuildSettings(guildId: string): Promise<void> {
  const guild = await prisma.guild.findUnique({ where: { id: guildId } });
  if (!guild) {
    await prisma.guild.create({
      data: { id: guildId, name: 'Unknown', ownerId: '0' },
    });
  }

  await prisma.guildSettings.upsert({
    where: { guildId },
    update: {},
    create: { guildId },
  });
}

export const setSteamChannel: Command = {
  data: new SlashCommandBuilder()
    .setName('set-steam-channel')
    .setDescription('📢 Set the channel for Steam free game notifications')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addChannelOption((opt) =>
      opt
        .setName('channel')
        .setDescription('The channel to send notifications to')
        .addChannelTypes(ChannelType.GuildText)
        .setRequired(true)
    ),

  guildOnly: true,

  async execute(interaction: ChatInputCommandInteraction) {
    await interaction.deferReply({ ephemeral: true });

    const channel = interaction.options.getChannel('channel', true);
    const guildId = interaction.guildId!;

    await ensureGuildSettings(guildId);
    await prisma.guildSettings.update({
      where: { guildId },
      data: { steamChannelId: channel.id },
    });

    await interaction.editReply({
      embeds: [successEmbed('Steam Channel Set', `Steam free game notifications will be sent to <#${channel.id}>`)],
    });
  },
};

export const setEpicChannel: Command = {
  data: new SlashCommandBuilder()
    .setName('set-epic-channel')
    .setDescription('📢 Set the channel for Epic Games notifications')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addChannelOption((opt) =>
      opt
        .setName('channel')
        .setDescription('The channel to send notifications to')
        .addChannelTypes(ChannelType.GuildText)
        .setRequired(true)
    ),

  guildOnly: true,

  async execute(interaction: ChatInputCommandInteraction) {
    await interaction.deferReply({ ephemeral: true });

    const channel = interaction.options.getChannel('channel', true);
    const guildId = interaction.guildId!;

    await ensureGuildSettings(guildId);
    await prisma.guildSettings.update({
      where: { guildId },
      data: { epicChannelId: channel.id },
    });

    await interaction.editReply({
      embeds: [successEmbed('Epic Channel Set', `Epic Games notifications will be sent to <#${channel.id}>`)],
    });
  },
};

export const setDealsChannel: Command = {
  data: new SlashCommandBuilder()
    .setName('set-deals-channel')
    .setDescription('📢 Set the channel for Steam deals notifications')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addChannelOption((opt) =>
      opt
        .setName('channel')
        .setDescription('The channel to send notifications to')
        .addChannelTypes(ChannelType.GuildText)
        .setRequired(true)
    ),

  guildOnly: true,

  async execute(interaction: ChatInputCommandInteraction) {
    await interaction.deferReply({ ephemeral: true });

    const channel = interaction.options.getChannel('channel', true);
    const guildId = interaction.guildId!;

    await ensureGuildSettings(guildId);
    await prisma.guildSettings.update({
      where: { guildId },
      data: { dealsChannelId: channel.id },
    });

    await interaction.editReply({
      embeds: [successEmbed('Deals Channel Set', `Steam deals notifications will be sent to <#${channel.id}>`)],
    });
  },
};
