/**
 * Testing Mode Toast Generator
 * Creates toasts from testing mode reflections
 */

// Return a generic toast message that incorporates the user's reflections
export function createTestingModeToast(reflections: string[]): string {
  // If there are no reflections, return a default message
  if (!reflections || reflections.length === 0) {
    return "Here's to another week of growth! You've been on a journey of self-reflection and personal development. Keep up the momentum!";
  }

  // Start with a greeting
  let toast = "Here's a toast to your reflective week! ";

  // Add a statement about the number of reflections
  toast += `You captured ${reflections.length} moment${reflections.length === 1 ? '' : 's'} of insight. `;

  // Add excerpts from the reflections
  if (reflections.length === 1) {
    toast += `I noticed your reflection about "${shortenText(reflections[0], 30)}" shows your thoughtfulness. `;
  } else {
    // Choose the first two reflections to reference
    toast += `Your reflections about "${shortenText(reflections[0], 20)}" and "${shortenText(reflections[1], 20)}" show your commitment to personal growth. `;
  }

  // Add a random encouragement
  const encouragements = [
    "Keep building on this momentum!",
    "You're doing great work in your self-reflection journey.",
    "This practice of reflection will continue to serve you well.",
    "It's wonderful to see you taking time to document your experiences.",
    "These moments of awareness are powerful tools for growth."
  ];
  
  toast += encouragements[Math.floor(Math.random() * encouragements.length)];
  
  return toast;
}

// Helper function to shorten text
function shortenText(text: string, maxLength: number): string {
  if (!text || text.length <= maxLength) {
    return text || '';
  }
  
  // Find the last space before the maxLength to avoid cutting words
  const lastSpace = text.lastIndexOf(' ', maxLength);
  if (lastSpace > maxLength / 2) {
    return text.substring(0, lastSpace) + '...';
  }
  
  // If no good space found, just cut at maxLength
  return text.substring(0, maxLength) + '...';
}