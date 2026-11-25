# Triển khai Render (khuyến nghị)

Repository đã có `render.yaml` để đưa **cả game, admin, Socket.IO và backend** lên một URL. Dùng một Web Service duy nhất vì state trận và SQLite phải ở cùng tiến trình.

1. Vào [Render Dashboard](https://dashboard.render.com/), đăng nhập bằng GitHub, chọn **New → Blueprint** rồi chọn repo `thangdev15-ui/Vietnam-map-live`, branch `main`.
2. Render đọc `render.yaml`. Giữ region Singapore. Mặc định `TIKTOK_SIGN_MODE=community` để nhận TikTok LIVE bằng Euler Community, không cần `TIKTOK_SIGN_API_KEY`. Chỉ thêm key nếu chủ động chuyển mode sang `business`.
3. Bấm **Apply**. Khi trạng thái `Live`, mở URL `https://vietnam-map-live.onrender.com` mà Render cấp. Admin ở `/admin`, broadcast ở `/?broadcast=1`.
4. Lưu `ADMIN_TOKEN` trong phần Environment của service. Render tự sinh token này; dùng token đó để đăng nhập `/admin`.

## Giọng đọc MC miễn phí

Server tạo MP3 qua Microsoft Edge TTS bằng `vi-VN-HoaiMyNeural`, không cần API key hay Voice ID. Render chỉ cần runtime Node 24 hiện có. Có thể đổi giọng bằng `EDGE_TTS_VOICE` (ví dụ `vi-VN-NamMinhNeural`). MP3 được cache trong bộ nhớ sáu giờ theo nội dung câu nói; frontend phát tuần tự và chỉ dùng Web Speech API làm fallback khi dịch vụ giọng đọc lỗi.

Blueprint hiện dùng gói **Free**, không cần thẻ. Dữ liệu SQLite đặt ở `/tmp/game.sqlite`, nên chỉ phù hợp để demo: dữ liệu trận mất khi Render restart, redeploy hoặc tự ngủ sau 15 phút không có truy cập. Khi cần chạy LIVE thật, đổi sang gói trả phí và thêm persistent disk, rồi đặt `DATABASE_PATH=/var/data/game.sqlite`. Không chuyển service SQLite này thành nhiều instance.

Sau mỗi lần `git push origin main`, Render sẽ tự build và deploy lại. Kiểm tra `https://<ten-service>.onrender.com/api/health` phải trả về `{ "ok": true }`.

# Triển khai VPS

Một Node process sở hữu game state; không chạy nhiều replica với SQLite này. Cần Node 24+, dung lượng ghi được, reverse proxy HTTPS.

1. Copy repo gồm `assets/maps`, `package-lock.json`; không copy `.env` máy local.
2. `npm ci && npm run build`.
3. Tạo `.env` theo mẫu, token ngẫu nhiên riêng, `HOST=127.0.0.1`, `PORT=3001`, `DATABASE_PATH=/var/lib/vietnam-game/game.sqlite`.
4. `npm run db:migrate`, `npm start` từ root repo. Dùng systemd hoặc process manager tự restart với WorkingDirectory chính xác.
5. Reverse proxy domain HTTPS đến localhost:3001, hỗ trợ WebSocket Upgrade, timeout đọc > 60 giây. Không cache `/api` và `/socket.io`. Nếu bật trust proxy cho rate-limit, chỉ cấu hình đúng proxy đáng tin; mặc định ứng dụng không tin X-Forwarded-For.
6. Firewall chỉ công khai 443/80 cần thiết; không công khai 3001. Giới hạn đường dẫn `/admin` và `/api/admin` bằng VPN/IP hoặc lớp xác thực proxy bổ sung nếu vận hành Internet.
7. Backup SQLite bằng SQLite backup API hoặc dừng process trước khi copy DB; WAL có thể chứa dữ liệu chưa checkpoint nên không chỉ copy file chính khi đang chạy.
8. Khi cập nhật: dừng process, backup, cài deps/build/migrate, chạy lại, kiểm tra `/api/health` và reconnect client.

Các giới hạn: queue RAM chưa durable; chưa có nhiều admin role; token dùng chung; không có distributed locking; lịch sử/log cần chính sách lưu trữ vận hành. Không tuyên bố sẵn sàng cho lượng khán giả lớn khi chưa stress/soak trên hạ tầng đích.
