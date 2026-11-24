# Tiến độ triển khai

Ngày cập nhật: 2026-11-24

- Commit `b2ca36e`: vòng bình chọn map/skin realtime, countdown server, chọn tay, pause/resume.
- Commit `8b444d4`: chuyển 3 lựa chọn thành skin trên cùng dữ liệu 63 tỉnh; thêm super light, rương ánh sáng và hiệu ứng Phaser tương ứng.
- Kiểm tra gần nhất: `npm run lint`, `npm test` (28 tests), `npm run build` đều đạt trước khi tạo checklist.

## Việc kế tiếp

1. Hoàn thiện combo có thời hạn, phần thưởng cấu hình và HUD animation.
2. Thêm light spread là hiệu ứng tùy chọn, không tác động sở hữu lãnh thổ.
3. Hoàn thiện cinematic 100%, bảng top và kiểm tra broadcast ở 9:16/16:9.
4. Bổ sung test API admin `super-light` và migration settings cũ.
