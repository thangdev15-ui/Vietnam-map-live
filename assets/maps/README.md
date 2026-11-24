# Dữ liệu bản đồ Việt Nam offline

- `historical63.json`: 63 tỉnh, thành Việt Nam.
- `merged34.json`: 34 tỉnh, thành theo cấu hình gộp.

Cả ba chế độ **Địa hình**, **Vệ tinh** và **Chiến thuật** đều nạp một trong hai file này. Chế độ hiển thị chỉ thay đổi pipeline dựng Phaser; không thay polygon, ID, territory, điểm hay dữ liệu TikTok.

Nguồn geometry Việt Nam và ghi chú attribution được lưu ở `source-metadata.json`. Không có dữ liệu Đông Nam Á hoặc Thế giới trong runtime.
