import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  PermissionFlagsBits,
  TextChannel,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
} from 'discord.js';
import { Command, BOT_COLOR } from '../../types';
import { prisma } from '../../database/client';
import { createEmbed, errorEmbed, successEmbed } from '../../utils/embeds';

function pickWinners(participants: string[], count: number): string[] {
  const shuffled = [...participants].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}

function buildGiveawayEmbed(prize: string, hostId: string, endsAt: Date, winnersCount: number, participantsCount: number): EmbedBuilder {
  return createEmbed({
    title: '🎁 GIVEAWAY!',
    description: `**Prize:** ${prize}\n**Winners:** ${winnersCount}\n**Hosted by:** <@${hostId}>`,
    color: BOT_COLOR,
    fields: [
      { name: '⏰ Ends', value: `<t:${Math.floor(endsAt.getTime() / 1000)}:R>`, inline: true },
      { name: '👥 Entries', value: `**${participantsCount}**`, inline: true },
    ],
    footer: 'Click 🎉 to enter!',
    timestamp: true,
  });
}

export const giveawayCommand: Command = {
  data: new SlashCommandBuilder()
    .setName('giveaway')
    .setDescription('🎁 Manage giveaways')
    .addSubcommand((sub) =>
      sub
        .setName('create')
        .setDescription('Create a new giveaway')
        .addStringOption((opt) => opt.setName('prize').setDescription('What to give away').setRequired(true))
        .addIntegerOption((opt) => opt.setName('duration').setDescription('Duration in minutes').setRequired(true).setMinValue(1).setMaxValue(10080))
        .addIntegerOption((opt) => opt.setName('winners').setDescription('Number of winners').setMinValue(1).setMaxValue(10))
        .addChannelOption((opt) => opt.setName('channel').setDescription('Channel to host the giveaway'))
    )
    .addSubcommand((sub) =>
      sub
        .setName('end')
        .setDescription('End a giveaway early')
        .addStringOption((opt) => opt.setName('id').setDescription('Giveaway ID').setRequired(true))
    )
    .addSubcommand((sub) =>
      sub
        .setName('reroll')
        .setDescription('Reroll winners for a giveaway')
        .addStringOption((opt) => opt.setName('id').setDescription('Giveaway ID').setRequired(true))
    ),

  guildOnly: true,

  async execute(interaction: ChatInputCommandInteraction) {
    const sub = interaction.options.getSubcommand();

    if (sub === 'create') {
      if (!interaction.memberPermissions?.has(PermissionFlagsBits.ManageGuild)) {
        await interaction.reply({ embeds: [errorEmbed('You need Manage Server permission.')], ephemeral: true });
        return;
      }

      await interaction.deferReply({ ephemeral: true });

      const prize = interaction.options.getString('prize', true);
      const duration = interaction.options.getInteger('duration', true);
      const winnersCount = interaction.options.getInteger('winners') ?? 1;
      const channelOpt = interaction.options.getChannel('channel');
      const targetChannel = (channelOpt ?? interaction.channel) as TextChannel;
      const endsAt = new Date(Date.now() + duration * 60 * 1000);

      const giveaway = await prisma.giveaway.create({
        data: {
          guildId: interaction.guildId!,
          channelId: targetChannel.id,
          hostId: interaction.user.id,
          prize,
          winnersCount,
          endsAt,
          participants: '[]',
        },
      });

      const embed = buildGiveawayEmbed(prize, interaction.user.id, endsAt, winnersCount, 0);
      const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder()
          .setCustomId(`giveaway:enter:${giveaway.id}`)
          .setLabel('🎉 Enter')
          .setStyle(ButtonStyle.Success)
      );

      const msg = await targetChannel.send({ embeds: [embed], components: [row] });

      await prisma.giveaway.update({ where: { id: giveaway.id }, data: { messageId: msg.id } });

      // Schedule end
      setTimeout(async () => {
        await endGiveaway(giveaway.id, interaction.client, targetChannel);
      }, duration * 60 * 1000);

      await interaction.editReply({
        embeds: [successEmbed('Giveaway Created!', `Giveaway started in <#${targetChannel.id}>!\nID: \`${giveaway.id}\``)],
      });
    } else if (sub === 'end') {
      if (!interaction.memberPermissions?.has(PermissionFlagsBits.ManageGuild)) {
        await interaction.reply({ embeds: [errorEmbed('You need Manage Server permission.')], ephemeral: true });
        return;
      }

      await interaction.deferReply({ ephemeral: true });
      const id = interaction.options.getString('id', true);
      const channel = interaction.channel as TextChannel;
      await endGiveaway(id, interaction.client, channel);
      await interaction.editReply({ embeds: [successEmbed('Giveaway Ended', `Giveaway \`${id}\` has been ended.`)] });
    } else if (sub === 'reroll') {
      if (!interaction.memberPermissions?.has(PermissionFlagsBits.ManageGuild)) {
        await interaction.reply({ embeds: [errorEmbed('You need Manage Server permission.')], ephemeral: true });
        return;
      }

      await interaction.deferReply({ ephemeral: true });
      const id = interaction.options.getString('id', true);
      const giveaway = await prisma.giveaway.findUnique({ where: { id } });

      if (!giveaway || !giveaway.ended) {
        await interaction.editReply({ embeds: [errorEmbed('Giveaway not found or not ended.')] });
        return;
      }

      const participants: string[] = JSON.parse(giveaway.participants ?? '[]');
      if (!participants.length) {
        await interaction.editReply({ embeds: [errorEmbed('No participants to pick from!')] });
        return;
      }

      const winners = pickWinners(participants, giveaway.winnersCount);
      await prisma.giveaway.update({ where: { id }, data: { winners: JSON.stringify(winners) } });

      const winnerMentions = winners.map((w) => `<@${w}>`).join(', ');
      const channel = interaction.channel as TextChannel;
      await channel.send({
        embeds: [
          createEmbed({
            title: '🎊 Giveaway Rerolled!',
            description: `New winner(s) for **${giveaway.prize}**: ${winnerMentions}`,
            color: BOT_COLOR,
            timestamp: true,
          }),
        ],
      });

      await interaction.editReply({ embeds: [successEmbed('Rerolled!', `New winners: ${winnerMentions}`)] });
    }
  },
};

