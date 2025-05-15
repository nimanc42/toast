import { db } from "./server/db.ts";
import { badges } from "./shared/schema.ts";
import { eq } from "drizzle-orm";

async function createFirstBadge() {
  try {
    // Check if badge already exists
    const [existingBadge] = await db
      .select()
      .from(badges)
      .where(eq(badges.requirement, 'first_note'));
    
    if (existingBadge) {
      console.log("First Reflection badge already exists:", existingBadge);
      return;
    }
    
    // Create the badge
    const [badge] = await db
      .insert(badges)
      .values({
        name: 'First Reflection',
        description: 'Saved your first daily note!',
        icon: '📜',
        category: 'achievements',
        requirement: 'first_note',
        threshold: 1,
        metadata: {}
      })
      .returning();
    
    console.log("First Reflection badge created:", badge);
  } catch (error) {
    console.error("Error creating badge:", error);
  }
}

createFirstBadge();