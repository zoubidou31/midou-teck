import { EmbedBuilder, ColorResolvable } from 'discord.js';
import { BOT_COLOR, ERROR_COLOR, SUCCESS_COLOR, WARNING_COLOR } from '../types';
import { config } from '../config';

export function createEmbed(options: {
  title?: string;
  description?: string;
  color?: ColorResolvable;
  thumbnail?: string;
  image?: string;
  fields?: Array<{ name: string; value: string; inline?: boolean }>;
  footer?: string;
  timestamp?: boolean;
  url?: string;
}): EmbedBuilder {
  const embed = new EmbedBuilder().setColor(options.color ?? BOT_COLOR);

  if (options.title) embed.setTitle(options.title);
  if (options.description) embed.setDescription(options.description);
  if (options.thumbnail) embed.setThumbnail(options.thumbnail);
  if (options.image) embed.setImage(options.image);
  if (options.url) embed.setURL(options.url);
  if (options.fields) embed.addFields(options.fields);
  if (options.timestamp) embed.setTimestamp();
  if (options.footer) {
    embed.setFooter({ text: options.footer });
  } else {
    embed.setFooter({ text: `${config.bot.name} • ${config.bot.tagline}` });
  }

  return embed;
}

export function errorEmbed(message: string): EmbedBuilder {
  return createEmbed({
    title: '❌ Error',
    description: message,
    color: ERROR_COLOR,
    timestamp: true,
  });
}

export function successEmbed(title: string, description?: string): EmbedBuilder {
  return createEmbed({
    title: `✅ ${title}`,
    description,
    color: SUCCESS_COLOR,
    timestamp: true,
  });
}

export function warningEmbed(message: string): EmbedBuilder {
  return createEmbed({
    title: '⚠️ Warning',
    description: message,
    color: WARNING_COLOR,
    timestamp: true,
  });
}

export function loadingEmbed(message = 'Loading...'): EmbedBuilder {
  return createEmbed({
    title: '⏳ Please wait',
    description: message,
    color: BOT_COLOR,
  });
}

export function paginationEmbed(
  items: Array<{ name: string; value: string; inline?: boolean }>,
  page: number,
  totalPages: number,
  title: string,
  color?: ColorResolvable
): EmbedBuilder {
  return createEmbed({
    title,
    color,
    fields: items,
    footer: `Page ${page}/${totalPages} • ${config.bot.name}`,
    timestamp: true,
  });
}
