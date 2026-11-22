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
