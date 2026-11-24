# Checklist nâng cấp “Thắp sáng Việt Nam”

## Nền tảng và dữ liệu

| ID | Yêu cầu | Module | Điều kiện nghiệm thu | Trạng thái |
|---|---|---|---|---|
| CORE-01 | Giữ Node/Express, Socket.IO, SQLite và connector hiện tại | toàn dự án | Không thay stack, build và test qua | COMPLETED |
| CORE-02 | Dùng dữ liệu vùng có thật | `assets/maps` | Mọi map dùng geometry offline có nguồn rõ ràng | COMPLETED |
| CORE-03 | Tách dữ liệu địa lý khỏi giao diện chiến trường | `shared`, `server`, `Map` | Renderer nạp đúng dữ liệu theo map ID | COMPLETED |

## Rebuild multi-map thực tế

| ID | Yêu cầu | Module | Điều kiện nghiệm thu | Trạng thái |
|---|---|---|---|---|
| MM-01 | Registry map chứa map ID, asset, keyword và metadata | `packages/shared`, `apps/backend` | Không hardcode CSS skin là map | COMPLETED |
| MM-02 | Việt Nam dùng 63/34 vùng theo cấu hình | `assets/maps/vietnam-*` | Chỉ vùng Việt Nam được chọn sáng | COMPLETED |
| MM-03 | Đông Nam Á dùng country polygons độc lập | `assets/maps/southeast-asia.json` | Có các quốc gia ASEAN geometry riêng | COMPLETED |
| MM-04 | Thế giới dùng country polygons độc lập | `assets/maps/world.json` | Hình dáng toàn cầu khác hẳn VN/SEA | COMPLETED |
| MM-05 | Chuyển map nạp geometry/state mới, fade và fit camera | server/renderer/socket | Không giữ hình dạng hay territory cũ | COMPLETED |
| MM-06 | Test asset, map switch, ID isolation, reload | `tests` | Có test tự động, ảnh thực tế đang chờ browser bridge | IN_PROGRESS |

## Broadcast và bản đồ

| ID | Yêu cầu | Module | Điều kiện nghiệm thu | Trạng thái |
|---|---|---|---|---|
| UI-01 | Broadcast dark navy / vàng / cyan, header và HUD dọc | `main.tsx`, `style.css` | Hiển thị portrait responsive | COMPLETED |
| UI-02 | Camera focus, đèn rơi, hạt sáng, avatar người góp ánh sáng | `Map.tsx` | Sự kiện comment/capture/gather tạo animation thật | COMPLETED |
| UI-03 | Ba map có hình học khác nhau | registry/assets/renderer | Vote đổi dữ liệu địa lý, không phải chỉ skin | IN_PROGRESS |
| UI-04 | Bố cục desktop 16:9 tối ưu livestream | `main.tsx`, `style.css` | Kiểm tra trực quan ở 1920x1080 | IN_PROGRESS |
| UI-05 | Panel top 5/10, tỉnh đóng góp cao nhất, animation đổi hạng | `main.tsx` | Có dữ liệu và animation thay đổi hạng | IN_PROGRESS |

## Bình chọn chiến trường

| ID | Yêu cầu | Module | Điều kiện nghiệm thu | Trạng thái |
|---|---|---|---|---|
| VOTE-01 | Admin mở một phiên vote trước trận | `GameEngine`, `server`, `Admin` | State chuyển sang `voting` và chống mở trùng | COMPLETED |
| VOTE-02 | Vote dựa trên comment TikTok/demo realtime | `GameEngine.vote`, `Processor` | Chuẩn hóa keyword, cập nhật socket | COMPLETED |
| VOTE-03 | Một TikTok user ID chỉ một phiếu | `GameEngine.vote` | User ID trùng bị từ chối, không lộ danh sách ID public | COMPLETED |
| VOTE-04 | Countdown server-authoritative, reload vẫn đúng | `GameEngine.tick`, broadcast | Timestamp `endsAt` lưu SQLite/state socket | COMPLETED |
| VOTE-05 | Kết quả thắng, hòa, không phiếu; chọn tay/chốt sớm | `GameEngine`, `server`, `Overview` | Không random; API xác thực admin | COMPLETED |
| VOTE-06 | Countdown 10/5 giây có cảnh báo âm thanh/animation riêng | broadcast/audio | Có tín hiệu trực quan và âm thanh khi bật | NOT_STARTED |

## Gameplay và sự kiện

| ID | Yêu cầu | Module | Điều kiện nghiệm thu | Trạng thái |
|---|---|---|---|---|
| EVENT-01 | Siêu thắp sáng từ quà và admin | `GameEngine`, `server`, `Map`, `Gifts` | Gift `super` và API admin tạo effect + điểm thật | COMPLETED |
| EVENT-02 | Ánh sáng lan tỏa có thể bật/tắt và chỉ là đồ họa | engine/map/admin | Không tự chiếm vùng lân cận | COMPLETED |
| EVENT-03 | Rương ánh sáng ở mốc 5/10/20/50%/100% | `GameEngine`, `Map` | Mốc kích hoạt duy nhất, animation và log | COMPLETED |
| EVENT-04 | Combo có timeout, thưởng, cấu hình admin, animation lớn | engine/map/admin | Combo hết hạn và có thưởng cấu hình được | COMPLETED |
| EVENT-05 | Hoàn thành 100%: cinematic, top người chơi, lưu kết quả | engine/broadcast/store | Cảnh hoàn tất và match history đúng | COMPLETED |

## Admin, realtime và độ tin cậy

| ID | Yêu cầu | Module | Điều kiện nghiệm thu | Trạng thái |
|---|---|---|---|---|
| ADMIN-01 | Start/end/pause/resume/chốt vote/chọn skin | `server`, `Admin` | API bearer token + UI thật | COMPLETED |
| ADMIN-02 | Kích hoạt event và cấu hình gift super | `server`, `Simulator`, `Gifts` | Chọn tỉnh hợp lệ và kích hoạt effect | COMPLETED |
| ADMIN-03 | Cấu hình keyword vote, map active, chest/combo/light spread | admin/settings | Lưu server-validated ngoài trận | IN_PROGRESS |
| RT-01 | Đồng bộ socket và phục hồi state | `server`, Socket.IO, SQLite | Client reconnect nhận state authoritative | COMPLETED |
| RT-02 | Không xử lý lặp event/phiếu | `Processor`, `GameEngine` | Test duplicate/cooldown/voter ID qua | COMPLETED |
| TEST-01 | Unit/integration cho vote, pause, super light | `tests` | `npm test` xanh | COMPLETED |
| TEST-02 | Responsive và runtime production thực tế | Render/browser | Kiểm tra 9:16, 16:9 và endpoint deploy | IN_PROGRESS |

## Voice

| ID | Yêu cầu | Module | Điều kiện nghiệm thu | Trạng thái |
|---|---|---|---|---|
| VOICE-01 | TTS/AI MC | audio/backend | Theo yêu cầu mới nhất: tạm bỏ qua | BLOCKED |
