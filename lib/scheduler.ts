import { db } from './db';
import { whatsappManager } from './whatsapp-manager';
import { ReminderType } from '@prisma/client';

interface ExpiryGroup {
  type: ReminderType;
  daysDiff: number;
  messageTemplate: string;
}

const EXPIRY_CONFIGS: ExpiryGroup[] = [
  {
    type: 'EXPIRING_7',
    daysDiff: 7,
    messageTemplate: 'Hey {{name}}! 🏋️ Your membership for plan "{{plan}}" at {{gym}} is expiring in 7 days ({{date}}). Reply "2" to renew right now and keep your progress uninterrupted!',
  },
  {
    type: 'EXPIRING_3',
    daysDiff: 3,
    messageTemplate: 'Hello {{name}}! ⏳ Quick heads up: Your membership for "{{plan}}" at {{gym}} will expire in 3 days on {{date}}. Avoid the last-minute rush, reply "2" to renew instantly!',
  },
  {
    type: 'EXPIRING_1',
    daysDiff: 1,
    messageTemplate: 'Warning {{name}}! ⚠️ Your membership for "{{plan}}" at {{gym}} expires tomorrow ({{date}}). Keep your gym access active. Reply "2" to renew today!',
  },
  {
    type: 'EXPIRED_TODAY',
    daysDiff: 0,
    messageTemplate: 'Oh no {{name}}! 🛑 Your membership for "{{plan}}" at {{gym}} has expired today. Don\'t miss your training session, reply "2" to select a plan and reactivate now!',
  },
  {
    type: 'EXPIRED_3',
    daysDiff: -3,
    messageTemplate: 'Miss you {{name}}! 👋 Your membership at {{gym}} expired 3 days ago. Don\'t lose your hard-earned muscle! Reply "2" to check our new offers and join back.',
  },
  {
    type: 'EXPIRED_7',
    daysDiff: -7,
    messageTemplate: 'Hey {{name}}! It has been a week since your membership expired at {{gym}}. We want you back! Reply "2" to view active packages or contact reception to renew.',
  },
];

/**
 * Runs the daily renewal check across all active gyms and sends WhatsApp notifications.
 */
export async function runDailyRenewalChecker(): Promise<{ success: boolean; remindersSent: number }> {
  let remindersSent = 0;
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Fetch all gyms
    const gyms = await db.gym.findMany();

    for (const gym of gyms) {
      for (const config of EXPIRY_CONFIGS) {
        // Calculate the exact target date
        const targetDate = new Date(today);
        targetDate.setDate(today.getDate() + config.daysDiff);

        // Fetch memberships expiring on targetDate (ignoring time)
        const targetStart = new Date(targetDate);
        targetStart.setHours(0, 0, 0, 0);
        const targetEnd = new Date(targetDate);
        targetEnd.setHours(23, 59, 59, 999);

        const memberships = await db.membership.findMany({
          where: {
            gymId: gym.id,
            endDate: {
              gte: targetStart,
              lte: targetEnd,
            },
            status: config.daysDiff >= 0 ? 'ACTIVE' : 'EXPIRED',
          },
          include: {
            member: true,
            plan: true,
          },
        });

        for (const membership of memberships) {
          // Double check if a reminder of this type was already sent today to avoid double sending
          const existingLog = await db.renewalLog.findFirst({
            where: {
              membershipId: membership.id,
              reminderType: config.type,
              sentAt: {
                gte: today,
              },
            },
          });

          if (existingLog) continue;

          // Format notification message
          const message = config.messageTemplate
            .replace('{{name}}', membership.member.name)
            .replace('{{plan}}', membership.plan.name)
            .replace('{{gym}}', gym.name)
            .replace('{{date}}', membership.endDate.toLocaleDateString('en-IN'));

          // Dispatch message via WhatsApp
          const sent = await whatsappManager.sendMessage(gym.id, membership.member.phone, message, 'REMINDER');

          if (sent) {
            // Log the reminder
            await db.renewalLog.create({
              data: {
                memberId: membership.memberId,
                membershipId: membership.id,
                reminderType: config.type,
                status: 'SENT',
                gymId: gym.id,
              },
            });

            // Update status if expired
            if (config.daysDiff === 0) {
              await db.membership.update({
                where: { id: membership.id },
                data: { status: 'EXPIRED' },
              });
            }

            remindersSent++;
          }
        }
      }
    }

    return { success: true, remindersSent };
  } catch (error) {
    console.error('Renewal engine error:', error);
    return { success: false, remindersSent };
  }
}
