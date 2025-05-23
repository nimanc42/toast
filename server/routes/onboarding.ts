import { Request, Response } from "express";
import { storage } from "../storage";

/**
 * Complete the first-time user onboarding process
 * This sets the user's firstLogin flag to false
 */
export async function completeOnboarding(req: Request, res: Response) {
  try {
    const userId = req.user!.id;
    const updatedUser = await storage.updateUser(userId, { firstLogin: false });
    
    // Return updated user without password
    const { password, ...userWithoutPassword } = updatedUser;
    res.json(userWithoutPassword);
  } catch (error) {
    console.error("Error completing onboarding:", error);
    res.status(500).json({ message: "Failed to complete onboarding" });
  }
}