import OpenAI from "openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

/**
 * Generate a thoughtful review of a user's reflection
 * This provides supportive feedback without asking follow-up questions
 */
export async function generateReflectionReview(text: string): Promise<string> {
  try {
    // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { 
          role: "system", 
          content: "You are a compassionate counselor using reflective listening. When given a user's reflection, you should: 1) Echo back key points they shared, 2) Validate their emotions with empathy, and 3) Keep your response warm, supportive, and concise without asking follow-up questions."
        },
        { 
          role: "user", 
          content: `User reflection:\n"${text}"` 
        }
      ],
      max_tokens: 150,
      temperature: 0.7,
    });

    return response.choices[0].message.content || "I hear your reflection and appreciate you sharing.";
  } catch (error) {
    console.error("Error generating reflection review with OpenAI:", error);
    return "I hear your reflection and appreciate you sharing.";
  }
}