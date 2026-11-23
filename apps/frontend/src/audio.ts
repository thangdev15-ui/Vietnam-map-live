/** Gentle, generated soundscape: no downloaded music or autoplay dependency. */
export class LightSoundscape {
  private context?: AudioContext;
  private ambience?: GainNode;
  private enabled = false;
  private lastVoiceAt = 0;
  private narration?: HTMLAudioElement;

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
    if (now - this.lastVoiceAt < 2600) return;
    this.lastVoiceAt = now;
    this.lantern();
    try {
      const response = await fetch("/api/tts", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ text: `${player} đã thắp sáng ${city}` }),
      });
      if (!response.ok) return;
      this.narration?.pause();
      const url = URL.createObjectURL(await response.blob());
      const narration = new Audio(url);
      this.narration = narration;
      narration.volume = 0.9;
      narration.onplay = () => {
        if (this.ambience && this.context)
          this.ambience.gain.linearRampToValueAtTime(0.026, this.context.currentTime + 0.12);
      };
      narration.onended = () => {
        URL.revokeObjectURL(url);
        if (this.ambience && this.context)
          this.ambience.gain.linearRampToValueAtTime(0.08, this.context.currentTime + 0.45);
      };
      await narration.play();
    } catch {
      // Visual light-up continues when the voice provider is unavailable.
    }
  }

  stop() {
    this.narration?.pause();
    this.context?.close();
    this.context = undefined;
    this.enabled = false;
  }
}
