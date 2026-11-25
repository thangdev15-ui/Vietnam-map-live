import { useEffect, useMemo, useRef, useState, type CSSProperties, type PointerEvent as ReactPointerEvent } from "react";
import Phaser from "phaser";
import type { Province, State } from "../../../packages/shared/index";
import terrainSurface from "./assets/terrain-surface-v2.webp";
import { EffectPool, VFXManager, type VfxJob } from "./vfx";
const project = ([x, y]: number[]) => ({
  x: (x - 101.5) * 62 + 50,
  y: (24 - y) * 49 + 20,
});

const ringPath = (ring: number[][]) =>
  ring
    .map((point, index) => {
      const { x, y } = project(point);
      return `${index ? "L" : "M"}${x.toFixed(2)} ${y.toFixed(2)}`;
    })
    .join(" ") + " Z";

const polygonPath = (polygon: number[][][]) => polygon.map(ringPath).join(" ");

/**
 * The terrain is deliberately not a Vietnam image. This image is only a
 * continuous land material. The real province polygons below are the sole
 * source of Vietnam's shape, province boundaries, and all lighting masks.
 */
type TerrainCamera = { x: number; y: number; scale: number };

function ProvinceTerrain({ provinces, state, onSelect }: { provinces: Province[]; state: State; onSelect: (id: string) => void }) {
  const terrainMode = state.settings.map === "cyber-grid";
  const prefix = useRef(`province-terrain-${Math.random().toString(36).slice(2)}`).current;
  const [camera, setCamera] = useState<TerrainCamera>({ x: 350, y: 410, scale: 1 });
  const cameraRef = useRef(camera);
  const frameRef = useRef<number | undefined>(undefined);
  const resetRef = useRef<number | undefined>(undefined);
  const vfx = useRef(new VFXManager()).current;
  // Effects are server-authoritative and carry the actual province ID. This
  // lets terrain mode animate regular lights, gifts and Test Lab cues without
  // deriving a target from a possibly unrelated territory delta.
  const seenEffects = useRef<Set<string> | undefined>(undefined);
  const [event, setEvent] = useState<VfxJob>();
  const territoryById = new Map(state.territories.map((territory) => [territory.id, territory]));
  const moveCamera = (target: TerrainCamera, duration: number) => {
    cancelAnimationFrame(frameRef.current ?? 0);
    const start = cameraRef.current;
    const began = performance.now();
    const tick = (now: number) => {
      const raw = Math.min(1, (now - began) / duration);
      const ease = 1 - (1 - raw) ** 3;
      const next = { x: start.x + (target.x - start.x) * ease, y: start.y + (target.y - start.y) * ease, scale: start.scale + (target.scale - start.scale) * ease };
      cameraRef.current = next;
      setCamera(next);
      if (raw < 1) frameRef.current = requestAnimationFrame(tick);
    };
    frameRef.current = requestAnimationFrame(tick);
  };
  useEffect(() => {
    if (!terrainMode) {
      setEvent(undefined);
      seenEffects.current = undefined;
      return;
    }
    if (!seenEffects.current) {
      seenEffects.current = new Set(state.effects.map((effect) => effect.id));
      return;
    }
    const latest = state.effects.find((effect) => !seenEffects.current!.has(effect.id));
    state.effects.forEach((effect) => seenEffects.current!.add(effect.id));
    if (seenEffects.current.size > 3000) seenEffects.current = new Set(state.effects.map((effect) => effect.id));
    if (!latest) return;
    const province = provinces.find((item) => item.id === latest.province);
    if (!province) return;
    const point = project(province.center);
    if (!vfx.enqueue(latest)) return;
    const job = vfx.next();
    if (!job) return;
    setEvent(job);
    window.clearTimeout(resetRef.current);
    moveCamera({ x: point.x, y: point.y, scale: vfx.camera.focusScale(job) }, 620);
    resetRef.current = window.setTimeout(() => { setEvent(undefined); moveCamera({ x: 350, y: 410, scale: 1 }, 900); }, job.duration);
  }, [terrainMode, state.effects, provinces, vfx]);
  useEffect(() => () => { cancelAnimationFrame(frameRef.current ?? 0); window.clearTimeout(resetRef.current); }, []);
  const eventProvince = event && provinces.find((province) => province.id === event.province);
  const eventPoint = eventProvince ? project(eventProvince.center) : undefined;
  const eventParticles = useMemo(() => event ? vfx.particles.seeds(event.id, event.tier === "spark" ? 14 : 34, event.tier === "epic" ? 50 : 34) : [], [event, vfx]);
  const energyParticles = useMemo(() => event ? vfx.particles.seeds(`${event.id}-energy`, Math.min(48, Math.round(24 + event.density * 26)), 72 * event.intensity) : [], [event, vfx]);
  if (!terrainMode) return null;
  const tx = 350 - camera.scale * camera.x;
  const ty = 410 - camera.scale * camera.y;
  const selectProvince = (pointer: ReactPointerEvent<SVGSVGElement>) => {
    const bounds = pointer.currentTarget.getBoundingClientRect();
    const x = ((pointer.clientX - bounds.left) / bounds.width * 700 - tx) / camera.scale;
    const y = ((pointer.clientY - bounds.top) / bounds.height * 820 - ty) / camera.scale;
    const province = provinces.find((candidate) => candidate.polygons.some((polygon) => {
      const contains = (ring: number[][]) => Phaser.Geom.Polygon.Contains(new Phaser.Geom.Polygon(ring.map(project)), x, y);
      return contains(polygon[0]) && !polygon.slice(1).some(contains);
    }));
    if (province) onSelect(province.id);
  };
  return (
    <svg className="province-terrain" viewBox="0 0 700 820" aria-label="Bản đồ địa hình Việt Nam" onPointerDown={selectProvince}>
      <defs>
        <linearGradient id="terrain-beacon-gradient" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#fff" stopOpacity="0" />
          <stop offset=".5" stopColor="#fff6af" stopOpacity=".96" />
          <stop offset="1" stopColor="#ff9d24" stopOpacity=".16" />
        </linearGradient>
        <clipPath id={`${prefix}-all`} clipPathUnits="userSpaceOnUse">
          {provinces.flatMap((province) => province.polygons.map((polygon, index) => (
            <path key={`${province.id}-${index}`} d={polygonPath(polygon)} fillRule="evenodd" clipRule="evenodd" />
          )))}
        </clipPath>
        {provinces.map((province) => (
          <clipPath key={province.id} id={`${prefix}-${province.id}`} clipPathUnits="userSpaceOnUse">
            {province.polygons.map((polygon, index) => (
              <path key={index} d={polygonPath(polygon)} fillRule="evenodd" clipRule="evenodd" />
            ))}
          </clipPath>
        ))}
      </defs>
      <g transform={`translate(${tx} ${ty}) scale(${camera.scale})`}>
      <g clipPath={`url(#${prefix}-all)`}>
        <image href={terrainSurface} x="-68" y="-38" width="836" height="1115" preserveAspectRatio="xMidYMid slice" />
        {/* The dormant map is deliberately dark. Light is revealed only by
            the exact polygon of the province receiving game progress. */}
        <rect width="700" height="820" fill="#01040c" opacity="0.92" />
      </g>
      {provinces.map((province) => {
        const territory = territoryById.get(province.id);
        const progress = Phaser.Math.Clamp(1 - (territory?.hp ?? state.settings.hp) / state.settings.hp, 0, 1);
        const lit = Boolean(territory?.owner);
        if (!lit && progress <= 0) return null;
        // A partially charged province is still visible, but cannot look as
        // bright as a completed one. At 0% it has no separate light layer.
        const brightness = lit ? 1 : Math.max(0.16, progress);
        return (
          <g key={province.id} clipPath={`url(#${prefix}-${province.id})`} className={lit ? "terrain-province terrain-province-lit" : "terrain-province"}>
            <image href={terrainSurface} x="-68" y="-38" width="836" height="1115" preserveAspectRatio="xMidYMid slice" opacity={brightness} />
            <rect width="700" height="820" fill={lit ? "#ffd33d" : "#f0a628"} opacity={lit ? 0.3 : 0.06 + progress * 0.34} />
            {lit && <rect width="700" height="820" fill="#fff3a2" opacity="0.12" className="terrain-lit-pulse" />}
          </g>
        );
      })}
      <g fill="none" stroke="#eec458" strokeOpacity="0.72" strokeWidth="1.05" vectorEffect="non-scaling-stroke">
        {provinces.flatMap((province) => province.polygons.map((polygon, index) => (
          <path key={`${province.id}-${index}`} d={polygonPath(polygon)} fillRule="evenodd" />
        )))}
      </g>
      {eventPoint && event && (
        <>
          {/* Every in-province VFX element is clipped by its real geometry.
              This keeps energy waves and rain inside the province during zoom. */}
          <g clipPath={`url(#${prefix}-${event.province})`} className={`terrain-awakening terrain-awakening-${event.tier}`}>
            <rect width="700" height="820" className="terrain-golden-pulse" />
            <rect x={eventPoint.x - 12} y="-90" width="24" height={eventPoint.y + 130} className="terrain-divine-beacon" />
            <circle cx={eventPoint.x} cy={eventPoint.y} r="9" className="terrain-energy-wave terrain-energy-wave-one" />
            <circle cx={eventPoint.x} cy={eventPoint.y} r="9" className="terrain-energy-wave terrain-energy-wave-two" />
            {eventProvince!.polygons.map((polygon, index) => (
              <path key={`trace-${index}`} d={polygonPath(polygon)} className="terrain-golden-trace" fill="none" />
            ))}
            {eventParticles.map((particle, index) => (
              <circle key={`particle-${index}`} cx={eventPoint.x + particle.x} cy={eventPoint.y + particle.y} r={particle.size} fill={index % 4 === 0 ? "#ffffff" : "#ffd34e"} className="terrain-golden-particle">
                <animate attributeName="cy" from={eventPoint.y + particle.y} to={eventPoint.y + particle.y - particle.drift} dur="1.25s" begin={`${particle.delay}ms`} fill="freeze" />
                <animate attributeName="opacity" values="0;1;.85;0" dur="1.25s" begin={`${particle.delay}ms`} fill="freeze" />
              </circle>
            ))}
            {[0, 1, 2].map((index) => (
              <path key={`crystal-${index}`} d={`M ${eventPoint.x + (index - 1) * 13} ${eventPoint.y + 12} l 6 -${22 + index * 7} l 7 ${22 + index * 7} Z`} className="terrain-crystal" />
            ))}
            {eventParticles.slice(0, 13).map((particle, index) => (
              <line key={`rain-${index}`} x1={eventPoint.x + particle.x} y1={eventPoint.y - 85 - index * 4} x2={eventPoint.x + particle.x - 6} y2={eventPoint.y - 48 - index * 4} className="terrain-golden-rain" style={{ animationDelay: `${particle.delay}ms` }} />
            ))}
          </g>
          <g className="terrain-event" transform={`translate(${eventPoint.x} ${eventPoint.y})`}>
            <circle r="13" fill="#fff3ae" opacity=".92" className="terrain-core-flash" />
            <circle r="10" fill="none" stroke="#ffd34e" strokeWidth="3" className="terrain-event-ring" />
            <circle r="4" fill="#fff" />
            {event.power > 0 && <>
              <text y="-23" textAnchor="middle" className="terrain-event-user">{event.player}</text>
              <text y="35" textAnchor="middle" className="terrain-event-score">+{event.power} ÁNH SÁNG</text>
            </>}
          </g>
          {event.energy === "meteor" && (
            <g className="terrain-epic terrain-meteor" style={{ "--vfx-color": event.color, "--vfx-duration": `${event.duration}ms` } as CSSProperties}>
              <path d={`M ${eventPoint.x - 175} ${eventPoint.y - 210} Q ${eventPoint.x - 25} ${eventPoint.y - 158} ${eventPoint.x} ${eventPoint.y}`} className="terrain-meteor-tail" />
              <circle cx={eventPoint.x - 175} cy={eventPoint.y - 210} r={8 + event.intensity * 5} className="terrain-meteor-core">
                <animateMotion path={`M 0 0 Q 150 52 175 210`} dur={`${Math.max(650, event.duration * .32)}ms`} fill="freeze" />
              </circle>
              {[0, 1, 2].map((index) => <circle key={index} cx={eventPoint.x} cy={eventPoint.y} r={8} className="terrain-impact-wave" style={{ animationDelay: `${index * 130 + event.duration * .31}ms` }} />)}
            </g>
          )}
          {event.energy === "lightning" && (
            <g className="terrain-epic terrain-lightning" style={{ "--vfx-color": event.color, "--vfx-duration": `${event.duration}ms` } as CSSProperties}>
              <polyline points={`${eventPoint.x - 16},-45 ${eventPoint.x + 11},${eventPoint.y - 124} ${eventPoint.x - 12},${eventPoint.y - 69} ${eventPoint.x + 8},${eventPoint.y - 32} ${eventPoint.x},${eventPoint.y}`} className="terrain-lightning-bolt" />
              <polyline points={`${eventPoint.x + 8},${eventPoint.y - 48} ${eventPoint.x + 39},${eventPoint.y - 27} ${eventPoint.x + 21},${eventPoint.y - 7}`} className="terrain-lightning-branch" />
              <polyline points={`${eventPoint.x - 10},${eventPoint.y - 77} ${eventPoint.x - 42},${eventPoint.y - 51} ${eventPoint.x - 28},${eventPoint.y - 23}`} className="terrain-lightning-branch" />
              <circle cx={eventPoint.x} cy={eventPoint.y} r={45 + event.intensity * 28} className="terrain-lightning-flash" />
            </g>
          )}
          {event.energy === "vortex" && (
            <g className="terrain-epic terrain-vortex" transform={`translate(${eventPoint.x} ${eventPoint.y})`} style={{ "--vfx-color": event.color, "--vfx-duration": `${event.duration}ms` } as CSSProperties}>
              {[1, .73, .46].map((scale, index) => <ellipse key={scale} rx={58 * scale} ry={20 * scale} className="terrain-vortex-ring" style={{ animationDelay: `${index * 110}ms` }} />)}
              {energyParticles.slice(0, 18).map((particle, index) => <circle key={index} cx={particle.x} cy={particle.y} r={particle.size} className="terrain-vortex-orb" style={{ animationDelay: `${particle.delay}ms` }} />)}
              <circle r={9 + event.intensity * 5} className="terrain-vortex-core" />
            </g>
          )}
          {event.energy === "starfall" && (
            <g className="terrain-epic terrain-starfall" style={{ "--vfx-color": event.color, "--vfx-duration": `${event.duration}ms` } as CSSProperties}>
              {energyParticles.slice(0, 14).map((particle, index) => <line key={index} x1={eventPoint.x + particle.x * 2} y1={eventPoint.y - 160 + particle.y} x2={eventPoint.x + particle.x * .22} y2={eventPoint.y + particle.y * .12} className="terrain-star" style={{ animationDelay: `${particle.delay}ms` }} />)}
              <circle cx={eventPoint.x} cy={eventPoint.y} r={12} className="terrain-starfail-core" />
            </g>
          )}
        </>
      )}
      </g>
    </svg>
  );
}
export function BattleMap({
  provinces,
  state,
  onSelect,
}: {
  provinces: Province[];
  state: State;
  onSelect: (id: string) => void;
}) {
  const host = useRef<HTMLDivElement>(null);
  const scene = useRef<Phaser.Scene | null>(null);
  const latest = useRef(state);
  const selected = useRef(onSelect);
  latest.current = state;
  selected.current = onSelect;
  useEffect(() => {
    const seen = new Set<string>();
    let graphics: Phaser.GameObjects.Graphics;
    let markers: Phaser.GameObjects.Container;
    let pooledParticles: EffectPool<Phaser.GameObjects.Arc>;
    let previous = "";
    let markerSignature = "";
    let active = 0;
    let cameraReset: Phaser.Time.TimerEvent | undefined;
    let tourReset: Phaser.Time.TimerEvent | undefined;
    let effectsReady = false;
    let touring = 0;
    const vfx = new VFXManager();
    class MapScene extends Phaser.Scene {
      create() {
        scene.current = this;
        graphics = this.add.graphics();
        markers = this.add.container();
        pooledParticles = new EffectPool(
          () => this.add.circle(-100, -100, 1, 0xffffff, 0).setVisible(false),
          (particle) => particle.setVisible(false).setAlpha(0).setScale(1).setPosition(-100, -100),
          72,
        );
        const stars = this.add.graphics();
        for (let i = 0; i < 65; i++) {
          const x = Phaser.Math.Between(8, 692);
          const y = Phaser.Math.Between(8, 812);
          const dot = this.add.circle(x, y, Phaser.Math.FloatBetween(0.35, 1.2), 0xb9dcff, Phaser.Math.FloatBetween(0.12, 0.55));
          this.tweens.add({ targets: dot, alpha: 0.08, y: y - Phaser.Math.Between(6, 18), duration: Phaser.Math.Between(1600, 3400), yoyo: true, repeat: -1, delay: i * 45 });
        }
        stars.destroy();
        // Khi yên tĩnh, máy quay trôi giữa các vùng để bản đồ luôn sống.
        this.time.addEvent({
          delay: 4600,
          loop: true,
          callback: () => {
            if (active || !effectsReady) return;
            const province = provinces[touring++ % provinces.length];
            const point = project(province.center);
            const camera = this.cameras.main;
            camera.pan(point.x, point.y, 1400, "Sine.easeInOut");
            camera.zoomTo(1.1, 1400, "Sine.easeInOut");
            tourReset = this.time.delayedCall(2350, () => {
              if (active) return;
              camera.pan(350, 410, 1450, "Sine.easeInOut");
              camera.zoomTo(1, 1450, "Sine.easeInOut");
            });
          },
        });
        this.input.on("pointerdown", (pointer: Phaser.Input.Pointer) => {
          for (const p of provinces) {
            if (
              p.polygons.some((poly) => {
                const contains = (ring: number[][]) =>
                  Phaser.Geom.Polygon.Contains(
                    new Phaser.Geom.Polygon(ring.map(project)),
                    pointer.x,
                    pointer.y,
                  );
                return contains(poly[0]) && !poly.slice(1).some(contains);
              })
            ) {
              selected.current(p.id);
              break;
            }
          }
        });
      }
      refreshMarkers(s: State) {
        // Map 2 is SVG-only. Phaser canvas and SVG scale differently in the
        // responsive broadcast layout, so canvas markers would drift away
        // from their province. The broadcast HUD remains the player display.
        if (s.settings.map === "cyber-grid") {
          if (markerSignature) markers.removeAll(true);
          markerSignature = "";
          return;
        }
        const lit = s.territories.filter((t) => t.owner);
        const key = lit
          .map((t) => `${t.id}:${(t.contributors ?? []).map((player) => player.name).join(",")}`)
          .join("|");
        if (key === markerSignature) return;
        markerSignature = key;
        markers.removeAll(true);
        lit.forEach((territory, index) => {
          const province = provinces.find((p) => p.id === territory.id);
          if (!province) return;
          const position = project(province.center);
          const marker = this.add.container(position.x + (index % 2 ? 5 : -5), position.y - 4);
          const halo = this.add.circle(0, 0, 11, 0xffcf43, 0.22);
          const bulb = this.add.circle(0, 0, 5, 0xfff4ae, 1).setStrokeStyle(1.5, 0xffaa18, 1);
          const sparkle = this.add.text(0, -11, "✦", { fontFamily: "Arial Black, sans-serif", fontSize: "10px", color: "#fff2a0", stroke: "#6f3e00", strokeThickness: 1 }).setOrigin(0.5);
          marker.add([halo, bulb, sparkle]);
          (territory.contributors ?? []).slice(0, 6).forEach((player, personIndex) => {
            const angle = (personIndex / Math.min(6, (territory.contributors ?? []).length)) * Math.PI * 2 - Math.PI / 2;
            const distance = 15 + (personIndex % 2) * 3;
            const x = Math.cos(angle) * distance;
            const y = Math.sin(angle) * distance;
            const person = this.add.circle(x, y, 5.2, 0x102248, 1).setStrokeStyle(1.3, 0xffe783, 1);
            const initial = this.add.text(x, y, player.name.slice(0, 1).toUpperCase(), { fontFamily: "Arial Black, sans-serif", fontSize: "5px", color: "#fff6bc" }).setOrigin(0.5);
            marker.add([person, initial]);
          });
          markers.add(marker);
          this.tweens.add({ targets: halo, scale: 1.45, alpha: 0.06, duration: 1300, yoyo: true, repeat: -1, ease: "Sine.easeInOut", delay: index * 55 });
        });
      }
      burst(position: { x: number; y: number }, color: number, count: number, radius: number) {
        for (let i = 0; i < count; i++) {
          const angle = Phaser.Math.FloatBetween(0, Math.PI * 2);
          const distance = Phaser.Math.FloatBetween(radius * 0.35, radius);
          const particle = this.add.circle(position.x, position.y, Phaser.Math.FloatBetween(1.4, 3.6), color, 1);
          this.tweens.add({
            targets: particle,
            x: position.x + Math.cos(angle) * distance,
            y: position.y + Math.sin(angle) * distance,
            alpha: 0,
            scale: 0.3,
            duration: Phaser.Math.Between(360, 700),
            ease: "Cubic.easeOut",
            onComplete: () => particle.destroy(),
          });
        }
      }
      focusEvent(position: { x: number; y: number }, kind: string) {
        const camera = this.cameras.main;
        cameraReset?.remove(false);
        tourReset?.remove(false);
        const capture = kind === "capture";
        const superLight = kind === "super";
        const epicEnergy = ["meteor", "lightning", "vortex", "starfall"].includes(kind);
        const combo = kind === "combo";
        const lighting = kind === "light";
        const gathering = kind === "gather";
        camera.pan(position.x, position.y, epicEnergy || superLight ? 720 : combo ? 480 : capture ? 560 : 360, "Cubic.easeOut");
        camera.zoomTo(epicEnergy || superLight ? 2.42 : combo ? 1.8 : capture ? 2.28 : gathering ? 1.55 : lighting ? 1.28 : 1.35, epicEnergy || superLight ? 720 : combo ? 480 : capture ? 560 : 360, "Cubic.easeOut");
        cameraReset = this.time.delayedCall(epicEnergy || superLight ? 3500 : combo ? 1800 : capture ? 2900 : gathering ? 1700 : lighting ? 920 : 980, () => {
          camera.pan(350, 410, epicEnergy || superLight ? 1200 : capture ? 980 : 460, "Sine.easeInOut");
          camera.zoomTo(1, epicEnergy || superLight ? 1200 : capture ? 980 : 460, "Sine.easeInOut");
        });
      }
      flashProvince(province: Province, color: number, capture: boolean) {
        const flash = this.add.graphics();
        flash.fillStyle(capture ? 0xfff1a4 : color, capture ? 0.72 : 0.42);
        flash.lineStyle(capture ? 3.5 : 2, 0xffffff, 1);
        for (const polygon of province.polygons) {
          const points = polygon[0].map(project);
          flash.fillPoints(points, true);
          flash.strokePoints(points, true);
        }
        this.tweens.add({
          targets: flash,
          alpha: 0,
          duration: capture ? 820 : 460,
          ease: "Cubic.easeOut",
          onComplete: () => flash.destroy(),
        });
      }
      goldenAwakening(province: Province, position: { x: number; y: number }, effect: VfxJob) {
        const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
        const duration = reduced ? 1 : effect.duration;
        // Golden Trace and Pulse use the real province rings, never a loose rectangle.
        const trace = this.add.graphics();
        trace.lineStyle(3.6, 0xffe378, 0.96);
        const pulse = this.add.graphics();
        pulse.fillStyle(0xffc737, 0.36);
        for (const polygon of province.polygons) {
          const points = polygon[0].map(project);
          trace.strokePoints(points, true);
          pulse.fillPoints(points, true);
        }
        trace.setBlendMode(Phaser.BlendModes.ADD);
        pulse.setBlendMode(Phaser.BlendModes.ADD);
        this.tweens.add({ targets: trace, alpha: { from: 0, to: 1 }, duration: 150, yoyo: true, hold: Math.min(760, duration / 2), onComplete: () => trace.destroy() });
        this.tweens.add({ targets: pulse, alpha: 0, duration: Math.min(1250, duration), ease: "Cubic.easeOut", onComplete: () => pulse.destroy() });
        // Keep a portrait-safe beacon around the target. A full-height quad
        // looked like a solid banner after camera zoom, not like light.
        const beacon = this.add.rectangle(position.x, position.y - 52, 9, 112, 0xffe68a, 0.72).setBlendMode(Phaser.BlendModes.ADD);
        this.tweens.add({ targets: beacon, scaleX: effect.tier === "epic" ? 2.7 : 2.1, scaleY: 1.45, alpha: 0, duration: Math.min(960, duration), ease: "Cubic.easeOut", onComplete: () => beacon.destroy() });
        [0, 170].forEach((delay, index) => this.time.delayedCall(delay, () => {
          const wave = this.add.circle(position.x, position.y, 8, 0xffdf70, 0.07).setStrokeStyle(2.4, index ? 0xff9d24 : 0xfff4ac, 0.9).setBlendMode(Phaser.BlendModes.ADD);
          this.tweens.add({ targets: wave, scale: effect.tier === "epic" ? 17 : 11, alpha: 0, duration: 960, ease: "Cubic.easeOut", onComplete: () => wave.destroy() });
        }));
        // Procedural particles, crystals and golden rain; every object self-cleans.
        const seeds = vfx.particles.seeds(effect.id, effect.tier === "epic" ? 42 : 27, effect.tier === "epic" ? 94 : 62);
        seeds.forEach((seed, index) => {
          const particle = pooledParticles.acquire().setPosition(position.x + seed.x, position.y + seed.y).setRadius(seed.size).setFillStyle(index % 4 ? 0xffd34e : 0xffffff, 0.94).setBlendMode(Phaser.BlendModes.ADD).setVisible(true).setAlpha(1);
          this.tweens.add({ targets: particle, y: particle.y - seed.drift, alpha: 0, scale: 0.15, delay: seed.delay, duration: 860, ease: "Sine.easeOut", onComplete: () => pooledParticles.release(particle) });
        });
        [-14, 0, 14].forEach((offset, index) => {
          const crystal = this.add.triangle(position.x + offset, position.y + 8, 0, 23, 7, 0, 14, 23, 0xffef9a, 0.96).setStrokeStyle(1, 0xff9d24, 0.9).setScale(1, 0.05);
          this.tweens.add({ targets: crystal, scaleY: 1.25, delay: 80 + index * 120, duration: 330, ease: "Back.easeOut", yoyo: true, hold: 550, onComplete: () => crystal.destroy() });
        });
        seeds.slice(0, 12).forEach((seed, index) => {
          const rain = this.add.line(position.x + seed.x, position.y - 100 - index * 5, 0, 0, -6, 34, 0xfff2a6, 0.8).setLineWidth(1.8).setBlendMode(Phaser.BlendModes.ADD);
          this.tweens.add({ targets: rain, y: rain.y + 95, alpha: 0, delay: seed.delay, duration: 700, ease: "Quad.easeIn", onComplete: () => rain.destroy() });
        });
      }
      epicEnergy(position: { x: number; y: number }, effect: VfxJob) {
        const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
        const color = Phaser.Display.Color.HexStringToColor(effect.color).color;
        const duration = reduced ? 1 : effect.duration;
        const particles = Math.min(54, Math.max(12, Math.round(34 * effect.density)));
        const impact = () => {
          const core = this.add.circle(position.x, position.y, 9, 0xfff6c2, 1).setBlendMode(Phaser.BlendModes.ADD);
          this.tweens.add({ targets: core, scale: 9 + effect.intensity * 5, alpha: 0, duration: 680, ease: "Cubic.easeOut", onComplete: () => core.destroy() });
          [0, 125, 270].forEach((delay, index) => this.time.delayedCall(delay, () => {
            const wave = this.add.circle(position.x, position.y, 8, color, .09).setStrokeStyle(2.5, index ? color : 0xffffff, .95).setBlendMode(Phaser.BlendModes.ADD);
            this.tweens.add({ targets: wave, scale: 8 + effect.intensity * 7 + index * 2, alpha: 0, duration: 900, ease: "Cubic.easeOut", onComplete: () => wave.destroy() });
          }));
          vfx.particles.seeds(`${effect.id}-impact`, particles, 94).forEach((seed, index) => {
            const particle = pooledParticles.acquire().setPosition(position.x, position.y).setRadius(seed.size).setFillStyle(index % 5 ? color : 0xffffff, .96).setBlendMode(Phaser.BlendModes.ADD).setVisible(true).setAlpha(1);
            this.tweens.add({ targets: particle, x: position.x + seed.x, y: position.y + seed.y, alpha: 0, scale: .2, delay: seed.delay * .38, duration: 760, ease: "Cubic.easeOut", onComplete: () => pooledParticles.release(particle) });
          });
          if (!reduced) this.cameras.main.shake(155, .004 + effect.intensity * .002);
        };
        if (effect.energy === "meteor") {
          const start = { x: position.x - 190, y: position.y - 220 };
          const tail = this.add.line(start.x, start.y, -74, -62, 0, 0, color, .72).setLineWidth(5).setBlendMode(Phaser.BlendModes.ADD);
          const meteor = this.add.circle(start.x, start.y, 8 + effect.intensity * 4, 0xfff6bd, 1).setStrokeStyle(2.5, color, 1).setBlendMode(Phaser.BlendModes.ADD);
          this.tweens.add({ targets: [tail, meteor], x: position.x, y: position.y, duration: Math.max(520, duration * .32), ease: "Quad.easeIn", onComplete: () => { tail.destroy(); meteor.destroy(); impact(); } });
          return;
        }
        if (effect.energy === "lightning") {
          const bolt = this.add.graphics().setBlendMode(Phaser.BlendModes.ADD);
          const drawBolt = (offset: number, width: number, alpha: number) => {
            bolt.lineStyle(width, offset ? color : 0xffffff, alpha);
            let x = position.x + offset;
            let y = -40;
            bolt.beginPath().moveTo(x, y);
            while (y < position.y) { x += Phaser.Math.Between(-19, 19); y += Phaser.Math.Between(22, 42); bolt.lineTo(x, Math.min(y, position.y)); }
            bolt.strokePath();
          };
          drawBolt(0, 4.8, 1); drawBolt(-28, 2.1, .74); drawBolt(28, 2.1, .74);
          this.cameras.main.flash(reduced ? 1 : 110, 255, 235, 145, false);
          // Hold the residual electrical arc long enough to read in a LIVE
          // capture, then let it flicker out before the impact shockwave.
          this.tweens.add({ targets: bolt, alpha: 0, delay: Math.max(820, duration * .42), duration: Math.max(420, duration * .16), ease: "Steps(3)", onComplete: () => { bolt.destroy(); impact(); } });
          return;
        }
        if (effect.energy === "vortex") {
          const vortex = this.add.container(position.x, position.y);
          [1, .72, .45].forEach((scale, index) => {
            const ring = this.add.ellipse(0, 0, 118 * scale, 34 * scale).setStrokeStyle(2.5, color, .88).setFillStyle(color, .025).setAngle(index * 60);
            vortex.add(ring);
          });
          const core = this.add.circle(0, 0, 9, 0xfff5b3, 1).setStrokeStyle(2, color, 1);
          vortex.add(core);
          vfx.particles.seeds(`${effect.id}-vortex`, particles, 78).slice(0, 28).forEach((seed, index) => {
            const orb = pooledParticles.acquire().setPosition(position.x + seed.x, position.y + seed.y).setRadius(Math.max(1.4, seed.size * .72)).setFillStyle(index % 4 ? color : 0xffffff, .9).setBlendMode(Phaser.BlendModes.ADD).setVisible(true).setAlpha(1);
            this.tweens.add({ targets: orb, x: position.x, y: position.y, alpha: 0, scale: .15, delay: seed.delay * .5, duration: Math.max(820, duration * .35), ease: "Cubic.easeIn", onComplete: () => pooledParticles.release(orb) });
          });
          this.tweens.add({ targets: vortex, angle: 720, scale: 1.15 + effect.intensity * .22, duration: Math.max(1100, duration * .62), ease: "Cubic.easeInOut" });
          this.tweens.add({ targets: core, scale: 2.2, alpha: .2, yoyo: true, repeat: 2, duration: 260 });
          this.time.delayedCall(Math.max(880, duration * .62), () => { vortex.destroy(); impact(); });
          return;
        }
        // Starfall uses many independent procedural trajectories, never video/GIF assets.
        const stars = Math.min(20, Math.max(7, Math.round(12 * effect.density)));
        let completed = 0;
        for (let i = 0; i < stars; i++) {
          const start = { x: position.x + Phaser.Math.Between(-160, 160), y: position.y - Phaser.Math.Between(110, 300) };
          const streak = this.add.line(start.x, start.y, -22, -34, 0, 0, i % 4 ? color : 0xffffff, .92).setLineWidth(2.6).setBlendMode(Phaser.BlendModes.ADD);
          this.tweens.add({ targets: streak, x: position.x + Phaser.Math.Between(-54, 54), y: position.y + Phaser.Math.Between(-38, 38), alpha: 0, delay: i * 72, duration: 570, ease: "Quad.easeIn", onComplete: () => { streak.destroy(); if (++completed === stars) impact(); } });
        }
      }
      showEffect(e: State["effects"][number], _s: State) {
        const province = provinces.find((p) => p.id === e.province);
        if (!province) return;
        active++;
        const position = project(province.center);
        const color = e.kind === "complete" ? 0xffffff : e.kind === "super" ? 0xff5f21 : e.kind === "chest" ? 0x8b5cff : e.kind === "spread" ? 0x42e7d5 : 0xffcf43;
        const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
        if (!reduced) this.focusEvent(position, e.kind);
        const capture = e.kind === "capture";
        const superLight = e.kind === "super";
        const chest = e.kind === "chest";
        const combo = e.kind === "combo";
        const spread = e.kind === "spread";
        const complete = e.kind === "complete";
        const lighting = e.kind === "light";
        const gathering = e.kind === "gather";
        // Both views receive gameplay effects through the same bounded VFX
        // queue. Map 1 consumes this job here; Map 2 consumes it in SVG.
        const job = vfx.enqueue(e) ? vfx.next() : undefined;
        const energy = job?.energy;
        if (job && energy) this.epicEnergy(position, job);
        else if (job && (capture || superLight || chest || complete)) this.goldenAwakening(province, position, job);
        this.flashProvince(province, color, capture || superLight);
        const finish = () => {
          active--;
        };
        const ring = this.add.circle(position.x, position.y, 7, color, 0.22).setStrokeStyle(2.5, color, 1);
        const label = this.add
          .text(position.x, position.y - 4, energy === "meteor" ? "☄ THIÊN THẠCH ÁNH SÁNG" : energy === "lightning" ? "ϟ THIÊN LÔI GIÁNG XUỐNG" : energy === "vortex" ? "◎ XOÁY NĂNG LƯỢNG" : energy === "starfall" ? "✦ MƯA SAO ÁNH SÁNG" : complete ? "✦ VIỆT NAM BỪNG SÁNG ✦\nHOÀN THÀNH TOÀN BẢN ĐỒ" : superLight ? `☄ SIÊU THẮP SÁNG\n${e.player}` : chest ? `🎁 RƯƠNG ÁNH SÁNG\nMỐC ${e.power} TỈNH` : combo ? `✦ COMBO!\n${e.player} +${e.power}` : spread ? "≈ ÁNH SÁNG LAN TỎA" : capture ? `✦ ${e.player}\nTHẮP SÁNG` : gathering ? `✦ ${e.player}\nCÙNG THẮP` : lighting ? `+${e.power} ÁNH SÁNG` : `${e.kind === "heal" ? "+" : "✦"}${e.power}`, {
            fontFamily: "Arial Black, sans-serif",
            fontSize: complete || superLight || chest || combo || capture ? "14px" : "12px",
            align: "center",
            color: "#ffffff",
            stroke: "#09122b",
            strokeThickness: 4,
          })
          .setOrigin(0.5);
        const lightPlayer = () => {
          if (!capture && !gathering) return;
          const card = this.add.container(position.x + 28, position.y - 27).setScale(0.25).setAlpha(0);
          const halo = this.add.circle(0, 0, 15, 0xffc83d, 0.22);
          const avatar = this.add.circle(0, 0, 9, 0x17284a, 1).setStrokeStyle(2, 0xffed9a, 1);
          const initial = this.add.text(0, 0, e.player.slice(0, 1).toUpperCase(), { fontFamily: "Arial Black, sans-serif", fontSize: "9px", color: "#fff6c1" }).setOrigin(0.5);
          const name = e.player.length > 12 ? `${e.player.slice(0, 11)}…` : e.player;
          const city = province.name.length > 14 ? `${province.name.slice(0, 13)}…` : province.name;
          const plate = this.add.rectangle(39, -2, Math.max(70, name.length * 6.4 + 25), 27, 0xffe485, 0.98).setStrokeStyle(1, 0xffffff, 0.72);
          const text = this.add.text(39, -6, name, { fontFamily: "Arial Black, sans-serif", fontSize: "8px", color: "#3d2400" }).setOrigin(0.5);
          const subtext = this.add.text(39, 5, `${gathering ? "CÙNG THẮP" : "THẮP"} ${city.toUpperCase()}`, { fontFamily: "Arial, sans-serif", fontStyle: "bold", fontSize: "5.5px", color: "#7b4800" }).setOrigin(0.5);
          card.add([plate, text, subtext, halo, avatar, initial]);
          this.tweens.add({ targets: card, alpha: 1, scale: 1, y: card.y - 7, duration: 340, ease: "Back.easeOut" });
          this.tweens.add({ targets: halo, scale: 1.8, alpha: 0, delay: 180, duration: 900, ease: "Sine.easeOut" });
          this.time.delayedCall(2600, () => this.tweens.add({ targets: card, alpha: 0, y: card.y - 8, duration: 350, onComplete: () => card.destroy() }));
        };
        const explode = () => {
          this.burst(position, color, complete ? 70 : superLight ? 48 : chest ? 32 : spread ? 18 : capture ? 26 : gathering ? 16 : lighting ? 14 : 11, complete ? 210 : superLight ? 128 : chest ? 95 : spread ? 62 : capture ? 78 : gathering ? 48 : lighting ? 43 : 36);
          this.tweens.add({ targets: ring, scale: superLight ? 20 : chest ? 15 : capture ? 13 : gathering ? 8 : lighting ? 6.8 : 5.2, alpha: 0, duration: superLight ? 1700 : chest ? 1450 : capture ? 1280 : gathering ? 900 : lighting ? 720 : 540, ease: "Cubic.easeOut", onComplete: () => ring.destroy() });
          this.tweens.add({ targets: label, y: position.y - (superLight ? 80 : capture ? 62 : 32), alpha: 0, duration: superLight ? 2100 : chest ? 1700 : capture ? 1500 : 760, ease: "Cubic.easeOut", onComplete: () => { label.destroy(); finish(); } });
          if (!reduced) {
            this.cameras.main.shake(superLight ? 210 : capture ? 120 : 60, superLight ? 0.005 : capture ? 0.0025 : 0.0015);
          if (capture || superLight || complete) this.cameras.main.flash(complete ? 280 : superLight ? 180 : 95, 255, 224, 123, false);
          }
          if (capture || gathering) {
            [120, 250].forEach((delay, index) => this.time.delayedCall(delay, () => {
              const wave = this.add.circle(position.x, position.y, 10, 0xffed83, 0.08).setStrokeStyle(2, 0xffd34c, 0.76 - index * 0.18);
              this.tweens.add({ targets: wave, scale: 8 + index * 2, alpha: 0, duration: 920, ease: "Cubic.easeOut", onComplete: () => wave.destroy() });
            }));
            lightPlayer();
          }
        };
        if (energy) {
          this.time.delayedCall(reduced ? 1 : Math.min(1500, Math.max(620, job?.duration ?? 1000)), explode);
        } else if (superLight || chest || combo || complete) {
          // The old full-height rectangle read as a flat orange slab on a
          // portrait stream. The beacon is now rendered by Golden Awakening;
          // this is only its focused impact core before the burst.
          const flare = this.add.circle(position.x, position.y, 7, color, 0.94).setBlendMode(Phaser.BlendModes.ADD);
          this.tweens.add({ targets: flare, scale: superLight ? 8 : 5, alpha: 0, duration: reduced ? 1 : superLight ? 720 : 520, ease: "Cubic.easeOut", onComplete: () => flare.destroy() });
          this.time.delayedCall(reduced ? 1 : superLight ? 650 : 460, explode);
        } else if (e.kind === "attack") {
          const angle = Phaser.Math.FloatBetween(0, Math.PI * 2);
          const start = { x: position.x + Math.cos(angle) * 170, y: position.y + Math.sin(angle) * 170 };
          const comet = this.add.circle(start.x, start.y, 5, 0xfff4ab, 1).setStrokeStyle(1.5, 0xffffff, 0.9);
          const tail = Array.from({ length: 5 }, (_, i) => this.add.circle(start.x - i * 7, start.y + i * 7, 8 - i, 0xffb52e, 0.34 - i * 0.05));
          this.tweens.add({ targets: [comet, ...tail], x: position.x, y: position.y, duration: reduced ? 1 : 430, ease: "Quad.easeIn", onComplete: () => { comet.destroy(); tail.forEach((part) => part.destroy()); explode(); } });
        } else {
          if (capture || lighting) {
            // Mỗi comment thả một ngọn đèn; đèn cuối cùng mở cảnh thắp sáng cận cảnh.
            const lantern = this.add.container(
              Phaser.Math.Clamp(position.x + Phaser.Math.Between(-125, 125), 24, 676),
              -26,
            );
            const glow = this.add.circle(0, 0, 19, 0xffb72e, 0.17);
            const body = this.add.ellipse(0, 0, 15, 22, 0xffa51d, 1).setStrokeStyle(1.5, 0xffec91, 1);
            const core = this.add.ellipse(0, 0, 6, 13, 0xffffbe, 0.96);
            const cap = this.add.rectangle(0, -12, 7, 2, 0x7d3f0b, 1);
            const tassel = this.add.line(0, 14, 0, 0, 0, 7, 0xffdb72, 0.9).setLineWidth(1.2);
            lantern.add([glow, body, core, cap, tassel]);
            this.tweens.add({ targets: lantern, x: position.x, y: position.y - 2, rotation: Phaser.Math.FloatBetween(-0.13, 0.13), duration: reduced ? 1 : capture ? 1250 : 760, ease: "Sine.easeInOut", onComplete: () => {
              lantern.destroy();
              const flash = this.add.circle(position.x, position.y, 12, 0xfff3a2, 0.85);
              this.tweens.add({ targets: flash, scale: capture ? 8 : 4.5, alpha: 0, duration: capture ? 720 : 460, ease: "Cubic.easeOut", onComplete: () => flash.destroy() });
              explode();
            }});
            this.tweens.add({ targets: lantern, angle: 5, duration: 720, yoyo: true, repeat: -1, ease: "Sine.easeInOut" });
            return;
          }
          explode();
        }
      }
      update() {
        const s = latest.current;
        const key = JSON.stringify([s.settings.map, s.territories]);
        if (key !== previous) {
          previous = key;
          graphics.clear();
          if (s.settings.map !== "cyber-grid") {
            // Map 1: the original clean tactical Vietnam view. It is kept
            // separate from Map 2's terrain material, while using the same
            // exact province geometry, state and interactions.
            for (const p of provinces) {
              const territory = s.territories.find((item) => item.id === p.id);
              const lit = Boolean(territory?.owner);
              const progress = Phaser.Math.Clamp(1 - (territory?.hp ?? s.settings.hp) / s.settings.hp, 0, 1);
              const base = Phaser.Display.Color.IntegerToColor(0x10294a);
              const warm = Phaser.Display.Color.IntegerToColor(0xe6a51f);
              const lerp = (from: number, to: number) => Math.round(from + (to - from) * progress);
              const fill = lit ? 0xffc83d : Phaser.Display.Color.GetColor(
                lerp(base.red, warm.red),
                lerp(base.green, warm.green),
                lerp(base.blue, warm.blue),
              );
              graphics.fillStyle(fill, lit ? 0.96 : 0.88 + progress * 0.08);
              graphics.lineStyle(lit ? 4.4 : 1 + progress * 2.2, lit ? 0xe6a51f : 0x4e7196, lit ? 0.82 : 0.72 + progress * 0.2);
              for (const polygon of p.polygons) {
                const points = polygon[0].map(project);
                graphics.fillPoints(points, true);
                graphics.strokePoints(points, true);
              }
              if (lit) {
                graphics.lineStyle(1.15, 0xfff5a8, 0.96);
                for (const polygon of p.polygons) graphics.strokePoints(polygon[0].map(project), true);
              }
            }
          }
        }
        this.refreshMarkers(s);
        if (!effectsReady) {
          s.effects.forEach((e) => seen.add(e.id));
          effectsReady = true;
          return;
        }
        for (const e of s.effects) {
          if (seen.has(e.id)) continue;
          seen.add(e.id);
          // Map 2 uses SVG clipping for both the dark and lit image. Canvas
          // effects have a different responsive transform, so do not render
          // a second, offset animation over the province. Its light change
          // above is the event feedback for this view.
          if (s.settings.map === "cyber-grid") continue;
          if (active >= 16) continue;
          this.showEffect(e, s);
        }
        if (seen.size > 3000) {
          seen.clear();
          s.effects.forEach((e) => seen.add(e.id));
        }
      }
    }
    const game = new Phaser.Game({
      type: Phaser.AUTO,
      parent: host.current!,
      width: 700,
      height: 820,
      transparent: true,
      scene: MapScene,
      scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
      render: { antialias: true },
      fps: { target: 60 },
    });
    return () => {
      scene.current = null;
      game.destroy(true);
    };
  }, [provinces]);
  return (
    <div className={`map-canvas ${state.settings.map === "cyber-grid" ? "terrain-mode" : ""}`} role="img" aria-label="Bản đồ lãnh thổ Việt Nam. Chọn tỉnh bằng bản đồ hoặc danh sách bên cạnh.">
      <ProvinceTerrain provinces={provinces} state={state} onSelect={onSelect} />
      <div ref={host} className="map-phaser-layer" />
    </div>
  );
}
