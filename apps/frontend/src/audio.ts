/** Gentle, generated soundscape: no downloaded music or autoplay dependency. */
export class LightSoundscape {
  private context?: AudioContext;
  private ambience?: GainNode;
  private enabled = false;
  private lastVoiceAt = 0;

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

  announce(player: string, city: string, voiceName?: string) {
    if (!this.enabled || !window.speechSynthesis) return;
    const now = Date.now();
    if (now - this.lastVoiceAt < 2600) return;
    this.lastVoiceAt = now;
    this.lantern();
    const utterance = new SpeechSynthesisUtterance(
      `${player} đã thắp sáng ${city}`,
    );
    utterance.lang = "vi-VN";
    utterance.rate = 0.92;
    utterance.pitch = 1.06;
    const voice = window.speechSynthesis
      .getVoices()
      .find((candidate) => candidate.name === voiceName);
    if (voice) utterance.voice = voice;
    utterance.onstart = () => {
      if (this.ambience) this.ambience.gain.linearRampToValueAtTime(0.026, this.context!.currentTime + 0.12);
    };
    utterance.onend = () => {
      if (this.ambience) this.ambience.gain.linearRampToValueAtTime(0.08, this.context!.currentTime + 0.45);
    };
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utterance);
  }

  stop() {
    window.speechSynthesis?.cancel();
    this.context?.close();
    this.context = undefined;
    this.enabled = false;
  }
}
