import { storage } from "./storage";

console.log("Seed script started");

async function seedFirstBadge() {
  console.log("Starting seed process...");
  try {
    // Check if the badge already exists
    const existingBadge = await storage.getBadgeByRequirement('first_note');
    
    if (existingBadge) {
      console.log("First Reflection badge already exists:", existingBadge);
      return existingBadge;
    }
    
    console.log("Creating First Reflection badge...");
    const badge = await storage.createBadge({
      name: 'First Reflection',
      description: 'Saved your first daily note!',
      icon: '📜',
      category: 'achievements',
      requirement: 'first_note',
      threshold: 1
    });
    
    console.log("Created First Reflection badge:", badge);
    return badge;
  } catch (error) {
    console.error("Error seeding first badge:", error);
    throw error;
  }
}

// Export function for use in other files
export { seedFirstBadge };

// Run directly if called as a script
// Always run the seed function when this file is executed directly
console.log("About to call seedFirstBadge()");
seedFirstBadge()
  .then((badge) => {
    console.log("Seed completed successfully", badge);
    process.exit(0);
  })
  .catch((error) => {
    console.error("Seed failed:", error);
    process.exit(1);
  });