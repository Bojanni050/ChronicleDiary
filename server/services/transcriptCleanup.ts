export class TranscriptCleanupService {
  async clean(rawTranscript: string): Promise<string> {
    const apiKey = process.env.CLEANUP_API_KEY;
    const endpoint = process.env.CLEANUP_ENDPOINT;

    if (apiKey && endpoint) {
      // Real cleanup would call the AI provider to denoise the transcript.
    }

    // Mock provider — removes filler words, false starts, and speech artefacts
    // Preserves meaning, facts, names, events, chronology, opinions, uncertainty, emotion
    const fillerWords = [
      /\b(um|uh|er|ah|like|you know|I mean|sort of|kind of)\b/gi,
    ];
    const falseStarts = [
      /\b(I|I|I)\b(?:,\s*){2,}/gi,
      /\b(\w+),\s*\1\b/gi,
    ];

    let cleaned = rawTranscript;

    for (const pattern of fillerWords) {
      cleaned = cleaned.replace(pattern, '');
    }

    for (const pattern of falseStarts) {
      cleaned = cleaned.replace(pattern, '$1');
    }

    cleaned = cleaned
      .replace(/\s+,/g, ',')
      .replace(/,\s*,/g, ',')
      .replace(/\s+/g, ' ')
      .trim();

    if (cleaned.length > 0) {
      cleaned = cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
    }

    return cleaned;
  }
}
