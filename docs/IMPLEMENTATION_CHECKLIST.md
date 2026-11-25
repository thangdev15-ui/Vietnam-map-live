# Checklist nâng cấp “Thắp sáng Việt Nam”

## Epic VFX Engine — Phase 1: Golden Awakening

| ID | Yêu cầu | Module | Điều kiện nghiệm thu | Trạng thái |
|---|---|---|---|---|
| VFX-01 | Xây VFX engine tập trung: preset, hàng đợi theo priority/cooldown, pool và manager camera/light/particle/audio | `apps/frontend/src/vfx.ts` | Event gameplay tạo job thật, job quan trọng được ưu tiên và bị giới hạn | COMPLETED |
| VFX-02 | Golden Awakening Map 1: trace, wave, beacon, shockwave, particles, pulse, crystal, explosion, rain | `Map.tsx` / Phaser | Capture/super-light hiển thị animation thật cùng đúng tỉnh; camera cũ vẫn hoạt động | COMPLETED |
| VFX-03 | Golden Awakening Map 2: bundle SVG bị clip đúng polygon tỉnh | `Map.tsx`, `style.css` | Wave/rain/pulse/trace không vượt ranh giới; beam, particle và label theo cùng transform camera | COMPLETED |
| VFX-04 | Tôn trọng reduced motion, giới hạn effect đồng thời và không đổi state game | `Map.tsx`, `vfx.ts` | Không block Socket/gameplay; animation tự cleanup | COMPLETED |
| VFX-05 | Build, lint, mô phỏng event và chụp bằng chứng cả Map 1/2 | `docs/verification/vfx-phase1-map1.png`, `docs/verification/vfx-phase1-map2.png` | Build/lint pass; mô phỏng super-light render VFX ở hai map | COMPLETED |

## Epic VFX Engine — Phase 2: Epic Energy & Advanced Particles

| ID | Yêu cầu | Module | Điều kiện nghiệm thu | Trạng thái |
|---|---|---|---|---|
| VFX2-01 | Mở rộng preset/job với màu, intensity, duration, density và route effect gameplay → energy preset | `vfx.ts`, `shared` | Super/capture/combo/chest gọi meteor/lightning/vortex/starfall thật; không đổi điểm | COMPLETED |
| VFX2-02 | Meteor Strike: quỹ đạo, đuôi lửa, impact, shockwave, phản chiếu ánh sáng | `Map.tsx` | Render độc lập ở Map 1 và Map 2, kết thúc đúng tâm tỉnh | COMPLETED |
| VFX2-03 | Divine Lightning: sét nhiều nhánh, flash và dư điện | `Map.tsx` | Render độc lập ở hai map, tọa độ đúng tỉnh | COMPLETED |
| VFX2-04 | Energy Vortex và Starfall có particle chuyển động, trail và core | `Map.tsx`, `style.css` | Render độc lập ở hai map; particle tự hủy/pool | COMPLETED |
| VFX2-05 | Advanced particle budget/pooling và reduced-motion | `vfx.ts`, `Map.tsx`, `style.css` | Không sinh DOM vô hạn, effect tự cleanup, giữ game loop | COMPLETED |
| VFX2-06 | VFX Test Lab Admin: test từng effect và cấu hình màu/cường độ/thời lượng/mật độ | `Admin.tsx`, `admin/Simulator.tsx`, `server.ts`, `game-engine` | Button gọi API xác thực, không thay score/territory | COMPLETED |
| VFX2-07 | Kiểm thử visual cả 4 effect trên Map 1/2; build/lint/test | `docs/verification` | Có ảnh/bằng chứng API và không làm hỏng event gameplay | IN_PROGRESS |

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
| TERRAIN-03 | Cắt texture theo từng tỉnh và thắp sáng bằng clip/mask đúng tỉnh | `Map.tsx` | Nền terrain tối; độ sáng tăng theo % chỉ trong polygon tương ứng | COMPLETED |
| TERRAIN-04 | Cảnh mới: flash, glow, vòng sáng và camera vẫn dùng đúng geometry | `Map.tsx` | Map 1 giữ effect canvas; Map 2 không dùng effect canvas lệch tọa độ | COMPLETED |
| TERRAIN-05 | Kiểm tra ảnh overlay và luồng game | `docs/verification/map2-camera-binh-duong.png`, build/lint | Capture Map 2 sau event có zoom `2.15`, event và vùng Bình Dương cùng SVG transform | COMPLETED |
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
| VOICE-01 | MC TTS tiếng Việt miễn phí: MP3 động, cache, hàng đợi, fallback Web Speech | `apps/backend/src/edge-tts.ts`, `server.ts`, `audio.ts` | Không cần API key; câu đọc đúng cấu trúc; cache và không chồng lời; lỗi thì thử Web Speech. Đã gọi thật và nhận `audio/mpeg` 22,032 bytes | COMPLETED |

