import { Events, Interaction, Collection } from 'discord.js';
import { ExtendedClient } from '../types';
import { logger } from '../utils/logger';
import { errorEmbed } from '../utils/embeds';

export const name = Events.InteractionCreate;

export async function execute(interaction: Interaction): Promise<void> {
  if (!interaction.isChatInputCommand()) return;

  const client = interaction.client as ExtendedClient;
  const command = client.commands.get(interaction.commandName);

  if (!command) {
    logger.warn(`Unknown command: ${interaction.commandName}`);
    await interaction.reply({ embeds: [errorEmbed('Unknown command.')], ephemeral: true });
    return;
  }

  // Guild-only check
  if (command.guildOnly && !interaction.guild) {
    await interaction.reply({
      embeds: [errorEmbed('This command can only be used in a server!')],
      ephemeral: true,
    });
    return;
  }

  // Owner-only check
  if (command.ownerOnly && interaction.user.id !== process.env.BOT_OWNER_ID) {
    await interaction.reply({
      embeds: [errorEmbed('This command is owner-only!')],
      ephemeral: true,
    });
    return;
  }

  // Cooldown check
  const cooldownAmount = (command.cooldown ?? 3) * 1000;
  const now = Date.now();

  if (!client.cooldowns.has(command.data.name)) {
    client.cooldowns.set(command.data.name, new Collection());
  }

  const timestamps = client.cooldowns.get(command.data.name)!;
  const userTimestamp = timestamps.get(interaction.user.id);

  if (userTimestamp) {
    const expiration = userTimestamp + cooldownAmount;
    if (now < expiration) {
      const remaining = ((expiration - now) / 1000).toFixed(1);
      await interaction.reply({
        embeds: [errorEmbed(`⏳ Please wait **${remaining}s** before using \`/${command.data.name}\` again.`)],
        ephemeral: true,
      });
      return;
    }
  }

  timestamps.set(interaction.user.id, now);
  setTimeout(() => timestamps.delete(interaction.user.id), cooldownAmount);

  try {
    await command.execute(interaction);
  } catch (error) {
    logger.error(`Error executing command ${interaction.commandName}:`, error);

    const errorMsg = { embeds: [errorEmbed('An error occurred while executing this command.')], ephemeral: true };

    if (interaction.replied || interaction.deferred) {
      await interaction.followUp(errorMsg).catch(() => {});
    } else {
      await interaction.reply(errorMsg).catch(() => {});
    }
  }
}
