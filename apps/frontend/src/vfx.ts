import type { Effect } from "../../../packages/shared/index";

export type VfxTier = "spark" | "awakening" | "epic" | "legendary";
export type EnergyEffect = "meteor" | "lightning" | "vortex" | "starfall" | null;
export type VfxJob = Effect & { tier: VfxTier; priority: number; duration: number; color: string; density: number; intensity: number; energy: EnergyEffect };

export const EffectPresets: Record<VfxTier, Pick<VfxJob, "priority" | "duration" | "color" | "density" | "intensity">> = {
  spark: { priority: 1, duration: 1150, color: "#ffd34e", density: 0.35, intensity: 0.35 },
  awakening: { priority: 3, duration: 2500, color: "#ffd34e", density: 0.58, intensity: 0.62 },
  epic: { priority: 6, duration: 3400, color: "#ff9d24", density: 0.82, intensity: 0.84 },
  legendary: { priority: 10, duration: 4800, color: "#fff3a4", density: 1, intensity: 1 },
};

export function presetFor(effect: Effect): VfxJob {
  const tier: VfxTier = effect.kind === "starfall" ? "legendary" : effect.kind === "meteor" || effect.kind === "gift" ? "epic" :
    effect.kind === "lightning" || effect.kind === "vortex" ? "awakening" : effect.kind === "complete" ? "legendary" :
    effect.kind === "super" || effect.kind === "chest" ? "epic" :
    effect.kind === "capture" || effect.kind === "combo" ? "awakening" : "spark";
  const preset = EffectPresets[tier];
  const kindEnergy: Record<string, EnergyEffect> = {
    meteor: "meteor", lightning: "lightning", vortex: "vortex", starfall: "starfall",
    super: "meteor", capture: "lightning", combo: "vortex", chest: "starfall", complete: "starfall", gift: "starfall",
  };
  return {
    ...effect,
    tier,
    ...preset,
    color: effect.vfx?.color ?? preset.color,
    duration: effect.vfx?.duration ?? preset.duration,
    density: effect.vfx?.density ?? preset.density,
    intensity: effect.vfx?.intensity ?? preset.intensity,
    energy: kindEnergy[effect.kind] ?? null,
  };
}

/** Bounded, priority-aware event queue shared by both map renderers. */
export class EventEffectQueue {
  private jobs: VfxJob[] = [];
  private seenAt = new Map<string, number>();
  constructor(private readonly maxJobs = 18, private readonly cooldownMs = 180) {}
  push(effect: Effect, now = performance.now()) {
    if (this.seenAt.has(effect.id)) return false;
    const key = `${effect.kind}:${effect.province}`;
    const last = this.seenAt.get(key) ?? -Infinity;
    this.seenAt.set(effect.id, now);
    if (now - last < this.cooldownMs && effect.kind === "light") return false;
    this.seenAt.set(key, now);
    this.jobs.push(presetFor(effect));
    this.jobs.sort((a, b) => b.priority - a.priority);
    this.jobs.splice(this.maxJobs);
    if (this.seenAt.size > 500) this.seenAt.clear();
    return true;
  }
  take() { return this.jobs.shift(); }
  clear() { this.jobs = []; this.seenAt.clear(); }
}

/** Reuses short-lived visual records instead of allocating unbounded bursts. */
export class EffectPool<T> {
  private free: T[] = [];
  constructor(private readonly make: () => T, private readonly reset: (item: T) => void, private readonly limit = 96) {}
  acquire() { return this.free.pop() ?? this.make(); }
  release(item: T) { this.reset(item); if (this.free.length < this.limit) this.free.push(item); }
}

export type ParticleSeed = { x: number; y: number; size: number; delay: number; drift: number };
export class ParticleManager {
  seeds(id: string, count: number, radius: number): ParticleSeed[] {
    let value = [...id].reduce((total, char) => ((total * 31) + char.charCodeAt(0)) >>> 0, 2166136261);
    const rand = () => ((value = (value * 1664525 + 1013904223) >>> 0) / 0xffffffff);
    return Array.from({ length: count }, () => {
      const angle = rand() * Math.PI * 2;
      const distance = Math.sqrt(rand()) * radius;
      return { x: Math.cos(angle) * distance, y: Math.sin(angle) * distance, size: 1.5 + rand() * 3.5, delay: rand() * 520, drift: 18 + rand() * 48 };
    });
  }
}

export class LightEffectManager {
  intensity(job: VfxJob) { return job.intensity; }
}
export class CameraEffectManager {
  focusScale(job: VfxJob) { return job.tier === "epic" ? 2.15 : job.tier === "awakening" ? 1.82 : 1.48; }
}
export class AudioEffectManager {
  trigger(play: () => void) { play(); }
}

export class VFXManager {
  readonly queue = new EventEffectQueue();
  readonly particles = new ParticleManager();
  readonly light = new LightEffectManager();
  readonly camera = new CameraEffectManager();
  readonly audio = new AudioEffectManager();
  enqueue(effect: Effect) { return this.queue.push(effect); }
  next() { return this.queue.take(); }
}
