# Triển khai Render (khuyến nghị)

Repository đã có `render.yaml` để đưa **cả game, admin, Socket.IO và backend** lên một URL. Dùng một Web Service duy nhất vì state trận và SQLite phải ở cùng tiến trình.

1. Vào [Render Dashboard](https://dashboard.render.com/), đăng nhập bằng GitHub, chọn **New → Blueprint** rồi chọn repo `thangdev15-ui/Vietnam-map-live`, branch `main`.
2. Render đọc `render.yaml`. Giữ region Singapore. Nhập `TIKTOK_SIGN_API_KEY` khi được hỏi nếu muốn nhận TikTok LIVE thật; để trống nếu chỉ chạy mô phỏng.
3. Bấm **Apply**. Khi trạng thái `Live`, mở URL `https://vietnam-map-live.onrender.com` mà Render cấp. Admin ở `/admin`, broadcast ở `/?broadcast=1`.
4. Lưu `ADMIN_TOKEN` trong phần Environment của service. Render tự sinh token này; dùng token đó để đăng nhập `/admin`.

`DATABASE_PATH` được đặt ở `/var/data/game.sqlite`, một persistent disk 1 GB. Disk giữ dữ liệu qua restart/deploy; Render yêu cầu gói trả phí cho persistent disk. Không chuyển service này thành nhiều instance vì SQLite chỉ có một file dữ liệu.

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