## Broadcast cinematic director — đợt nâng cấp tiếp theo

| ID | Yêu cầu | Module | Điều kiện nghiệm thu | Trạng thái |
|---|---|---|---|---|
| CINE-01 | Director ribbon cho sự kiện thắp sáng, gift, combo và milestone: avatar/người chơi/tỉnh/điểm; không che tâm bản đồ | `apps/frontend/src/main.tsx`, `style.css` | Chỉ xuất hiện từ effect realtime mới, tự biến mất, đúng tỉnh và điểm của effect | COMPLETED |
| CINE-02 | Nâng cảm giác sân khấu broadcast: nền khí quyển, quét ánh sáng và glow theo cường độ event, tôn trọng reduced motion | `apps/frontend/src/style.css` | Lớp hậu cảnh không chặn click/map; có reduced motion | COMPLETED |
| CINE-03 | Leaderboard có tín hiệu đổi hạng và thanh mục tiêu cộng đồng từ state thật | `apps/frontend/src/main.tsx`, `style.css` | Không dùng điểm giả; thay đổi score/rank tạo animation, có mốc tiến độ rõ | COMPLETED |
| CINE-04 | Chụp/kiểm tra broadcast portrait và desktop với event thật, chạy build/lint/test | `docs/verification`, frontend | Đã kiểm tra portrait/event thật + build/lint/test; desktop còn cần nghiệm thu riêng | IN_PROGRESS |

## Engagement loop — người xem quay lại, cùng chơi và đóng góp minh bạch

| ID | Yêu cầu | Module | Điều kiện nghiệm thu | Trạng thái |
|---|---|---|---|---|
| ENG-01 | Hiển thị tổ đội đang cùng thắp thành phố: contributor thật, avatar và lời kêu gọi cùng comment; người đã tham gia vẫn được ghi nhận sau khi tỉnh sáng | `main.tsx`, `style.css`, `game-engine` | Dùng `territory.contributors` từ engine; mọi action có ý nghĩa ghi nhận contributor | COMPLETED |
| ENG-02 | Quà tặng được nhận biết như một sự kiện gameplay riêng, có VFX/director copy phù hợp, nhưng vẫn dùng đúng gift mapping và power admin cấu hình | `game-engine`, `vfx.ts`, `main.tsx`, `Map.tsx` | Gift hợp lệ tạo effect `gift`, thêm điểm/ảnh hưởng territory thật; super/capture giữ nguyên | COMPLETED |
| ENG-03 | Mục tiêu kế tiếp chỉ ra tỉnh chưa sáng gần hoàn tất để cộng đồng tập trung, không tự chọn/chuyển mục tiêu của người chơi | `main.tsx` | Chỉ đọc state map/territory, không mutate engine | COMPLETED |
| ENG-04 | Unit test gift effect và kiểm tra broadcast bằng demo event | `tests`, `docs/verification` | Test chứng minh điểm/HP/effect/contributor đúng; Playwright demo có ảnh tổ đội và state thật | COMPLETED |

## BANDWIDTH — giảm outbound bandwidth Render

| ID | Yêu cầu | Module | Điều kiện nghiệm thu | Trạng thái |
|---|---|---|---|---|
| BW-01 | Thay terrain texture PNG nặng bằng WebP tương đương, giữ map clip theo polygon | `apps/frontend/src/assets`, `Map.tsx` | 3.2 MB → 180 KB (94%); Map 2 vẫn dùng texture trong clip polygon | COMPLETED |
| BW-02 | Đặt cache immutable cho Vite asset có content hash; không cache HTML entry/stale state | `apps/backend/src/server.ts` | Đã xác nhận `assets/*`: `max-age=31536000, immutable`; `/`: `no-cache` | COMPLETED |
| BW-03 | Nén response text/JS/CSS cho client tương thích | `server.ts`, dependencies | Đã xác nhận JS trả `Content-Encoding: gzip`; Socket.IO/audio bị bỏ qua | COMPLETED |
| BW-04 | Build/test và kiểm tra header/cache + ảnh Map 2 | `tests`, `docs/verification` | Build/lint/test pass; kiểm tra HTTP header local production-style | COMPLETED |
