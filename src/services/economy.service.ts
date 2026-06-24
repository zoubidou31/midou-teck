import { prisma } from '../database/client';
import { logger } from '../utils/logger';

export class EconomyService {
  readonly XP_PER_MESSAGE = 15;
  readonly XP_MULTIPLIER = 1.5;
  readonly DAILY_REWARD = 100;
  readonly DAILY_XP = 50;
  readonly WORK_MIN = 20;
  readonly WORK_MAX = 100;
  readonly WORK_XP = 25;
  readonly COOLDOWN_DAILY = 86400000; // 24h
  readonly COOLDOWN_WORK = 3600000;   // 1h

  async getOrCreateEconomy(userId: string, username: string) {
    let economy = await prisma.economy.findUnique({ where: { userId } });

    if (!economy) {
      // Ensure user exists
      await prisma.user.upsert({
        where: { id: userId },
        update: { username },
        create: { id: userId, username },
      });

      economy = await prisma.economy.create({
        data: { userId, balance: 0, xp: 0, level: 1 },
      });
    }

    return economy;
  }

  calculateLevel(xp: number): number {
    return Math.floor(Math.pow(xp / 100, 1 / this.XP_MULTIPLIER)) + 1;
  }

  xpForLevel(level: number): number {
    return Math.floor(Math.pow(level - 1, this.XP_MULTIPLIER) * 100);
  }

  xpForNextLevel(level: number): number {
    return this.xpForLevel(level + 1);
  }

  async addXp(userId: string, username: string, amount: number): Promise<{ leveledUp: boolean; newLevel: number }> {
    const economy = await this.getOrCreateEconomy(userId, username);
    const newXp = economy.xp + amount;
    const newLevel = this.calculateLevel(newXp);
    const leveledUp = newLevel > economy.level;

    await prisma.economy.update({
      where: { userId },
      data: { xp: newXp, level: newLevel },
    });

    return { leveledUp, newLevel };
  }

  async addBalance(userId: string, username: string, amount: number): Promise<number> {
    const economy = await this.getOrCreateEconomy(userId, username);
    const updated = await prisma.economy.update({
      where: { userId },
      data: { balance: economy.balance + amount, totalEarned: economy.totalEarned + Math.max(0, amount) },
    });
    return updated.balance;
  }

  async claimDaily(userId: string, username: string): Promise<{
    success: boolean;
    reward?: number;
    xp?: number;
    streak?: number;
    timeLeft?: number;
  }> {
    const economy = await this.getOrCreateEconomy(userId, username);
    const now = Date.now();

    if (economy.lastDaily) {
      const timeSince = now - economy.lastDaily.getTime();
      if (timeSince < this.COOLDOWN_DAILY) {
        return { success: false, timeLeft: this.COOLDOWN_DAILY - timeSince };
      }
    }

    const timeSinceLast = economy.lastDaily ? now - economy.lastDaily.getTime() : Infinity;
    const streak = timeSinceLast < this.COOLDOWN_DAILY * 2 ? economy.streak + 1 : 1;
    const bonusMultiplier = 1 + Math.min(streak * 0.1, 1); // Max 2x bonus
    const reward = Math.floor(this.DAILY_REWARD * bonusMultiplier);
    const xp = Math.floor(this.DAILY_XP * bonusMultiplier);

    await prisma.economy.update({
      where: { userId },
      data: {
        balance: economy.balance + reward,
        xp: economy.xp + xp,
        totalEarned: economy.totalEarned + reward,
        lastDaily: new Date(),
        streak,
        level: this.calculateLevel(economy.xp + xp),
      },
    });

    return { success: true, reward, xp, streak };
  }

  async work(userId: string, username: string): Promise<{
    success: boolean;
    earned?: number;
    xp?: number;
    job?: string;
    timeLeft?: number;
  }> {
    const economy = await this.getOrCreateEconomy(userId, username);
    const now = Date.now();

    if (economy.lastWork) {
      const timeSince = now - economy.lastWork.getTime();
      if (timeSince < this.COOLDOWN_WORK) {
        return { success: false, timeLeft: this.COOLDOWN_WORK - timeSince };
      }
    }

    const jobs = [
      'Game tester', 'Streamer', 'Discord mod', 'Esports coach',
      'Game developer', 'Speed runner', 'Content creator', 'Beta tester',
    ];
    const job = jobs[Math.floor(Math.random() * jobs.length)];
    const earned = Math.floor(Math.random() * (this.WORK_MAX - this.WORK_MIN + 1)) + this.WORK_MIN;

    await prisma.economy.update({
      where: { userId },
      data: {
        balance: economy.balance + earned,
        xp: economy.xp + this.WORK_XP,
        totalEarned: economy.totalEarned + earned,
        lastWork: new Date(),
        level: this.calculateLevel(economy.xp + this.WORK_XP),
      },
    });

    return { success: true, earned, xp: this.WORK_XP, job };
  }

  async getLeaderboard(limit = 10): Promise<Array<{ userId: string; balance: number; xp: number; level: number }>> {
    const top = await prisma.economy.findMany({
      orderBy: { xp: 'desc' },
      take: limit,
      select: { userId: true, balance: true, xp: true, level: true },
    });
    return top;
  }

  formatCooldown(ms: number): string {
    const h = Math.floor(ms / 3600000);
    const m = Math.floor((ms % 3600000) / 60000);
    const s = Math.floor((ms % 60000) / 1000);
    if (h > 0) return `${h}h ${m}m`;
    if (m > 0) return `${m}m ${s}s`;
    return `${s}s`;
  }
}

export const economyService = new EconomyService();
