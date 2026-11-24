import { useEffect, useRef } from "react";
import Phaser from "phaser";
import type { Province, State } from "../../../packages/shared/index";
import terrainSurface from "./assets/terrain-surface-v1.png";
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
function ProvinceTerrain({ provinces, state }: { provinces: Province[]; state: State }) {
  if (state.settings.map !== "cyber-grid") return null;
  const prefix = useRef(`province-terrain-${Math.random().toString(36).slice(2)}`).current;
  const territoryById = new Map(state.territories.map((territory) => [territory.id, territory]));
  return (
    <svg className="province-terrain" viewBox="0 0 700 820" aria-hidden="true">
      <defs>
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
    let previous = "";
    let markerSignature = "";
    let active = 0;
    let cameraReset: Phaser.Time.TimerEvent | undefined;
    let tourReset: Phaser.Time.TimerEvent | undefined;
    let effectsReady = false;
    let touring = 0;
    class MapScene extends Phaser.Scene {
      create() {
        scene.current = this;
        graphics = this.add.graphics();
        markers = this.add.container();
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
        const combo = kind === "combo";
        const lighting = kind === "light";
        const gathering = kind === "gather";
        camera.pan(position.x, position.y, superLight ? 720 : combo ? 480 : capture ? 560 : 360, "Cubic.easeOut");
        camera.zoomTo(superLight ? 2.55 : combo ? 1.8 : capture ? 2.28 : gathering ? 1.55 : lighting ? 1.28 : 1.35, superLight ? 720 : combo ? 480 : capture ? 560 : 360, "Cubic.easeOut");
        cameraReset = this.time.delayedCall(superLight ? 3500 : combo ? 1800 : capture ? 2900 : gathering ? 1700 : lighting ? 920 : 980, () => {
          camera.pan(350, 410, superLight ? 1200 : capture ? 980 : 460, "Sine.easeInOut");
          camera.zoomTo(1, superLight ? 1200 : capture ? 980 : 460, "Sine.easeInOut");
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
        this.flashProvince(province, color, capture || superLight);
        const finish = () => {
          active--;
        };
        const ring = this.add.circle(position.x, position.y, 7, color, 0.22).setStrokeStyle(2.5, color, 1);
        const label = this.add
          .text(position.x, position.y - 4, complete ? "✦ VIỆT NAM BỪNG SÁNG ✦\nHOÀN THÀNH TOÀN BẢN ĐỒ" : superLight ? `☄ SIÊU THẮP SÁNG\n${e.player}` : chest ? `🎁 RƯƠNG ÁNH SÁNG\nMỐC ${e.power} TỈNH` : combo ? `✦ COMBO!\n${e.player} +${e.power}` : spread ? "≈ ÁNH SÁNG LAN TỎA" : capture ? `✦ ${e.player}\nTHẮP SÁNG` : gathering ? `✦ ${e.player}\nCÙNG THẮP` : lighting ? `+${e.power} ÁNH SÁNG` : `${e.kind === "heal" ? "+" : "✦"}${e.power}`, {
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
        if (superLight || chest || combo || complete) {
          const beam = this.add.rectangle(position.x, -20, 14, 44, color, 0.9).setBlendMode(Phaser.BlendModes.ADD);
          this.tweens.add({ targets: beam, y: position.y, scaleX: complete ? 15 : superLight ? 8 : combo ? 6 : 5, scaleY: complete ? 34 : superLight ? 20 : combo ? 17 : 14, alpha: 0, duration: reduced ? 1 : complete ? 1300 : superLight ? 900 : 700, ease: "Quad.easeIn", onComplete: () => { beam.destroy(); explode(); } });
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
    <div className="map-canvas" role="img" aria-label="Bản đồ lãnh thổ Việt Nam. Chọn tỉnh bằng bản đồ hoặc danh sách bên cạnh.">
      <ProvinceTerrain provinces={provinces} state={state} />
      <div ref={host} className="map-phaser-layer" />
    </div>
  );
}
