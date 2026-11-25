import { createHash } from "node:crypto";
import { EdgeTTS } from "node-edge-tts";

export const VIETNAMESE_MC_VOICE = "vi-VN-HoaiMyNeural";

type CachedSpeech = { audio: Buffer; expiresAt: number; usedAt: number };

/**
 * Server-side Vietnamese MC speech using Microsoft Edge's public Read Aloud
 * transport. It deliberately has no credential: callers only receive audio,
 * never a provider secret. The small in-memory cache also prevents repeating
 * the same line from triggering another synthesis request.
 */
export class EdgeSpeechCache {
  private readonly cache = new Map<string, CachedSpeech>();
  private readonly pending = new Map<string, Promise<Buffer>>();
  private bytes = 0;

  constructor(
    private readonly voice = process.env.EDGE_TTS_VOICE || VIETNAMESE_MC_VOICE,
    private readonly ttlMs = 6 * 60 * 60 * 1000,
    private readonly maxBytes = 24 * 1024 * 1024,
  ) {}

  key(text: string) {
    return createHash("sha256").update(`${this.voice}\0${text}`).digest("hex");
  }

  get(key: string) {
    const hit = this.cache.get(key);
    if (!hit || hit.expiresAt <= Date.now()) {
      if (hit) this.delete(key, hit);
      return undefined;
    }
    hit.usedAt = Date.now();
    return hit.audio;
  }

  synthesize(text: string) {
    const key = this.key(text);
    const cached = this.get(key);
    if (cached) return { key, pending: Promise.resolve(cached), cached: true };
    let pending = this.pending.get(key);
    if (!pending) {
      pending = this.create(text).then((audio) => {
        this.put(key, audio);
        return audio;
      }).finally(() => this.pending.delete(key));
      this.pending.set(key, pending);
    }
    return { key, pending, cached: false };
  }

  private async create(text: string) {
    const tts = new EdgeTTS({
      voice: this.voice,
      lang: "vi-VN",
      outputFormat: "audio-24khz-48kbitrate-mono-mp3",
      rate: "-4%",
      timeout: 20_000,
    });
    const chunks: Buffer[] = [];
    for await (const chunk of tts.streamAudio(text)) if (Buffer.isBuffer(chunk)) chunks.push(chunk);
    const audio = Buffer.concat(chunks);
    if (audio.length < 256) throw new Error("Edge TTS did not return MP3 audio");
    return audio;
  }

  private put(key: string, audio: Buffer) {
    const old = this.cache.get(key);
    if (old) this.delete(key, old);
    const entry = { audio, expiresAt: Date.now() + this.ttlMs, usedAt: Date.now() };
    this.cache.set(key, entry);
    this.bytes += audio.length;
    while (this.bytes > this.maxBytes && this.cache.size) {
      const oldest = [...this.cache.entries()].sort((a, b) => a[1].usedAt - b[1].usedAt)[0];
      this.delete(oldest[0], oldest[1]);
    }
  }

  private delete(key: string, entry: CachedSpeech) {
    this.cache.delete(key);
    this.bytes -= entry.audio.length;
  }
}
