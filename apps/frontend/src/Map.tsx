import { useEffect, useRef } from "react";
import Phaser from "phaser";
import type { Province, State } from "../../../packages/shared/index";
const project = ([x, y]: number[]) => ({
  x: (x - 101.5) * 62 + 50,
  y: (24 - y) * 49 + 20,
});
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
    let effectsReady = false;
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
        const lit = s.territories.filter((t) => t.owner);
        const key = lit.map((t) => t.id).join("|");
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
        const capture = kind === "capture";
        camera.pan(position.x, position.y, capture ? 270 : 200, "Sine.easeOut");
        camera.zoomTo(capture ? 1.52 : 1.27, capture ? 270 : 200, "Sine.easeOut");
        cameraReset = this.time.delayedCall(capture ? 1450 : 820, () => {
          camera.pan(350, 410, capture ? 460 : 330, "Sine.easeInOut");
          camera.zoomTo(1, capture ? 460 : 330, "Sine.easeInOut");
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
        const color = 0xffcf43;
        const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
        if (!reduced) this.focusEvent(position, e.kind);
        this.flashProvince(province, color, e.kind === "capture");
        const finish = () => {
          active--;
        };
        const ring = this.add.circle(position.x, position.y, 7, color, 0.22).setStrokeStyle(2.5, color, 1);
        const label = this.add
          .text(position.x, position.y - 4, e.kind === "capture" ? `✦ ${e.player}\nBẬT ĐÈN` : `${e.kind === "heal" ? "+" : "✦"}${e.power}`, {
            fontFamily: "Arial Black, sans-serif",
            fontSize: e.kind === "capture" ? "14px" : "12px",
            align: "center",
            color: "#ffffff",
            stroke: "#09122b",
            strokeThickness: 4,
          })
          .setOrigin(0.5);
        const explode = () => {
          this.burst(position, color, e.kind === "capture" ? 22 : 11, e.kind === "capture" ? 70 : 36);
          this.tweens.add({ targets: ring, scale: e.kind === "capture" ? 10 : 5.2, alpha: 0, duration: e.kind === "capture" ? 900 : 540, ease: "Cubic.easeOut", onComplete: () => ring.destroy() });
          this.tweens.add({ targets: label, y: position.y - (e.kind === "capture" ? 54 : 32), alpha: 0, duration: e.kind === "capture" ? 1200 : 760, ease: "Cubic.easeOut", onComplete: () => { label.destroy(); finish(); } });
          if (!reduced) {
            this.cameras.main.shake(e.kind === "capture" ? 170 : 75, e.kind === "capture" ? 0.004 : 0.0015);
            if (e.kind === "capture") this.cameras.main.flash(95, 255, 224, 123, false);
          }
        };
        if (e.kind === "attack") {
          const angle = Phaser.Math.FloatBetween(0, Math.PI * 2);
          const start = { x: position.x + Math.cos(angle) * 170, y: position.y + Math.sin(angle) * 170 };
          const comet = this.add.circle(start.x, start.y, 5, 0xfff4ab, 1).setStrokeStyle(1.5, 0xffffff, 0.9);
          const tail = Array.from({ length: 5 }, (_, i) => this.add.circle(start.x - i * 7, start.y + i * 7, 8 - i, 0xffb52e, 0.34 - i * 0.05));
          this.tweens.add({ targets: [comet, ...tail], x: position.x, y: position.y, duration: reduced ? 1 : 430, ease: "Quad.easeIn", onComplete: () => { comet.destroy(); tail.forEach((part) => part.destroy()); explode(); } });
        } else {
          if (e.kind === "capture") {
            const flash = this.add.circle(position.x, position.y, 12, 0xfff3a2, 0.85);
            this.tweens.add({ targets: flash, scale: 7, alpha: 0, duration: 600, ease: "Cubic.easeOut", onComplete: () => flash.destroy() });
          }
          explode();
        }
      }
      update() {
        const s = latest.current;
        const key = JSON.stringify(s.territories);
        if (key !== previous) {
          previous = key;
          graphics.clear();
          for (const p of provinces) {
            const t = s.territories.find((t) => t.id === p.id);
            const lit = Boolean(t?.owner);
            // Thành phố chưa có tương tác nằm tối; khi được thắp, lớp vàng và
            // viền trắng tạo cảm giác ánh sáng lan ra, không còn màu phe.
            graphics.fillStyle(lit ? 0xffc83d : 0x10294a, lit ? 0.96 : 0.88);
            graphics.lineStyle(lit ? 5 : 1, lit ? 0xffbd32 : 0x4e7196, lit ? 0.18 : 0.72);
            for (const polygon of p.polygons) {
              const points = polygon[0].map(project);
              graphics.fillPoints(points, true);
              graphics.strokePoints(points, true);
            }
            if (lit) {
              graphics.lineStyle(1.15, 0xfff5a8, 0.96);
              for (const polygon of p.polygons)
                graphics.strokePoints(polygon[0].map(project), true);
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
    <div
      ref={host}
      className="map-canvas"
      role="img"
      aria-label="Bản đồ lãnh thổ Việt Nam. Chọn tỉnh bằng bản đồ hoặc danh sách bên cạnh."
    />
  );
}
