import fs from "node:fs";

const source = JSON.parse(fs.readFileSync("assets/maps/sources/natural-earth-50m-countries.geojson", "utf8"));
const normalize = (value) => value
  .normalize("NFD")
  .replace(/[\u0300-\u036f]/g, "")
  .toLowerCase()
  .replace(/đ/g, "d")
  .replace(/[^a-z0-9]+/g, "-")
  .replace(/^-|-$/g, "");
const polygons = (geometry) => geometry.type === "Polygon" ? [geometry.coordinates] : geometry.coordinates;
const center = (geometry) => {
  const points = polygons(geometry).flatMap((polygon) => polygon[0]);
  return [
    points.reduce((sum, [x]) => sum + x, 0) / points.length,
    points.reduce((sum, [, y]) => sum + y, 0) / points.length,
  ];
};
const vietnameseNames = {
  "Brunei": "Brunei", "Cambodia": "Campuchia", "Indonesia": "Indonesia", "Laos": "Lào",
  "Malaysia": "Malaysia", "Myanmar": "Myanmar", "Philippines": "Philippines", "Singapore": "Singapore",
  "Thailand": "Thái Lan", "Vietnam": "Việt Nam", "Timor-Leste": "Đông Timor", "East Timor": "Đông Timor",
};
const convert = (feature) => {
  const english = feature.properties.ADMIN;
  const name = vietnameseNames[english] ?? feature.properties.NAME_VI ?? english;
  const id = feature.properties.ADM0_A3 ?? normalize(english);
  return { id: `country-${normalize(id)}`, name, center: center(feature.geometry), polygons: polygons(feature.geometry) };
};
const countries = source.features
  .filter((feature) => feature.geometry?.type === "Polygon" || feature.geometry?.type === "MultiPolygon")
  .filter((feature) => feature.properties.ADM0_A3 !== "-99")
  .map(convert)
  .sort((a, b) => a.name.localeCompare(b.name, "vi"));
const seaNames = new Set(Object.keys(vietnameseNames));
const southeastAsia = source.features
  .filter((feature) => seaNames.has(feature.properties.ADMIN))
  .map(convert)
  .sort((a, b) => a.name.localeCompare(b.name, "vi"));
if (southeastAsia.length !== 11) throw new Error(`Expected 11 Southeast Asian countries, got ${southeastAsia.length}`);
if (countries.length < 150) throw new Error(`Expected world country dataset, got ${countries.length}`);
fs.writeFileSync("assets/maps/southeast-asia.json", JSON.stringify(southeastAsia));
fs.writeFileSync("assets/maps/world.json", JSON.stringify(countries));
fs.writeFileSync("assets/maps/natural-earth-metadata.json", JSON.stringify({
  source: "Natural Earth 1:50m Admin 0 Countries",
  license: "Public domain",
  sourceFile: "sources/natural-earth-50m-countries.geojson",
  generatedAt: new Date().toISOString(),
  southeastAsiaCountries: southeastAsia.length,
  worldCountries: countries.length,
}, null, 2));
