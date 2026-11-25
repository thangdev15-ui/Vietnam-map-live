/** Gentle, generated soundscape: no downloaded music or autoplay dependency. */
export function hasVietnameseVoice() {
  return (window.speechSynthesis?.getVoices() ?? []).some((voice) =>
    voice.lang.toLowerCase().startsWith("vi"),
  );
}

export class LightSoundscape {
  private context?: AudioContext;
  private ambience?: GainNode;
  private enabled = false;
  private lastVoiceAt = 0;
  private narration?: HTMLAudioElement;
  private narrationQueue: Array<{ player: string; city: string }> = [];
  private processingNarration = false;

  start() {
    if (this.enabled) return;
    this.context = new AudioContext();
    const master = this.context.createGain();
    master.gain.value = 0.24;
    master.connect(this.context.destination);
    this.ambience = this.context.createGain();
    this.ambience.gain.value = 0.08;
    const filter = this.context.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.value = 720;
    this.ambience.connect(filter).connect(master);
    [130.81, 196, 261.63].forEach((frequency, index) => {
      const oscillator = this.context!.createOscillator();
      const gain = this.context!.createGain();
      oscillator.type = index === 1 ? "sine" : "triangle";
      oscillator.frequency.value = frequency;
      gain.gain.value = index === 1 ? 0.045 : 0.025;
      oscillator.connect(gain).connect(this.ambience!);
      oscillator.start();
    });
    this.enabled = true;
  }

  lantern() {
    if (!this.context || !this.enabled) return;
    const now = this.context.currentTime;
    const oscillator = this.context.createOscillator();
    const gain = this.context.createGain();
    oscillator.type = "sine";
    oscillator.frequency.setValueAtTime(523.25, now);
    oscillator.frequency.exponentialRampToValueAtTime(783.99, now + 0.55);
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(0.11, now + 0.06);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.85);
    oscillator.connect(gain).connect(this.context.destination);
    oscillator.start(now);
    oscillator.stop(now + 0.9);
  }

  async announce(player: string, city: string) {
    if (!this.enabled) return;
    const now = Date.now();
    if (now - this.lastVoiceAt < 700) return;
    this.lastVoiceAt = now;
    this.lantern();
    // Keep the first arriving live events in order. A bounded queue protects
    // the broadcast from spam without interrupting a sentence already playing.
    if (this.narrationQueue.length >= 10) return;
    this.narrationQueue.push({ player, city });
    if (!this.processingNarration) void this.drainNarration();
  }

  private async drainNarration() {
    this.processingNarration = true;
    while (this.enabled && this.narrationQueue.length) {
      const next = this.narrationQueue.shift()!;
      await this.fetchAndPlay(next.player, next.city);
    }
    this.processingNarration = false;
  }

  private async fetchAndPlay(player: string, city: string) {
    const sentence = `${player} đã thắp sáng thành phố ${city}!`;
    try {
      const queued = await fetch("/api/tts", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ text: sentence }),
      });
      if (!queued.ok) return this.speakNative(player, city);
      const { id } = (await queued.json()) as { id?: string };
      if (!id) return this.speakNative(player, city);
      for (let attempt = 0; attempt < 80; attempt++) {
        await new Promise((resolve) => setTimeout(resolve, 250));
        const audio = await fetch(`/api/tts/${id}`);
        if (audio.status === 202) continue;
        if (!audio.ok) return this.speakNative(player, city);
        await this.playNarration(await audio.blob());
        return;
      }
    } catch {
      this.speakNative(player, city);
    }
  }

  private playNarration(blob: Blob) {
    return new Promise<void>((resolve) => {
    const url = URL.createObjectURL(blob);
    const narration = new Audio(url);
    this.narration = narration;
    narration.volume = 0.92;
    narration.onplay = () => this.duck(true);
    const done = () => {
      URL.revokeObjectURL(url);
      this.duck(false);
      resolve();
    };
    narration.onended = done;
    narration.onerror = done;
    void narration.play().catch(done);
    });
  }

  private duck(active: boolean) {
    if (this.ambience && this.context)
      this.ambience.gain.linearRampToValueAtTime(active ? 0.026 : 0.08, this.context.currentTime + (active ? 0.12 : 0.45));
  }

  private speakNative(player: string, city: string) {
    return new Promise<void>((resolve) => {
    const voice = (window.speechSynthesis?.getVoices() ?? []).find((candidate) => candidate.lang.toLowerCase().startsWith("vi"));
    if (!voice || !window.speechSynthesis) return resolve();
    const utterance = new SpeechSynthesisUtterance(`${player} đã thắp sáng thành phố ${city}!`);
    utterance.lang = "vi-VN";
    utterance.voice = voice;
    utterance.rate = 0.9;
    utterance.pitch = 1.04;
    utterance.onstart = () => this.duck(true);
    utterance.onend = () => { this.duck(false); resolve(); };
    utterance.onerror = () => { this.duck(false); resolve(); };
    window.speechSynthesis.speak(utterance);
    });
  }

  stop() {
    window.speechSynthesis?.cancel();
    this.narration?.pause();
    this.narrationQueue = [];
    this.processingNarration = false;
    this.context?.close();
    this.context = undefined;
    this.enabled = false;
  }
}
