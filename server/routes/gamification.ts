import { Router } from 'express';
import { storage } from '../storage';
import { log } from '../vite';
import { ensureAuthenticated } from '../auth';
import { z } from 'zod';

const router = Router();

/**
 * Get user badges by user ID
 */
router.get('/badges', ensureAuthenticated, async (req, res) => {
  try {
    const userId = req.user!.id;
    const badges = await storage.getUserBadges(userId);
    
    // Mark all unseen badges as seen
    const unseenBadges = badges.filter(b => !b.seen);
    for (const badge of unseenBadges) {
      await storage.markUserBadgeSeen(badge.id);
    }
    
    res.json(badges);
  } catch (error) {
    log(`Error fetching user badges: ${error}`, 'routes:gamification');
    res.status(500).json({ error: 'Failed to fetch badges' });
  }
});

/**
 * Get all unseen badges for the user
 */
router.get('/badges/unseen', ensureAuthenticated, async (req, res) => {
  try {
    const userId = req.user!.id;
    const badges = await storage.getUnseenUserBadges(userId);
    res.json(badges);
  } catch (error) {
    log(`Error fetching unseen badges: ${error}`, 'routes:gamification');
    res.status(500).json({ error: 'Failed to fetch unseen badges' });
  }
});

/**
 * Mark a badge as seen
 */
router.patch('/badges/:id/seen', ensureAuthenticated, async (req, res) => {
  try {
    const { id } = req.params;
    const badge = await storage.markUserBadgeSeen(parseInt(id));
    res.json(badge);
  } catch (error) {
    log(`Error marking badge as seen: ${error}`, 'routes:gamification');
    res.status(500).json({ error: 'Failed to mark badge as seen' });
  }
});

/**
 * Check for new badges (e.g. when a user completes a streak or shares content)
 */
router.post('/badges/check', ensureAuthenticated, async (req, res) => {
  try {
    const userId = req.user!.id;
    const newBadges = await storage.checkAndAwardBadges(userId);
    res.json(newBadges);
  } catch (error) {
    log(`Error checking for badges: ${error}`, 'routes:gamification');
    res.status(500).json({ error: 'Failed to check for badges' });
  }
});

/**
 * Get user activity/analytics
 */
router.get('/analytics/activity', ensureAuthenticated, async (req, res) => {
  try {
    const userId = req.user!.id;
    const { type, limit } = req.query;
    
    const limitValue = limit ? parseInt(limit as string) : undefined;
    const activity = await storage.getUserActivity(userId, type as string | undefined, limitValue);
    
    res.json(activity);
  } catch (error) {
    log(`Error fetching user activity: ${error}`, 'routes:gamification');
    res.status(500).json({ error: 'Failed to fetch user activity' });
  }
});

/**
 * Get user analytics (weekly and monthly counts)
 */
router.get('/analytics/summary', ensureAuthenticated, async (req, res) => {
  try {
    const userId = req.user!.id;
    
    // Get various activity metrics
    const [
      weeklyNotes,
      monthlyNotes,
      weeklyShares,
      monthlyShares,
      weeklyReactions,
      monthlyReactions
    ] = await Promise.all([
      storage.getWeeklyActivityCount(userId, 'note-create'),
      storage.getMonthlyActivityCount(userId, 'note-create'),
      storage.getWeeklyActivityCount(userId, 'toast-share'),
      storage.getMonthlyActivityCount(userId, 'toast-share'),
      storage.getWeeklyActivityCount(userId, 'reaction-received'),
      storage.getMonthlyActivityCount(userId, 'reaction-received')
    ]);
    
    // Get user streak
    const streak = await storage.getUserStreak(userId);
    
    // Get badges count
    const badges = await storage.getUserBadges(userId);
    
    res.json({
      streak,
      badgesCount: badges.length,
      activity: {
        notes: {
          weekly: weeklyNotes,
          monthly: monthlyNotes
        },
        shares: {
          weekly: weeklyShares,
          monthly: monthlyShares
        },
        reactions: {
          weekly: weeklyReactions,
          monthly: monthlyReactions
        }
      }
    });
  } catch (error) {
    log(`Error fetching analytics summary: ${error}`, 'routes:gamification');
    res.status(500).json({ error: 'Failed to fetch analytics summary' });
  }
});

/**
 * Log user activity
 */
router.post('/analytics/log', ensureAuthenticated, async (req, res) => {
  try {
    const logSchema = z.object({
      activityType: z.string(),
      metadata: z.record(z.any()).optional()
    });
    
    const result = logSchema.safeParse(req.body);
    if (!result.success) {
      return res.status(400).json({ error: 'Invalid request body' });
    }
    
    const { activityType, metadata } = result.data;
    const userId = req.user!.id;
    
    const activity = await storage.logUserActivity({
      userId,
      activityType,
      metadata: metadata || {}
    });
    
    res.status(201).json(activity);
  } catch (error) {
    log(`Error logging activity: ${error}`, 'routes:gamification');
    res.status(500).json({ error: 'Failed to log activity' });
  }
});

/**
 * Admin route to create a badge (for testing purposes)
 */
router.post('/badges/seed', ensureAuthenticated, async (req, res) => {
  try {
    const badgeSchema = z.object({
      name: z.string(),
      description: z.string(),
      icon: z.string(),
      category: z.string(),
      requirement: z.string(),
      threshold: z.number(),
      metadata: z.record(z.any()).optional()
    });
    
    const result = badgeSchema.safeParse(req.body);
    if (!result.success) {
      return res.status(400).json({ error: 'Invalid badge data', details: result.error });
    }
    
    const { name, description, icon, category, requirement, threshold, metadata } = result.data;
    
    const badge = await storage.createBadge({
      name,
      description, 
      icon,
      category,
      requirement,
      threshold,
      metadata: metadata || {}
    });
    
    res.status(201).json(badge);
  } catch (error) {
    log(`Error creating badge: ${error}`, 'routes:gamification');
    res.status(500).json({ error: 'Failed to create badge' });
  }
});

/**
 * Admin route to award a badge to a user (for testing purposes)
 */
router.post('/badges/award', ensureAuthenticated, async (req, res) => {
  try {
    const awardSchema = z.object({
      userId: z.number(),
      badgeId: z.number()
    });
    
    const result = awardSchema.safeParse(req.body);
    if (!result.success) {
      return res.status(400).json({ error: 'Invalid request data', details: result.error });
    }
    
    const { userId, badgeId } = result.data;
    
    const userBadge = await storage.awardBadge(userId, badgeId);
    
    res.status(201).json(userBadge);
  } catch (error) {
    log(`Error awarding badge: ${error}`, 'routes:gamification');
    res.status(500).json({ error: 'Failed to award badge' });
  }
});

/**
 * Test route to check if the First Reflection badge exists
 */
router.get('/badges/test-first-badge', async (req, res) => {
  try {
    const badge = await storage.getBadgeByRequirement('first_note');
    if (badge) {
      res.json({ 
        exists: true, 
        badge 
      });
    } else {
      res.json({ 
        exists: false,
        message: 'First Reflection badge not found' 
      });
    }
  } catch (error) {
    log(`Error testing first badge: ${error}`, 'routes:gamification');
    res.status(500).json({ message: 'Failed to test first badge', error: String(error) });
  }
});

export default router;