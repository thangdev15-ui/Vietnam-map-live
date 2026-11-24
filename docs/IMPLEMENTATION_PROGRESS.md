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

## Epic VFX Engine — Phase 2 (đang nghiệm thu)

- Đã nối meteor, lightning, vortex và starfall vào cùng effect stream của gameplay: `super` → meteor, `capture` → lightning, `combo` → vortex, `chest/complete` → starfall.
- VFX Test Lab ở Admin/Mô phỏng gọi `POST /api/admin/vfx` có xác thực; event này chỉ thêm `effects`, không làm thay đổi điểm, HP hoặc chủ sở hữu tỉnh.
- Đã sửa Map 2 để dùng chính ID tỉnh từ server event thay vì suy luận từ territory delta. Việc này giữ camera và VFX cùng tọa độ của đúng tỉnh trong SVG transform.
- Bằng chứng visual hiện có: `docs/verification/phase2-terrain-meteor.png`, `phase2-terrain-lightning.png`, `phase2-terrain-vortex.png`, `phase2-warroom-vortex.png`.
- Kiểm tra gần nhất bằng Node 24: build, lint và 31 test (game/connector/server) đều qua. Còn cần nghiệm thu bằng mắt đầy đủ chuỗi 4 effect trên cả hai view trước khi đánh dấu VFX2-07 hoàn tất.
