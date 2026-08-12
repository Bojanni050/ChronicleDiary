export interface TranscriptionResult {
  transcript: string;
}

export class TranscriptionService {
  async transcribe(recordingBase64: string, recordingType: string): Promise<string> {
    void recordingBase64;
    void recordingType;
    const apiKey = process.env.TRANSCRIPTION_API_KEY;
    const endpoint = process.env.TRANSCRIPTION_ENDPOINT;

    if (apiKey && endpoint) {
      // Real transcription would decode the base64 audio and POST to the provider.
      // Implement the fetch here when a provider is configured.
    }

    // Mock provider — clearly isolated, not a real transcription
    return [
      'So, today was, um, a pretty good day overall.',
      'I, I woke up early, which was, you know, kind of surprising, and, uh, I actually got a lot done.',
      'Went for a walk in the morning, the weather was, like, really nice, and, you know, I felt pretty calm.',
      'Work was, um, busy but, like, not too stressful, which was good.',
      'I had a nice conversation with a friend, and, uh, that was, you know, really nice.',
      'Feeling pretty good about, about the day, I guess.',
    ].join(' ');
  }
}
