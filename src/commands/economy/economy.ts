import { SlashCommandBuilder, ChatInputCommandInteraction } from 'discord.js';
import { Command, BOT_COLOR, SUCCESS_COLOR } from '../../types';
import { economyService } from '../../services/economy.service';
import { createEmbed, errorEmbed } from '../../utils/embeds';

export const balanceCommand: Command = {
  data: new SlashCommandBuilder()
    .setName('balance')
    .setDescription('💰 Check your coin balance')
    .addUserOption((opt) => opt.setName('user').setDescription('Check another user\'s balance')),

  cooldown: 3,

  async execute(interaction: ChatInputCommandInteraction) {
    await interaction.deferReply();

    const target = interaction.options.getUser('user') ?? interaction.user;
    const economy = await economyService.getOrCreateEconomy(target.id, target.username);
    const nextLevelXp = economyService.xpForNextLevel(economy.level);
    const progress = Math.floor((economy.xp / nextLevelXp) * 10);
    const bar = '█'.repeat(progress) + '░'.repeat(10 - progress);

    await interaction.editReply({
      embeds: [
        createEmbed({
          title: `💰 ${target.username}'s Balance`,
          color: BOT_COLOR,
          thumbnail: target.displayAvatarURL(),
          fields: [
            { name: '💳 Coins', value: `**${economy.balance.toLocaleString()}** 🪙`, inline: true },
            { name: '🏆 Total Earned', value: `**${economy.totalEarned.toLocaleString()}** 🪙`, inline: true },
            { name: '⚡ Level', value: `**${economy.level}**`, inline: true },
            { name: `📊 XP Progress [${bar}]`, value: `${economy.xp}/${nextLevelXp} XP`, inline: false },
          ],
          timestamp: true,
        }),
      ],
    });
  },
};

export const workCommand: Command = {
  data: new SlashCommandBuilder()
    .setName('work')
    .setDescription('💼 Work to earn coins (1 hour cooldown)'),

  cooldown: 3,

  async execute(interaction: ChatInputCommandInteraction) {
    await interaction.deferReply();

    const result = await economyService.work(interaction.user.id, interaction.user.username);

    if (!result.success) {
      await interaction.editReply({
        embeds: [
          errorEmbed(`You're tired! Come back in **${economyService.formatCooldown(result.timeLeft!)}**.`),
        ],
      });
      return;
    }

    await interaction.editReply({
      embeds: [
        createEmbed({
          title: '💼 Work Complete!',
          description: `You worked as a **${result.job}** and earned **${result.earned} 🪙** and **${result.xp} XP**!`,
          color: SUCCESS_COLOR,
          timestamp: true,
        }),
      ],
    });
  },
};

export const dailyCommand: Command = {
  data: new SlashCommandBuilder()
    .setName('daily')
    .setDescription('🎁 Claim your daily reward (24 hour cooldown)'),

  cooldown: 3,

  async execute(interaction: ChatInputCommandInteraction) {
    await interaction.deferReply();

    const result = await economyService.claimDaily(interaction.user.id, interaction.user.username);

    if (!result.success) {
      await interaction.editReply({
        embeds: [
          errorEmbed(`You've already claimed your daily! Come back in **${economyService.formatCooldown(result.timeLeft!)}**.`),
        ],
      });
      return;
    }

    await interaction.editReply({
      embeds: [
        createEmbed({
          title: '🎁 Daily Reward Claimed!',
          description: [
            `You received **${result.reward} 🪙** and **${result.xp} XP**!`,
            `🔥 Current streak: **${result.streak} day${result.streak !== 1 ? 's' : ''}**`,
            result.streak! > 1 ? `Bonus multiplier: **+${Math.min(result.streak! * 10, 100)}%**` : '',
          ].filter(Boolean).join('\n'),
          color: SUCCESS_COLOR,
          timestamp: true,
        }),
      ],
    });
  },
};

