import fs from "node:fs";
import pc from "polygon-clipping";
const raw = JSON.parse(fs.readFileSync("assets/maps/source.geojson", "utf8"));
const features = raw.features.map((f) => ({
  name: f.properties.shapeName
    .trim()
    .replace("Ho Chi Minh", "Hồ Chí Minh")
    .replace("Bà Rịa–Vũng Tàu", "Bà Rịa Vũng Tàu"),
  poly:
    f.geometry.type === "Polygon"
      ? [f.geometry.coordinates]
      : f.geometry.coordinates,
}));
const island = features.splice(
  features.findIndex((f) => f.name === "Côn Đảo"),
  1,
)[0];
const br = features.find((f) => f.name === "Bà Rịa Vũng Tàu");
br.poly = pc.union(br.poly, island.poly);
const norm = (s) =>
  s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-");
const convert = (f) => {
  const ring = [...f.poly].sort((a, b) => b[0].length - a[0].length)[0][0];
  return {
    id: norm(f.name),
    name: f.name,
    center: [
      ring.reduce((a, p) => a + p[0], 0) / ring.length,
      ring.reduce((a, p) => a + p[1], 0) / ring.length,
    ],
    polygons: f.poly,
  };
};
fs.writeFileSync(
  "assets/maps/historical63.json",
  JSON.stringify(features.map(convert)),
);
const groups = [
  ["Tuyên Quang", "Hà Giang"],
  ["Lào Cai", "Yên Bái"],
  ["Thái Nguyên", "Bắc Kạn"],
  ["Phú Thọ", "Vĩnh Phúc", "Hòa Bình"],
  ["Bắc Ninh", "Bắc Giang"],
  ["Hưng Yên", "Thái Bình"],
  ["Hải Phòng", "Hải Dương"],
  ["Ninh Bình", "Nam Định", "Hà Nam"],
  ["Quảng Trị", "Quảng Bình"],
  ["Đà Nẵng", "Quảng Nam"],
  ["Quảng Ngãi", "Kon Tum"],
  ["Gia Lai", "Bình Định"],
  ["Khánh Hòa", "Ninh Thuận"],
  ["Lâm Đồng", "Đắk Nông", "Bình Thuận"],
  ["Đắk Lắk", "Phú Yên"],
  ["Hồ Chí Minh", "Bình Dương", "Bà Rịa Vũng Tàu"],
  ["Đồng Nai", "Bình Phước"],
  ["Tây Ninh", "Long An"],
  ["Cần Thơ", "Sóc Trăng", "Hậu Giang"],
  ["Vĩnh Long", "Bến Tre", "Trà Vinh"],
  ["Đồng Tháp", "Tiền Giang"],
  ["Cà Mau", "Bạc Liêu"],
  ["An Giang", "Kiên Giang"],
];
const used = new Set(groups.flat());
const merged = groups.map((g) => ({
  name: g[0],
  poly: pc.union(
    ...g.map((n) => {
      const f = features.find((f) => f.name === n);
      if (!f) throw Error(n);
      return f.poly;
    }),
  ),
}));
merged.push(
  ...features
    .filter((f) => !used.has(f.name))
    .map((f) => ({ ...f, name: f.name === "Thừa Thiên Huế" ? "Huế" : f.name })),
);
if (features.length !== 63 || merged.length !== 34)
  throw Error("Invalid map count");
fs.writeFileSync(
  "assets/maps/merged34.json",
  JSON.stringify(merged.map(convert)),
);
