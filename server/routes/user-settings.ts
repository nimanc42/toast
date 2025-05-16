import { Router } from 'express';
import { z } from 'zod';
import { ensureAuthenticated } from '../auth';
import { storage } from '../storage';

const router = Router();

// Schema for timezone and weekly toast day updates
const updateUserSettingsSchema = z.object({
  timezone: z.string().optional(),
  weeklyToastDay: z.number().min(0).max(6).optional(),
});

/**
 * Get user settings including timezone and weekly toast day
 */
router.get('/api/user/settings', ensureAuthenticated, async (req, res) => {
  try {
    const userId = req.user!.id;
    const user = await storage.getUser(userId);
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    res.json({
      timezone: user.timezone || 'UTC',
      weeklyToastDay: user.weeklyToastDay || 0,
    });
  } catch (error) {
    console.error('Error fetching user settings:', error);
    res.status(500).json({ message: 'Failed to fetch user settings' });
  }
});

/**
 * Update user settings including timezone and weekly toast day
 */
router.put('/api/user/settings', ensureAuthenticated, async (req, res) => {
  try {
    const userId = req.user!.id;
    const validatedData = updateUserSettingsSchema.parse(req.body);
    
    const updatedUser = await storage.updateUser(userId, validatedData);
    
    res.json({
      timezone: updatedUser.timezone || 'UTC',
      weeklyToastDay: updatedUser.weeklyToastDay || 0,
    });
  } catch (error) {
    console.error('Error updating user settings:', error);
    
    if (error instanceof z.ZodError) {
      return res.status(400).json({ 
        message: 'Invalid data provided', 
        errors: error.errors 
      });
    }
    
    res.status(500).json({ message: 'Failed to update user settings' });
  }
});

export default router;