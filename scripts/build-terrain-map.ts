import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { resolve } from "node:path";

type Province = { id: string; name: string; polygons: number[][][][] };
const source = resolve("assets/maps/historical63.json");
const output = resolve("assets/terrain");
const provinces = JSON.parse(readFileSync(source, "utf8")) as Province[];

const width = 700;
const height = 820;
const project = ([lon, lat]: number[]) => ({
  x: (lon - 101.5) * 62 + 50,
  y: (24 - lat) * 49 + 20,
});
const pathFor = (rings: number[][][]) =>
  rings.map((ring) => ring.map((point, index) => {
    const { x, y } = project(point);
    return `${index === 0 ? "M" : "L"}${x.toFixed(2)} ${y.toFixed(2)}`;
  }).join(" ") + " Z").join(" ");

mkdirSync(output, { recursive: true });
const paths = provinces.flatMap((province) => province.polygons.map((polygon, index) =>
  `<path id="${province.id}-${index}" data-province="${province.id}" d="${pathFor(polygon)}" />`,
));
writeFileSync(resolve(output, "provinces.svg"), `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}"><g fill="#fff" stroke="#000" stroke-width="1">${paths.join("")}</g></svg>`);
writeFileSync(resolve(output, "provinces-mask.svg"), `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}"><rect width="100%" height="100%" fill="#000"/><g fill="#fff">${paths.join("")}</g></svg>`);
console.log(`Exported ${provinces.length} province records / ${paths.length} polygon paths.`);
