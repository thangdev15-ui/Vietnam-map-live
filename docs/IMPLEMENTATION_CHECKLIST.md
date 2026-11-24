# Checklist nâng cấp “Thắp sáng Việt Nam”

## Nền tảng và dữ liệu

| ID | Yêu cầu | Module | Điều kiện nghiệm thu | Trạng thái |
|---|---|---|---|---|
| CORE-01 | Giữ Node/Express, Socket.IO, SQLite và connector hiện tại | toàn dự án | Không thay stack, build và test qua | COMPLETED |
| CORE-02 | Dùng dữ liệu vùng có thật | `assets/maps/historical63.json` | Mọi trận dùng 63 tỉnh có geometry thật | COMPLETED |
| CORE-03 | Tách dữ liệu địa lý khỏi giao diện chiến trường | `shared`, `server`, `Map` | Thay skin không đổi danh sách 63 tỉnh | COMPLETED |

## Terrain map theo polygon thật

| ID | Yêu cầu | Module | Điều kiện nghiệm thu | Trạng thái |
|---|---|---|---|---|
| TERRAIN-01 | Xuất silhouette và SVG từ đúng 63 polygon hiện có | `scripts/build-terrain-map.ts`, `assets/maps/historical63.json` | SVG chứa 63 vùng có ID ổn định, không có tọa độ giả | COMPLETED |
| TERRAIN-02 | Dựng một texture terrain dùng làm chất liệu, không dùng ảnh bản đồ Việt Nam làm nền | `assets/terrain`, `Map.tsx` | Hình dạng đất liền chỉ đến từ polygon/SVG thật | COMPLETED |
| TERRAIN-03 | Cắt texture theo từng tỉnh và thắp sáng bằng clip/mask đúng tỉnh | `Map.tsx` | Nền terrain tối; độ sáng tăng theo % chỉ trong polygon tương ứng | IN_PROGRESS |
| TERRAIN-04 | Cảnh mới: flash, glow, vòng sáng và camera vẫn dùng đúng geometry | `Map.tsx` | Map 1 giữ effect canvas; Map 2 không dùng effect canvas lệch tọa độ | IN_PROGRESS |
| TERRAIN-05 | Kiểm tra ảnh overlay và luồng game | `docs/verification`, build/test | SVG overlay trùng khít texture map; không làm hỏng realtime | IN_PROGRESS |
| VIEW-01 | Map 1 là view mặc định đơn sắc cũ của Việt Nam | `Map.tsx`, `shared` | Không đổi nền/HUD; map hiển thị bản đồ cũ | COMPLETED |
| VIEW-02 | Map 2 là view terrain có texture theo từng tỉnh | `Map.tsx`, `shared` | Không đổi nền/HUD; texture chỉ xuất hiện trong 63 polygon | COMPLETED |
| VIEW-03 | Bình chọn chỉ mở hai view đã có yêu cầu rõ ràng | `shared`, `server`, `Rules` | Chỉ hiện Map 1 và Map 2; state cũ Map 3 về Map 1 | COMPLETED |

## Broadcast và bản đồ

| ID | Yêu cầu | Module | Điều kiện nghiệm thu | Trạng thái |
|---|---|---|---|---|
| UI-01 | Broadcast dark navy / vàng / cyan, header và HUD dọc | `main.tsx`, `style.css` | Hiển thị portrait responsive | COMPLETED |
| UI-02 | Camera focus, đèn rơi, hạt sáng, avatar người góp ánh sáng | `Map.tsx` | Sự kiện comment/capture/gather tạo animation thật | COMPLETED |
| UI-03 | Ba battlefield skin: War Room, Cyber Network, Imperial Atlas | `shared`, `Map.tsx`, `style.css` | Vote skin đổi palette/lưới/panel; 63 tỉnh giữ nguyên | COMPLETED |
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

## Voice

| ID | Yêu cầu | Module | Điều kiện nghiệm thu | Trạng thái |
|---|---|---|---|---|
| VOICE-01 | TTS/AI MC | audio/backend | Theo yêu cầu mới nhất: tạm bỏ qua | BLOCKED |
