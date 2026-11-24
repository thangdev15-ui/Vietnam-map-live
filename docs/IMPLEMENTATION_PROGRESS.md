# Tiến độ triển khai

Ngày cập nhật: 2026-11-24

- Commit `b2ca36e`: vòng bình chọn map/skin realtime, countdown server, chọn tay, pause/resume.
- Commit `8b444d4`: chuyển 3 lựa chọn thành skin trên cùng dữ liệu 63 tỉnh; thêm super light, rương ánh sáng và hiệu ứng Phaser tương ứng.
- Kiểm tra gần nhất: `npm run lint`, `npm test` (28 tests), `npm run build` đều đạt trước khi tạo checklist.
- Combo hiện có cửa sổ thời gian, ngưỡng và điểm thưởng chỉnh trong Admin; game engine tự hết combo và phát event/map HUD. Light spread là effect cấu hình được, chỉ chiếu sáng đồ họa các vùng gần nhất, không thay đổi chủ sở hữu. `npm test` hiện có 30 tests đạt.
- Khi mọi tỉnh sáng với luật thắng 100%, engine tạo cinematic `complete` trước khi kết thúc trận. API admin Super Light được kiểm thử cả xác thực lẫn effect. `npm test` hiện có 32 tests đạt.
- Broadcast có panel hoàn thành toàn bản đồ và Top 3 đóng góp; match ended tiếp tục được ghi vào SQLite bởi game loop.

## Việc kế tiếp

1. Kiểm tra broadcast ở 9:16/16:9 với screenshot thực tế.
2. Bổ sung test migration settings cũ.
