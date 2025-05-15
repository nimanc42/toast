import { db } from "../server/db";
import { badges } from "../shared/schema";
import { checkDatabaseConnection } from "../server/db";

async function createFirstReflectionBadge() {
  try {
    // Check database connection
    await checkDatabaseConnection();
    console.log("Database connection successful");
    
    // Check if first_note badge already exists
    const existingBadge = await db.select()
      .from(badges)
      .where(b => b.requirement.equals('first_note'))
      .limit(1);
    
    if (existingBadge.length > 0) {
      console.log("First Reflection badge already exists:", existingBadge[0]);
      return;
    }
    
    // Create the "First Reflection" badge
    const firstBadge = await db.insert(badges).values({
      name: "First Reflection",
      description: "You've taken your first step toward self-reflection by creating your first note!",
      icon: "✏️",
      category: "achievements",
      requirement: "first_note",
      threshold: 1,
      metadata: JSON.stringify({
        color: "#4CAF50",
        level: "beginner"
      })
    }).returning();
    
    console.log("Created First Reflection badge:", firstBadge[0]);
    
  } catch (error) {
    console.error("Error creating first badge:", error);
  } finally {
    // Close the database connection
    await db.connection.end();
  }
}

// Run the function if this file is executed directly
if (require.main === module) {
  createFirstReflectionBadge()
    .then(() => console.log("Done"))
    .catch(err => console.error("Error:", err));
}

export { createFirstReflectionBadge };