import { Events, ActivityType } from 'discord.js';
import { ExtendedClient } from '../types';
import { logger } from '../utils/logger';
import { config } from '../config';
import { notificationService } from '../services/notification.service';
import { startJobs } from '../jobs';

export const name = Events.ClientReady;
export const once = true;

export async function execute(client: ExtendedClient): Promise<void> {
  logger.info(`✅ Logged in as ${client.user?.tag}`);
  logger.info(`📡 Serving ${client.guilds.cache.size} guild(s)`);

  // Set activity
  const activities = [
    { name: 'Never Miss a Free Game 🎮', type: ActivityType.Watching },
    { name: '/freegames', type: ActivityType.Playing },
    { name: '/epicfree', type: ActivityType.Playing },
    { name: '/steamdeals', type: ActivityType.Playing },
  ];

  let activityIndex = 0;
  const setActivity = () => {
    const activity = activities[activityIndex % activities.length];
    client.user?.setActivity(activity.name, { type: activity.type });
    activityIndex++;
  };

  setActivity();
  setInterval(setActivity, 30000);

  // Set client on notification service
  notificationService.setClient(client);

  // Start cron jobs
  startJobs(client);

  logger.info('🚀 midou_Teck is ready!');
}
