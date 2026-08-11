export interface MoodDetectionResult {
  mood: string;
  confidence: number;
}

export class MoodDetectionService {
  async detect(transcript: string): Promise<MoodDetectionResult> {
    const apiKey = process.env.MOOD_DETECTION_API_KEY;
    const endpoint = process.env.MOOD_DETECTION_ENDPOINT;

    if (apiKey && endpoint) {
      // Real mood detection would call the AI provider with the transcript.
    }

    // Mock provider — simple keyword-based, clearly isolated
    const lower = transcript.toLowerCase();
    const moodKeywords: Record<string, string[]> = {
      happy: ['happy', 'great', 'awesome', 'love', 'excited', 'wonderful'],
      calm: ['calm', 'peaceful', 'relaxed', 'nice', 'quiet'],
      tired: ['tired', 'exhausted', 'sleepy', 'drained'],
      sad: ['sad', 'down', 'unhappy', 'lonely', 'miss'],
      anxious: ['anxious', 'worried', 'nervous', 'stressed', 'overwhelmed'],
      angry: ['angry', 'frustrated', 'annoyed', 'mad', 'furious'],
      good: ['good', 'fine', 'okay', 'alright'],
    };

    let bestMood = 'neutral';
    let bestScore = 0;

    for (const [mood, words] of Object.entries(moodKeywords)) {
      const count = words.filter((w) => lower.includes(w)).length;
      if (count > bestScore) {
        bestScore = count;
        bestMood = mood;
      }
    }

    const confidence = bestScore > 0 ? Math.min(0.5 + bestScore * 0.15, 0.95) : 0.5;
    return { mood: bestMood, confidence };
  }
}
