# Trạng thái kiểm thử

Ngày kiểm tra: 18/11/2026 (Asia/Ho_Chi_Minh).

## Đã xác nhận

- `npm test`: 19/19 bài test đạt. Phạm vi gồm luật game, chiếm và phòng thủ tỉnh, quà tặng, chuẩn hóa tiếng Việt, chống trùng, chống spam, SQLite persistence, Socket.IO reconnect, adapter TikTok mock, 1.000 người chơi và dữ liệu bản đồ 63/34.
- `npm run lint`: đạt.
- `npm run build`: đạt với Vite 8.3.8 và bundle production backend.
- `npm start`: đã chạy bản production và trả `200` từ `/api/health`.
- Browser QA: Broadcast ở `1920×1080`, map 63 vùng, Socket.IO và mô phỏng 100 người / 300 sự kiện. Sau mô phỏng, trạng thái ghi nhận 300 sự kiện và 63 vùng có chủ.
- Runtime browser chỉ có log thông tin từ React/Phaser, không có lỗi console.

## Chưa thể xác nhận trong workspace

- TikTok LIVE thật: cần username đang LIVE và quyền sử dụng hợp lệ của chủ tài khoản. Adapter chỉ được xem là tích hợp thành công sau checklist trong `LIVE.md`.
- Soak test dài hạn, tải thật, FPS/CPU trên máy phát và VPS đích.

## Dependency audit

`npm audit --omit=dev` còn báo 3 high findings, tất cả bắt nguồn từ GHSA-fc5q-39xc-vjpf trong `picomatch` qua Vite/tinyglobby. Workspace đã dùng Vite 8.3.8 và picomatch 4.0.7, là bản mới nhất registry trả về trong lần kiểm tra. Advisory hiện áp dụng đến `<=4.0.7`; npm không có bản vá nâng cấp an toàn. Không dùng `npm audit fix --force` vì đề xuất của npm là hạ Vite xuống 6.2.7 và không giải quyết một cách đáng tin cậy. Cần theo dõi advisory và nâng picomatch/Vite khi upstream phát hành bản vá.
