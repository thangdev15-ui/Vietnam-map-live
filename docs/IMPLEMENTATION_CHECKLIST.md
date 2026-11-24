# Checklist rendering modes Việt Nam

| ID | Yêu cầu | Module | Điều kiện nghiệm thu | Trạng thái |
|---|---|---|---|---|
| VM-01 | Một dữ liệu Việt Nam 63/34 tỉnh, ID và polygon giữ nguyên | `assets/maps`, backend | Không có dữ liệu quốc gia/map khác trong runtime | IN_PROGRESS |
| VM-02 | Mode Địa hình dựng pseudo-3D có extrusion, bóng và cao độ | `Map.tsx` | Bề mặt tỉnh có chiều sâu, không chỉ đổi nền CSS | IN_PROGRESS |
| VM-03 | Mode Vệ tinh dựng bề mặt tự nhiên, biển/địa hình, polygon phủ rõ | `Map.tsx` | Cùng polygon tỉnh, cách render độc lập terrain/fantasy | IN_PROGRESS |
| VM-04 | Mode Chiến thuật cinematic có fog, energy, glow và animation thắp sáng | `Map.tsx` | Cùng territory, renderer độc lập | IN_PROGRESS |
| VM-05 | Đổi mode không tạo engine mới, không mất tỉnh sáng/điểm/comment | `server`, `GameEngine` | Test state trước/sau bằng nhau | IN_PROGRESS |
| VM-06 | Admin chọn mode mặc định, bật/tắt mode vote và đổi live khi cho phép | `Rules`, `Overview`, API | API token bảo vệ; UI hoạt động | IN_PROGRESS |
| VM-07 | Vote 30s chọn rendering mode, không đổi hình học | `GameEngine`, `server` | Vote chọn mode và giữ Vietnam dataset | IN_PROGRESS |
| VM-08 | Test build/lint/unit/integration và kiểm tra trực quan 3 mode | `tests`, browser | Có chứng cứ mỗi mode vẫn là Việt Nam | IN_PROGRESS |

## Chức năng phải giữ

| ID | Yêu cầu | Trạng thái |
|---|---|---|
| KEEP-01 | TikTok connector, comment, quà, điểm, leaderboard, realtime | IN_PROGRESS |
| KEEP-02 | Thắp sáng/animation/zoom chọn tỉnh | IN_PROGRESS |
| KEEP-03 | TTS đang tạm bỏ qua theo yêu cầu trước | BLOCKED |
