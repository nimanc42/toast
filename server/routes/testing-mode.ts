/**
 * Testing Mode Controllers
 * This file contains all testing mode related functionality to keep it isolated
 * from the main application and easier to maintain.
 */
import { Router } from 'express';
import { CONFIG } from '../config';
import { type Response, type Request } from 'express';

// Create a dedicated router for testing mode
export const testingModeRouter = Router();

/**
 * Enable testing mode for the current session
 */
testingModeRouter.post('/enable', (req: Request, res: Response) => {
  if (!CONFIG.ENABLE_TESTING_MODE) {
    return res.status(403).json({ message: "Testing mode is disabled" });
  }
  
  // Clear any existing session to start fresh
  req.session.regenerate((err) => {
    if (err) {
      console.error("Error regenerating session for testing mode:", err);
      return res.status(500).json({ message: "Failed to create testing session" });
    }
    
    // Create a fresh testing mode session
    req.session.testingMode = true;
    
    // Save the session
    req.session.save((saveErr) => {
      if (saveErr) {
        console.error("Error saving testing mode session:", saveErr);
        return res.status(500).json({ message: "Error saving testing mode session" });
      }
      
      console.log("Testing mode enabled for session:", req.sessionID);
      
      // Send back success response without a token
      // The client will handle this by setting a flag in localStorage
      res.status(200).json({
        success: true,
        message: "Testing mode successfully enabled"
      });
    });
  });
});

/**
 * Check the status of testing mode
 */
testingModeRouter.get('/status', (req: Request, res: Response) => {
  const isTestingModeSession = Boolean(req.session.testingMode);
  const isGlobalTestingModeEnabled = CONFIG.ENABLE_TESTING_MODE;
  
  res.status(200).json({
    enabled: isTestingModeSession || isGlobalTestingModeEnabled,
    globallyEnabled: isGlobalTestingModeEnabled,
    sessionEnabled: isTestingModeSession
  });
});

/**
 * Disable testing mode for the current session
 */
testingModeRouter.post('/disable', (req: Request, res: Response) => {
  if (req.session.testingMode) {
    delete req.session.testingMode;
    
    req.session.save((err) => {
      if (err) {
        console.error("Error saving session after disabling testing mode:", err);
        return res.status(500).json({ message: "Error disabling testing mode" });
      }
      
      res.status(200).json({ 
        success: true,
        message: "Testing mode disabled" 
      });
    });
  } else {
    res.status(200).json({ 
      success: true,
      message: "Testing mode was not enabled" 
    });
  }
});