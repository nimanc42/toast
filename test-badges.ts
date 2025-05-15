// Simple test script to verify badge functionality
import { storage } from "./server/storage";

async function testBadges() {
  console.log("Testing badges functionality...");
  
  try {
    // Test 1: Get First Reflection badge
    console.log("\nTest 1: Get First Reflection badge");
    const badge = await storage.getBadgeByRequirement('first_note');
    console.log("First Reflection badge:", badge || "Not found");
    
    // If we have a test user, we could test awarding the badge
    // This would require a user ID, so we'll just log the function
    if (badge) {
      console.log("\nTo award this badge to a user:");
      console.log(`storage.awardBadge(userId, ${badge.id})`);
    }
    
    console.log("\nAll tests completed!");
  } catch (error) {
    console.error("Error during tests:", error);
  }
}

// Run tests
testBadges()
  .then(() => {
    console.log("Test script finished successfully");
    process.exit(0);
  })
  .catch(error => {
    console.error("Test script failed:", error);
    process.exit(1);
  });