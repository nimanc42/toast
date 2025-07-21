
import express from "express";
import { ensureAuthenticated } from "../auth";
import { storage } from "../storage";
import { log } from "../config";

const router = express.Router();

/**
 * Check if user is admin (you can modify this logic based on your admin system)
 */
function ensureAdmin(req: express.Request, res: express.Response, next: express.NextFunction) {
  // For now, checking if user ID is 1 (adjust based on your admin logic)
  // You might want to add an isAdmin field to your user schema instead
  if (!req.user || req.user.id !== 1) {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
}

/**
 * Get all feedback submissions (admin only)
 */
router.get('/feedback', ensureAuthenticated, ensureAdmin, async (req, res) => {
  try {
    const feedback = await storage.getAllFeedback();
    res.json(feedback);
  } catch (error) {
    log(`Error fetching feedback: ${error}`, 'routes:admin');
    res.status(500).json({ error: 'Failed to fetch feedback' });
  }
});

export default router;
