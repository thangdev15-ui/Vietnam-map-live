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


## MC voice miễn phí — 2026-11-25

- Thay FPT.AI bằng `node-edge-tts` chạy trong Node 24 của Render, mặc định `vi-VN-HoaiMyNeural`; không dùng API key hoặc Voice ID.
- Backend tạo MP3 theo câu nói, dedupe request đang tạo và cache RAM sáu giờ (giới hạn 24 MB).
- Frontend xếp hàng lời dẫn, phát tuần tự và duck ambience; Web Speech chỉ là fallback nếu Edge TTS lỗi.
- Đã kiểm tra end-to-end cục bộ: POST `/api/tts` → polling GET → `200 audio/mpeg`, 22,032 bytes cho câu tiếng Việt.


## Broadcast cinematic director — 2026-11-25

- Thêm ribbon event realtime ở mép trên: player/avatar, loại event, tỉnh và điểm. Nó chỉ kích hoạt khi có effect mới, tự ẩn và không đặt popup ở tâm map.
- Thêm lớp khí quyển phía sau map, có `prefers-reduced-motion` để tắt animation.
- Leaderboard nay animate khi score/rank thật đổi; mục tiêu cộng đồng lấy trực tiếp từ số tỉnh đã chiếm (20/63 theo 32%, giới hạn theo số tỉnh).
- Kiểm tra Playwright với event lightning thật từ VFX Test Lab: `docs/verification/cinematic-director-live-event.png`.


## Engagement loop — 2026-11-25

- Tổ đội thắp sáng trong Broadcast đọc contributor thật của tỉnh đang chọn. Mọi action có ảnh hưởng (comment, attack/defense, gift) đều ghi người chơi vào contributor roster.
- Gift không phải super nay tạo effect `gift` riêng: giữ power/config admin, làm giảm HP và cộng điểm thật, đồng thời route VFX Starfall và director ribbon “QUÀ TIẾP SỨC”. Capture vẫn ưu tiên effect `capture`; Super vẫn dùng `super`.
- Broadcast hiển thị “Điểm nóng tiếp theo” là tỉnh chưa sáng có HP thấp nhất; đây chỉ là gợi ý từ state, không đổi target hay gameplay.
- Unit suite 35 tests pass, gồm assertion quà giảm HP, cộng điểm, tạo effect và có contributor.
- Visual proof: `docs/verification/engagement-gift-squad.png` với Minh Anh + Trâm cùng góp Hà Nội; API state xác nhận HP 10, gift power 40, points 65/25 và contributor roster.
