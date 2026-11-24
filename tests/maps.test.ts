import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import type { Province } from "../packages/shared/index";

const read = (name: string) => JSON.parse(readFileSync(`assets/maps/${name}`, "utf8")) as Province[];
const bounds = (regions: Province[]) => {
  const points = regions.flatMap((region) => region.polygons.flatMap((polygon) => polygon.flatMap((ring) => ring)));
  return [Math.min(...points.map(([x]) => x)), Math.min(...points.map(([, y]) => y)), Math.max(...points.map(([x]) => x)), Math.max(...points.map(([, y]) => y))];
};

describe("real multi-map geographic assets", () => {
  const vietnam = read("historical63.json");
  const southeastAsia = read("southeast-asia.json");
  const world = read("world.json");
  it("ships three distinct region datasets with unique IDs", () => {
    expect(vietnam).toHaveLength(63);
    expect(southeastAsia).toHaveLength(11);
    expect(world.length).toBeGreaterThan(150);
    expect(new Set(vietnam.map((p) => p.id)).size).toBe(vietnam.length);
    expect(new Set(southeastAsia.map((p) => p.id)).size).toBe(southeastAsia.length);
    expect(new Set(world.map((p) => p.id)).size).toBe(world.length);
    expect(southeastAsia.every((p) => p.id.startsWith("country-"))).toBe(true);
    expect(world.every((p) => p.id.startsWith("country-"))).toBe(true);
  });
  it("uses different geographic extents, not one Vietnam SVG with different colors", () => {
    const vn = bounds(vietnam);
    const sea = bounds(southeastAsia);
    const globe = bounds(world);
    expect(vn[2] - vn[0]).toBeLessThan(20);
    expect(sea[2] - sea[0]).toBeGreaterThan(40);
    expect(globe[2] - globe[0]).toBeGreaterThan(300);
    expect(globe[3] - globe[1]).toBeGreaterThan(120);
  });
});
