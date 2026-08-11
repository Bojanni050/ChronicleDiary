export interface HindsightPayload {
  entry_id: string;
  timestamp: string;
  clean_transcript: string;
  user_mood: string | null;
  filter_mood: string | null;
  ai_mood: string | null;
  ai_mood_confidence: number | null;
  recording_type: string;
}

export interface HindsightResult {
  reference: string;
  configured: boolean;
}

export class MemoryService {
  async sendToHindsight(payload: HindsightPayload): Promise<HindsightResult> {
    return new HindsightAdapter().send(payload);
  }
}

export class HindsightAdapter {
  async send(payload: HindsightPayload): Promise<HindsightResult> {
    const hindsightUrl = process.env.HINDSIGHT_ENDPOINT;
    const hindsightKey = process.env.HINDSIGHT_API_KEY;

    if (hindsightUrl && hindsightKey) {
      try {
        const response = await fetch(hindsightUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${hindsightKey}`,
          },
          body: JSON.stringify(payload),
        });

        if (!response.ok) {
          throw new Error(`Hindsight API error: ${response.status}`);
        }

        const data = await response.json() as { id?: string; reference?: string };
        return {
          reference: data.id ?? data.reference ?? payload.entry_id,
          configured: true,
        };
      } catch (err) {
        throw new Error(`Hindsight request failed: ${(err as Error).message}`);
      }
    }

    // Mock adapter — not configured, application remains functional
    console.log('[HindsightAdapter] Not configured. Mock send:', JSON.stringify(payload, null, 2));
    return { reference: `local-${payload.entry_id}`, configured: false };
  }
}
