# Triển khai Render trên tài khoản mới

`render.yaml` ở thư mục gốc đã là Blueprint cho backend duy nhất của game. Render chạy API, Socket.IO, TikTok Live, SQLite tạm và Edge TTS; Cloudflare Pages chỉ chạy giao diện tĩnh.

## Tạo backend

1. Đăng nhập tài khoản Render mới và kết nối GitHub với repo `thangdev15-ui/Vietnam-map-live`.
2. Chọn **New → Blueprint**, chọn repo và branch `main`.
3. Render đọc `render.yaml`. Giữ service web Node ở Singapore, plan `free`, build `npm ci && npm run build`, start `npm start`, health check `/api/health`.
4. Nhấn **Apply** rồi đợi deploy hoàn tất. Mở `https://<ten-service>.onrender.com/api/health`; phải nhận JSON trạng thái khỏe.
5. Trong Environment, thêm lại giá trị bí mật TikTok hiện có vào `TIKTOK_SIGN_API_KEY` nếu sẽ kết nối live thật. Không dán biến này vào Cloudflare hoặc GitHub.

`ADMIN_TOKEN` được Blueprint tạo ngẫu nhiên khi tạo service. Lưu token đó ở trình quản lý mật khẩu để đăng nhập `/admin`; đừng dùng token cũ nếu Render tạo token mới.

## Kết nối Cloudflare Pages

Sau khi backend có URL mới, tạo Pages theo [`CLOUDFLARE_PAGES.md`](./CLOUDFLARE_PAGES.md). Trong Pages đặt:

```text
VITE_API_ORIGIN=https://<ten-service>.onrender.com
```

Sau khi Pages tạo URL production, quay lại Render và đặt:

```text
CORS_ORIGINS=https://<ten-project>.pages.dev
```

Redeploy Render rồi redeploy Pages một lần. Cả hai URL phải không có dấu `/` ở cuối.

## Lưu ý vận hành free plan

`DATABASE_PATH=/tmp/game.sqlite` là storage tạm của free web service: dữ liệu trận và cache MP3 có thể mất khi instance restart/redeploy. Đây là hành vi có sẵn của cấu hình cũ, không phải Cloudflare gây ra. Trước livestream quan trọng, khởi động trận mới và kiểm tra `/api/health`.

Nếu đổi domain Pages, cập nhật cả `VITE_API_ORIGIN` (chỉ khi backend URL đổi) và `CORS_ORIGINS` (khi Pages domain đổi). Preview Pages sẽ không gọi được API cho đến khi origin preview được thêm tạm thời vào `CORS_ORIGINS`.
