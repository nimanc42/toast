
import { db } from './server/db';
import { users } from '@shared/schema';
import { eq } from 'drizzle-orm';

async function checkUserId1() {
  try {
    const user = await db.select().from(users).where(eq(users.id, 1)).limit(1);
    
    if (user.length > 0) {
      console.log('User with ID 1:');
      console.log(`Username: ${user[0].username}`);
      console.log(`Email: ${user[0].email}`);
      console.log(`Name: ${user[0].name}`);
      console.log(`Verified: ${user[0].verified}`);
      console.log(`Created: ${user[0].createdAt}`);
    } else {
      console.log('No user found with ID 1');
    }
  } catch (error) {
    console.error('Error checking user:', error);
  } finally {
    process.exit(0);
  }
}

checkUserId1();
