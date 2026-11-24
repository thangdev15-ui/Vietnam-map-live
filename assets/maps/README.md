# Dữ liệu bản đồ offline

- `historical63.json`: 63 tỉnh, thành Việt Nam.
- `merged34.json`: 34 tỉnh, thành theo cấu hình gộp.
- `southeast-asia.json`: 11 quốc gia Đông Nam Á, trích từ Natural Earth Admin 0 Countries 1:50m.
- `world.json`: 242 quốc gia/vùng lãnh thổ, trích từ cùng bộ dữ liệu.

Các file được renderer tải từ server theo `settings.map`; không có CDN hoặc ảnh nền dùng thay geometry. Chạy `node scripts/build-natural-earth-maps.mjs` sau khi cập nhật file nguồn `sources/natural-earth-50m-countries.geojson`. Natural Earth là dữ liệu public domain.
