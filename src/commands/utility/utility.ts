import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  version as djsVersion,
} from 'discord.js';
import { Command, BOT_COLOR } from '../../types';
import { createEmbed } from '../../utils/embeds';
import { config } from '../../config';
import os from 'os';

export const pingCommand: Command = {
  data: new SlashCommandBuilder().setName('ping').setDescription('🏓 Check bot latency'),

  async execute(interaction: ChatInputCommandInteraction) {
    const sent = await interaction.reply({ content: '🏓 Pinging...', fetchReply: true });
    const latency = sent.createdTimestamp - interaction.createdTimestamp;
    const apiLatency = Math.round(interaction.client.ws.ping);

    await interaction.editReply({
      content: '',
      embeds: [
        createEmbed({
          title: '🏓 Pong!',
          color: BOT_COLOR,
          fields: [
            { name: '📡 Bot Latency', value: `**${latency}ms**`, inline: true },
            { name: '💻 API Latency', value: `**${apiLatency}ms**`, inline: true },
          ],
          timestamp: true,
        }),
      ],
    });
  },
};

export const helpCommand: Command = {
  data: new SlashCommandBuilder()
    .setName('help')
    .setDescription('📖 View all commands')
    .addStringOption((opt) =>
      opt
        .setName('category')
        .setDescription('Filter by category')
        .addChoices(
          { name: '🎮 Games', value: 'games' },
          { name: '💰 Economy', value: 'economy' },
          { name: '🎁 Giveaways', value: 'giveaway' },
          { name: '🛠️ Utility', value: 'utility' },
          { name: '⚙️ Admin', value: 'admin' }
        )
    ),

  async execute(interaction: ChatInputCommandInteraction) {
    await interaction.deferReply();

    const category = interaction.options.getString('category');

    const categories: Record<string, { emoji: string; commands: Array<{ name: string; desc: string }> }> = {
      games: {
        emoji: '🎮',
        commands: [
          { name: '/freegames', desc: 'Browse free Steam games' },
          { name: '/epicfree', desc: 'Epic Games giveaways' },
          { name: '/steamdeals', desc: 'Steam deals & discounts' },
          { name: '/game', desc: 'Random game recommendation' },
          { name: '/wishlist', desc: 'Manage your wishlist' },
          { name: '/notify', desc: 'Notification preferences' },
        ],
      },
      economy: {
        emoji: '💰',
        commands: [
          { name: '/balance', desc: 'Check coin balance' },
          { name: '/work', desc: 'Work for coins (1h cooldown)' },
          { name: '/daily', desc: 'Daily reward (24h cooldown)' },
          { name: '/rank', desc: 'Your XP rank' },
          { name: '/leaderboard', desc: 'Top players' },
          { name: '/profile', desc: 'Your full profile' },
        ],
      },
      giveaway: {
        emoji: '🎁',
        commands: [
          { name: '/giveaway create', desc: 'Start a giveaway' },
          { name: '/giveaway end', desc: 'End a giveaway early' },
          { name: '/giveaway reroll', desc: 'Reroll winners' },
        ],
      },
      utility: {
        emoji: '🛠️',
        commands: [
          { name: '/ping', desc: 'Bot latency' },
          { name: '/help', desc: 'This command' },
          { name: '/botinfo', desc: 'Bot information' },
          { name: '/invite', desc: 'Invite the bot' },
          { name: '/serverinfo', desc: 'Server information' },
          { name: '/userinfo', desc: 'User information' },
        ],
      },
      admin: {
        emoji: '⚙️',
        commands: [
          { name: '/set-steam-channel', desc: 'Set Steam notifications channel' },
          { name: '/set-epic-channel', desc: 'Set Epic notifications channel' },
          { name: '/set-deals-channel', desc: 'Set deals notifications channel' },
        ],
      },
    };

    if (category && categories[category]) {
      const cat = categories[category];
      const fields = cat.commands.map((cmd) => ({
        name: cmd.name,
        value: cmd.desc,
        inline: true,
      }));

      await interaction.editReply({
        embeds: [
          createEmbed({
            title: `${cat.emoji} ${category.charAt(0).toUpperCase() + category.slice(1)} Commands`,
            color: BOT_COLOR,
            fields,
            timestamp: true,
          }),
        ],
      });
    } else {
      const fields = Object.entries(categories).map(([key, cat]) => ({
        name: `${cat.emoji} ${key.charAt(0).toUpperCase() + key.slice(1)}`,
        value: `${cat.commands.length} commands\nUse \`/help category:${key}\``,
        inline: true,
      }));

      const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder()
          .setLabel('Invite Bot')
          .setStyle(ButtonStyle.Link)
          .setURL(`https://discord.com/api/oauth2/authorize?client_id=${config.bot.clientId}&permissions=277562453056&scope=bot%20applications.commands`),
        new ButtonBuilder()
          .setLabel('Support Server')
          .setStyle(ButtonStyle.Link)
          .setURL(config.bot.supportInvite)
      );

      await interaction.editReply({
        embeds: [
          createEmbed({
            title: `${config.bot.name} — Command Help`,
            description: `**${config.bot.tagline}**\n\nSelect a category or use \`/help category:\` for detailed commands.`,
            color: BOT_COLOR,
            fields,
            timestamp: true,
          }),
        ],
        components: [row],
      });
    }
  },
};

