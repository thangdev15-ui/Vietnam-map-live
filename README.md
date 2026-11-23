# VIỆT NAM ĐẠI CHIẾN

Game lãnh thổ tương tác LIVE: React + TypeScript + Vite + Tailwind + Phaser 3; Express + Socket.IO; SQLite tích hợp Node 24. Backend quyết định toàn bộ chiến đấu. Có simulator độc lập, quản trị xác thực và adapter TikTok thật; **chưa kiểm thử với phiên TikTok LIVE thật**.

## Chạy trên macOS

Cần Node.js 24 LTS, npm. Nếu dùng nvm: `nvm install 24 && nvm use 24`.

```sh
bash scripts/start.sh
```

Script cài dependencies nếu thiếu, tạo `.env` với token ngẫu nhiên nếu chưa tồn tại, migration/seed, khởi động cả hai server. Lần đầu đã có `.env` được tạo riêng trên máy này; token không nằm trong source hoặc bundle frontend.

- Chiến trường: http://127.0.0.1:5173/
- Quản trị: http://127.0.0.1:5173/admin
- Broadcast: http://127.0.0.1:5173/?broadcast=1
- Backend: http://127.0.0.1:3001/api/health

Mở `.env` tại máy, sao chép `ADMIN_TOKEN` vào màn hình đăng nhập. Token chỉ giữ trong bộ nhớ trang, tải lại phải đăng nhập lại. Không nhập token vào URL, không đưa trang quản trị lên livestream. Không chia sẻ `.env`.

Cài thủ công: `npm ci`, sao chép `.env.example` thành `.env` và đặt token ngẫu nhiên ít nhất 24 ký tự, `npm run db:migrate`, `npm run dev`.

Để kết nối TikTok LIVE thật, thêm `TIKTOK_SIGN_API_KEY` vào `.env`. Khóa này lấy từ Euler Stream, dịch vụ ký mà `tiktok-live-connector` 2.5.0 sử dụng; sau khi lưu file cần khởi động lại backend. Khóa chỉ nằm trên máy chủ, không nhập vào giao diện quản trị.

Để phát lời đọc khi có thành phố được thắp sáng, đặt `ELEVENLABS_API_KEY` và `ELEVENLABS_VOICE_ID` trong `.env` hoặc Environment của Render. Chọn voice tiếng Việt và lấy Voice ID trong ElevenLabs; bấm **BẬT ÂM** trên broadcast một lần để trình duyệt được phép phát tiếng.

## Chơi thử ngay

1. Admin → Tổng quan → Bắt đầu trận mới.
2. Mô phỏng → username tùy chọn → gửi comment `đỏ` (hoặc `xanh`, `vàng`).
3. Đợi 1,2 giây, gửi `đánh hà nội`. 4 đòn mặc định chiếm một tỉnh trung lập. Click tỉnh trên bản đồ hoặc chọn trong danh sách để xem phòng thủ.
4. Gửi gift `rose`, count 2 để tấn công mục tiêu đang chọn của người chơi; gửi `thủ hà nội` khi tỉnh cùng phe để hồi máu.
5. Nút mô phỏng tạo 100 người, tham gia phe rồi tấn công và tặng quà (300 sự kiện); người chơi demo có namespace tách TikTok.
6. Theo dõi ở cửa sổ chiến trường khác để xác nhận đồng bộ.

## Luật

Mỗi người chọn phe một lần/trận. Tấn công trừ máu, hết máu đổi chủ và hồi đầy. Phòng thủ chỉ áp dụng tỉnh cùng phe, không vượt máu tối đa. Tỉnh đang có chủ phản công gây hao phòng thủ một tỉnh của phe tấn công nhưng không tự chiếm. Hồi phục thụ động mỗi giây; like/follow/share tiếp viện tỉnh cùng phe đang thiếu máu. Gift có kỹ năng attack/heal/boost và sức mạnh cấu hình. Gift attack/heal dùng mục tiêu người chơi đã chọn bằng comment. Không có mục tiêu thì không gây sát thương.

Thắng khi đạt % lãnh thổ cấu hình hoặc sở hữu nhiều tỉnh nhất khi hết giờ; bằng nhau là hòa. Điểm đóng góp và combo reset mỗi trận. Danh sách khóa tồn tại qua trận mới. Combo hiện là số hành động chiến đấu hợp lệ trong trận, không nhân damage. Mọi cấu hình áp dụng ngoài trận để tránh đổi luật giữa chừng; bấm Kết thúc trận rồi lưu và bắt đầu lại.

## Các lệnh

```sh
npm run dev          # backend + frontend
npm run build        # strict TypeScript, build browser và server
npm start            # chạy production trên cổng 3001, gồm frontend
npm test             # logic, API, Socket.IO, adapter mock, stress
npm run lint
npm run db:migrate   # migration v1, idempotent
npm run db:seed      # seed mặc định, không ghi đè cấu hình hiện có
```

Production truy cập `/`, `/admin`, `/?broadcast=1` trên cổng 3001. Luôn chạy từ root repository để tìm assets/maps và .env.

## Kiến trúc

- `packages/shared`: schema Zod, kiểu dữ liệu, cấu hình và chuẩn hóa tiếng Việt.
- `packages/game-engine`: trạng thái và luật trận; không phụ thuộc Socket.IO/React.
- `packages/tiktok-connector`: LiveAdapter, TikTokLiveConnection, normalize sự kiện, reconnect có giới hạn và hủy retry.
- `apps/backend/src/processor.ts`: queue tối đa 5.000, drain 100/100 ms, cooldown, rate theo người, dedup pending + SQLite bền vững.
- `apps/backend/src/database.ts`: migration SQLite, WAL, trạng thái/settings, sự kiện và lịch sử trận. Event + snapshot được commit cùng transaction.
- `apps/backend/src/server.ts`: REST có token và rate limit; Socket.IO chỉ đọc, snapshot công khai chỉ giữ top 20 và không gửi user ID/lịch sử.
- `apps/frontend/src`: HUD, Phaser Map, Admin, API client. Broadcast ẩn điều khiển; màn hình responsive và reduced-motion.
- `assets/maps`: dữ liệu gốc, hai bộ chuẩn hóa và tài liệu giấy phép.

Giới hạn vận hành: tối đa 10.000 người/trận, 200 log gần nhất trong dashboard, 20 lịch sử trận gần nhất khi đọc, 30 hành động/người trong snapshot, 16 hiệu ứng đồng thời. SQLite lưu log không tự xóa để bảo toàn dedup; cần theo dõi dung lượng và lưu trữ/xóa DB giữa các chiến dịch khi không chạy. Queue chưa xử lý nằm trong RAM, có thể mất nếu tiến trình bị kill; sự kiện đã commit không được tính lại. Máy chủ tạm ngừng sẽ tiếp tục deadline cũ khi khởi động lại. Chưa đo tải LIVE dài hạn.

## TikTok và phát sóng

Đọc [hướng dẫn LIVE](docs/LIVE.md), [nguồn bản đồ](assets/maps/README.md), [triển khai](docs/DEPLOY.md), [kết quả kiểm thử](docs/STATUS.md).

Adapter sử dụng `tiktok-live-connector` **2.5.0**, API không chính thức, AGPL-3.0-only. Bản license đi kèm tại `docs/licenses`. Không thể khẳng định tính tương thích/được TikTok cho phép chỉ từ việc package cài được. Chưa xác nhận điều khoản áp dụng cho tài khoản và khu vực của bạn; xem tài liệu LIVE trước khi vận hành công khai. Chưa gọi bất kỳ tài khoản LIVE thật nào trong quá trình phát triển.