async function endGiveaway(giveawayId: string, client: import('discord.js').Client, fallbackChannel: TextChannel): Promise<void> {
  const giveaway = await prisma.giveaway.findUnique({ where: { id: giveawayId } });
  if (!giveaway || giveaway.ended) return;

  const participants: string[] = JSON.parse(giveaway.participants ?? '[]');
  const winners = participants.length >= giveaway.winnersCount
    ? pickWinners(participants, giveaway.winnersCount)
    : participants;

  await prisma.giveaway.update({ where: { id: giveawayId }, data: { ended: true, winners: JSON.stringify(winners) } });

  try {
    const channel = await client.channels.fetch(giveaway.channelId) as TextChannel;
    const winnerMentions = winners.length ? winners.map((w) => `<@${w}>`).join(', ') : 'No participants';

    const resultEmbed = createEmbed({
      title: '🎊 Giveaway Ended!',
      description: `**Prize:** ${giveaway.prize}\n**Winner(s):** ${winnerMentions}`,
      color: BOT_COLOR,
      timestamp: true,
    });

    if (giveaway.messageId) {
      try {
        const msg = await channel.messages.fetch(giveaway.messageId);
        await msg.edit({ embeds: [resultEmbed], components: [] });
      } catch { /* message deleted */ }
    }

    await channel.send({
      content: winners.length ? `🎉 Congratulations ${winnerMentions}! You won **${giveaway.prize}**!` : undefined,
      embeds: [resultEmbed],
    });
  } catch (err) {
    // Channel may no longer be accessible
  }
}