export const botInfoCommand: Command = {
  data: new SlashCommandBuilder().setName('botinfo').setDescription('ℹ️ View bot information'),

  async execute(interaction: ChatInputCommandInteraction) {
    await interaction.deferReply();

    const uptime = process.uptime();
    const uptimeStr = `${Math.floor(uptime / 86400)}d ${Math.floor((uptime % 86400) / 3600)}h ${Math.floor((uptime % 3600) / 60)}m`;
    const memUsage = process.memoryUsage();
    const memMB = Math.round(memUsage.heapUsed / 1024 / 1024);

    await interaction.editReply({
      embeds: [
        createEmbed({
          title: `${config.bot.name} — Bot Info`,
          description: config.bot.tagline,
          color: BOT_COLOR,
          thumbnail: interaction.client.user?.displayAvatarURL(),
          fields: [
            { name: '🖥️ Servers', value: `**${interaction.client.guilds.cache.size}**`, inline: true },
            { name: '👥 Users', value: `**${interaction.client.users.cache.size}**`, inline: true },
            { name: '📡 Ping', value: `**${interaction.client.ws.ping}ms**`, inline: true },
            { name: '⏱️ Uptime', value: uptimeStr, inline: true },
            { name: '💾 Memory', value: `${memMB}MB`, inline: true },
            { name: '📦 Discord.js', value: `v${djsVersion}`, inline: true },
            { name: '🟢 Node.js', value: process.version, inline: true },
            { name: '🖥️ Platform', value: `${os.type()} ${os.arch()}`, inline: true },
          ],
          timestamp: true,
        }),
      ],
    });
  },
};

export const inviteCommand: Command = {
  data: new SlashCommandBuilder().setName('invite').setDescription('📨 Get the bot invite link'),

  async execute(interaction: ChatInputCommandInteraction) {
    const inviteUrl = `https://discord.com/api/oauth2/authorize?client_id=${config.bot.clientId}&permissions=277562453056&scope=bot%20applications.commands`;

    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder().setLabel('🤖 Invite Bot').setStyle(ButtonStyle.Link).setURL(inviteUrl),
      new ButtonBuilder().setLabel('💬 Support Server').setStyle(ButtonStyle.Link).setURL(config.bot.supportInvite)
    );

    await interaction.reply({
      embeds: [
        createEmbed({
          title: '📨 Invite midou_Teck',
          description: `Add **${config.bot.name}** to your server!\n\n*${config.bot.tagline}*`,
          color: BOT_COLOR,
          timestamp: true,
        }),
      ],
      components: [row],
    });
  },
};

export const serverInfoCommand: Command = {
  data: new SlashCommandBuilder().setName('serverinfo').setDescription('🏠 View server information'),
  guildOnly: true,

  async execute(interaction: ChatInputCommandInteraction) {
    await interaction.deferReply();

    const guild = interaction.guild!;
    await guild.fetch();

    await interaction.editReply({
      embeds: [
        createEmbed({
          title: `🏠 ${guild.name}`,
          color: BOT_COLOR,
          thumbnail: guild.iconURL() ?? undefined,
          fields: [
            { name: '👑 Owner', value: `<@${guild.ownerId}>`, inline: true },
            { name: '👥 Members', value: `**${guild.memberCount}**`, inline: true },
            { name: '📅 Created', value: `<t:${Math.floor(guild.createdTimestamp / 1000)}:D>`, inline: true },
            { name: '💬 Channels', value: `**${guild.channels.cache.size}**`, inline: true },
            { name: '🎭 Roles', value: `**${guild.roles.cache.size}**`, inline: true },
            { name: '😄 Emojis', value: `**${guild.emojis.cache.size}**`, inline: true },
            { name: '🔒 Verification', value: guild.verificationLevel.toString(), inline: true },
            { name: '🆔 Server ID', value: `\`${guild.id}\``, inline: true },
          ],
          timestamp: true,
        }),
      ],
    });
  },
};

export const userInfoCommand: Command = {
  data: new SlashCommandBuilder()
    .setName('userinfo')
    .setDescription('👤 View user information')
    .addUserOption((opt) => opt.setName('user').setDescription('Target user')),

  async execute(interaction: ChatInputCommandInteraction) {
    await interaction.deferReply();

    const target = interaction.options.getUser('user') ?? interaction.user;
    const member = interaction.guild?.members.cache.get(target.id);

    const fields = [
      { name: '🏷️ Username', value: target.username, inline: true },
      { name: '🆔 ID', value: `\`${target.id}\``, inline: true },
      { name: '🤖 Bot?', value: target.bot ? 'Yes' : 'No', inline: true },
      { name: '📅 Account Created', value: `<t:${Math.floor(target.createdTimestamp / 1000)}:D>`, inline: true },
    ];

    if (member) {
      fields.push(
        { name: '📆 Joined Server', value: `<t:${Math.floor((member.joinedTimestamp ?? 0) / 1000)}:D>`, inline: true },
        { name: '🎭 Top Role', value: member.roles.highest.toString(), inline: true }
      );
    }

    await interaction.editReply({
      embeds: [
        createEmbed({
          title: `👤 ${target.username}`,
          color: BOT_COLOR,
          thumbnail: target.displayAvatarURL({ size: 256 }),
          fields,
          timestamp: true,
        }),
      ],
    });
  },
};