export const rankCommand: Command = {
  data: new SlashCommandBuilder()
    .setName('rank')
    .setDescription('🏅 View your XP rank and level progress')
    .addUserOption((opt) => opt.setName('user').setDescription('Check another user\'s rank')),

  cooldown: 5,

  async execute(interaction: ChatInputCommandInteraction) {
    await interaction.deferReply();

    const target = interaction.options.getUser('user') ?? interaction.user;
    const economy = await economyService.getOrCreateEconomy(target.id, target.username);
    const nextLevelXp = economyService.xpForNextLevel(economy.level);
    const currentLevelXp = economyService.xpForLevel(economy.level);
    const xpInLevel = economy.xp - currentLevelXp;
    const xpNeeded = nextLevelXp - currentLevelXp;
    const progress = Math.floor((xpInLevel / xpNeeded) * 10);
    const bar = '█'.repeat(progress) + '░'.repeat(10 - progress);

    await interaction.editReply({
      embeds: [
        createEmbed({
          title: `🏅 ${target.username}'s Rank`,
          color: BOT_COLOR,
          thumbnail: target.displayAvatarURL(),
          fields: [
            { name: '⚡ Level', value: `**${economy.level}**`, inline: true },
            { name: '✨ Total XP', value: `**${economy.xp.toLocaleString()}**`, inline: true },
            { name: '🔥 Streak', value: `**${economy.streak} days**`, inline: true },
            {
              name: `📊 Progress to Level ${economy.level + 1}`,
              value: `[${bar}] ${xpInLevel}/${xpNeeded} XP`,
              inline: false,
            },
          ],
          timestamp: true,
        }),
      ],
    });
  },
};

export const leaderboardCommand: Command = {
  data: new SlashCommandBuilder()
    .setName('leaderboard')
    .setDescription('🏆 View the server XP leaderboard'),

  cooldown: 10,

  async execute(interaction: ChatInputCommandInteraction) {
    await interaction.deferReply();

    const top = await economyService.getLeaderboard(10);

    if (!top.length) {
      await interaction.editReply({
        embeds: [
          createEmbed({
            title: '🏆 Leaderboard',
            description: 'No players yet. Start earning XP with `/work` and `/daily`!',
            color: BOT_COLOR,
          }),
        ],
      });
      return;
    }

    const medals = ['🥇', '🥈', '🥉'];
    const fields = await Promise.all(
      top.map(async (entry, i) => {
        let username = `User ${entry.userId.slice(0, 6)}`;
        try {
          const user = await interaction.client.users.fetch(entry.userId);
          username = user.username;
        } catch {}

        return {
          name: `${medals[i] ?? `**${i + 1}.**`} ${username}`,
          value: `Level **${entry.level}** • **${entry.xp.toLocaleString()}** XP • **${entry.balance.toLocaleString()}** 🪙`,
          inline: false,
        };
      })
    );

    await interaction.editReply({
      embeds: [
        createEmbed({
          title: '🏆 XP Leaderboard',
          description: 'Top players ranked by XP',
          color: BOT_COLOR,
          fields,
          timestamp: true,
        }),
      ],
    });
  },
};

export const profileCommand: Command = {
  data: new SlashCommandBuilder()
    .setName('profile')
    .setDescription('👤 View your full profile')
    .addUserOption((opt) => opt.setName('user').setDescription('View another user\'s profile')),

  cooldown: 5,

  async execute(interaction: ChatInputCommandInteraction) {
    await interaction.deferReply();

    const target = interaction.options.getUser('user') ?? interaction.user;
    const economy = await economyService.getOrCreateEconomy(target.id, target.username);
    const wishlistCount = await (await import('../../database/client')).prisma.wishlist.count({ where: { userId: target.id } });

    await interaction.editReply({
      embeds: [
        createEmbed({
          title: `👤 ${target.username}'s Profile`,
          color: BOT_COLOR,
          thumbnail: target.displayAvatarURL({ size: 256 }),
          fields: [
            { name: '⚡ Level', value: `**${economy.level}**`, inline: true },
            { name: '✨ XP', value: `**${economy.xp.toLocaleString()}**`, inline: true },
            { name: '💰 Balance', value: `**${economy.balance.toLocaleString()}** 🪙`, inline: true },
            { name: '🔥 Daily Streak', value: `**${economy.streak} days**`, inline: true },
            { name: '📋 Wishlist', value: `**${wishlistCount}** games`, inline: true },
            { name: '💳 Total Earned', value: `**${economy.totalEarned.toLocaleString()}** 🪙`, inline: true },
          ],
          timestamp: true,
        }),
      ],
    });
  },
};
