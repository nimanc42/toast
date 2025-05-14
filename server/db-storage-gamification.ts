import { db } from './db';
import { 
  badges, 
  userBadges, 
  userActivity,
  Badge,
  UserBadge,
  UserActivity,
  InsertUserBadge,
  InsertUserActivity
} from '@shared/schema';
import { eq, and, sql, desc, gte } from 'drizzle-orm';
import { subDays, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from 'date-fns';

/**
 * Badge-related storage methods
 */
export async function getBadgeById(id: number): Promise<Badge | undefined> {
  const [badge] = await db.select().from(badges).where(eq(badges.id, id));
  return badge;
}

export async function getBadgesByCategory(category: string): Promise<Badge[]> {
  return db.select().from(badges).where(eq(badges.category, category));
}

export async function getUserBadges(userId: number): Promise<(UserBadge & { badge: Badge })[]> {
  return db.select({
    id: userBadges.id,
    userId: userBadges.userId,
    badgeId: userBadges.badgeId,
    seen: userBadges.seen,
    createdAt: userBadges.createdAt,
    badge: badges
  })
  .from(userBadges)
  .innerJoin(badges, eq(userBadges.badgeId, badges.id))
  .where(eq(userBadges.userId, userId))
  .orderBy(desc(userBadges.createdAt));
}

export async function getUserBadgeByIds(userId: number, badgeId: number): Promise<UserBadge | undefined> {
  const [userBadge] = await db.select()
    .from(userBadges)
    .where(
      and(
        eq(userBadges.userId, userId),
        eq(userBadges.badgeId, badgeId)
      )
    );
  
  return userBadge;
}

export async function createUserBadge(insertUserBadge: InsertUserBadge): Promise<UserBadge> {
  const [userBadge] = await db
    .insert(userBadges)
    .values(insertUserBadge)
    .returning();
  
  return userBadge;
}

export async function markUserBadgeSeen(id: number): Promise<UserBadge> {
  const [updatedBadge] = await db
    .update(userBadges)
    .set({ seen: true })
    .where(eq(userBadges.id, id))
    .returning();
  
  return updatedBadge;
}

export async function getUnseenUserBadges(userId: number): Promise<(UserBadge & { badge: Badge })[]> {
  return db.select({
    id: userBadges.id,
    userId: userBadges.userId,
    badgeId: userBadges.badgeId,
    seen: userBadges.seen,
    createdAt: userBadges.createdAt,
    badge: badges
  })
  .from(userBadges)
  .innerJoin(badges, eq(userBadges.badgeId, badges.id))
  .where(
    and(
      eq(userBadges.userId, userId),
      eq(userBadges.seen, false)
    )
  )
  .orderBy(desc(userBadges.createdAt));
}

/**
 * Activity logging and analytics methods
 */
export async function logUserActivity(activity: InsertUserActivity): Promise<UserActivity> {
  const [result] = await db
    .insert(userActivity)
    .values(activity)
    .returning();
  
  return result;
}

export async function getUserActivity(userId: number, type?: string, limit: number = 100): Promise<UserActivity[]> {
  let query = db.select()
    .from(userActivity)
    .where(eq(userActivity.userId, userId));
  
  if (type) {
    query = query.where(eq(userActivity.activityType, type));
  }
  
  return query
    .orderBy(desc(userActivity.createdAt))
    .limit(limit);
}

export async function getWeeklyActivityCount(userId: number, activityType: string): Promise<number> {
  const now = new Date();
  const weekStart = startOfWeek(now, { weekStartsOn: 1 }); // Start on Monday
  const weekEnd = endOfWeek(now, { weekStartsOn: 1 });
  
  const [result] = await db
    .select({ count: sql<number>`count(*)` })
    .from(userActivity)
    .where(
      and(
        eq(userActivity.userId, userId),
        eq(userActivity.activityType, activityType),
        gte(userActivity.createdAt, weekStart),
        sql`${userActivity.createdAt} <= ${weekEnd}`
      )
    );
  
  return result?.count || 0;
}

export async function getMonthlyActivityCount(userId: number, activityType: string): Promise<number> {
  const now = new Date();
  const monthStart = startOfMonth(now);
  const monthEnd = endOfMonth(now);
  
  const [result] = await db
    .select({ count: sql<number>`count(*)` })
    .from(userActivity)
    .where(
      and(
        eq(userActivity.userId, userId),
        eq(userActivity.activityType, activityType),
        gte(userActivity.createdAt, monthStart),
        sql`${userActivity.createdAt} <= ${monthEnd}`
      )
    );
  
  return result?.count || 0;
}

/**
 * Check for badges based on user activity
 */
export async function checkAndAwardBadges(userId: number): Promise<UserBadge[]> {
  // Get already awarded badges to avoid duplicates
  const userBadgesList = await getUserBadges(userId);
  const awardedBadgeIds = userBadgesList.map(badge => badge.badgeId);
  
  // Get all available badges
  const allBadges = await db.select().from(badges);
  
  // Function to check if user already has a badge
  const userHasBadge = (badgeId: number) => awardedBadgeIds.includes(badgeId);
  
  // Store newly awarded badges
  const newBadges: UserBadge[] = [];
  
  // Check streak-related badges
  const streakBadges = allBadges.filter(badge => badge.category === 'streak');
  if (streakBadges.length > 0) {
    // Get user streak
    const [userInfo] = await db
      .execute(sql`SELECT get_user_streak(${userId}) as streak`);
    
    const streak = userInfo?.streak || 0;
    
    // Award streak badges
    for (const badge of streakBadges) {
      // Convert requirement to number (stored as JSON in metadata)
      const requiredStreak = badge.metadata?.days ? parseInt(badge.metadata.days.toString()) : 0;
      
      if (streak >= requiredStreak && !userHasBadge(badge.id)) {
        // User qualifies for badge
        const newBadge = await createUserBadge({
          userId,
          badgeId: badge.id,
          seen: false
        });
        
        newBadges.push(newBadge);
        
        // Log the badge award
        await logUserActivity({
          userId,
          activityType: 'badge-earned',
          metadata: { badgeId: badge.id, badgeName: badge.name }
        });
      }
    }
  }
  
  // Additional badge checks can be added here
  // e.g., check for sharing badges, reaction badges, etc.
  
  return newBadges;
}