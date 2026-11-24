# Checklist broadcast cinematic Việt Nam

| ID | Yêu cầu | Module | Điều kiện nghiệm thu | Trạng thái |
|---|---|---|---|---|
| ART-01 | Tạo nền địa hình Việt Nam 2.5D riêng, biển/mây/núi | `assets/broadcast` | Asset gốc, không dùng ảnh mẫu làm background | COMPLETED |
| ART-02 | Dựng broadcast dọc navy/vàng theo bố cục mẫu | `main.tsx`, `style.css` | HUD, bảng hạng, mục tiêu, CTA hiển thị | COMPLETED |
| ART-03 | Phủ polygon 63 tỉnh thật và trạng thái đèn lên terrain | `Map.tsx` | Comment làm sáng đúng tỉnh | COMPLETED |
| ART-04 | Camera/particle/glow/cinematic khi tỉnh sáng | `Map.tsx` | Sự kiện realtime tạo hiệu ứng | COMPLETED |
| ART-05 | Giữ TikTok/comment/quà/điểm/admin hiện tại | engine/backend | Regression test xanh | COMPLETED |
| ART-06 | Build, test và chụp ảnh thực tế để đối chiếu mẫu | tests/browser | Có ảnh `/tmp/vietnam-broadcast-final.png` và test xanh | COMPLETED |
