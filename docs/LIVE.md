# TikTok LIVE / OBS

## Tình trạng tích hợp

Adapter dùng thư viện thật `TikTokLiveConnection`, không giả trạng thái kết nối. Test adapter dùng mock riêng để kiểm tra lifecycle; **mock pass không chứng minh LIVE hoạt động**. Chưa có username đang LIVE để kiểm thử thực tế.

Phiên bản đã khóa: tiktok-live-connector 2.5.0. Nguồn: https://github.com/zerodytrash/TikTok-Live-Connector . Package hiện khai báo AGPL-3.0-only; xem `licenses/tiktok-live-connector.txt` và đánh giá nghĩa vụ giấy phép khi sửa/phân phối/cung cấp dịch vụ mạng. Không giả định giấy phép MIT của phiên bản cũ.

Đây là thư viện không chính thức, có thể phụ thuộc dịch vụ ký bên thứ ba, thay đổi giao thức và giới hạn truy cập. Đã đối chiếu README/package/typed events cài trên máy. Trang điều khoản TikTok https://www.tiktok.com/legal/page/row/terms-of-service/en không truy xuất được bằng công cụ kiểm tra trong phiên này, nên **chưa xác nhận triển khai được nền tảng cho phép**. Chủ tài khoản cần kiểm tra điều khoản áp dụng và quyền sử dụng phương thức tích hợp trước khi vận hành. Không vượt CAPTCHA, không lấy mật khẩu/cookie, không có cơ chế né hạn chế. Nếu kết nối không hợp lệ hoặc không còn hoạt động, thay `LiveAdapter` bằng nhà cung cấp được phép và giữ hợp đồng `LiveEvent`.

## Kết nối

1. Khởi động app, vào Admin, bắt đầu trận.
2. TikTok LIVE → nhập username đang phát LIVE, không nhập URL hoặc mật khẩu.
3. Kết nối. Chỉ `connected` khi `connect()` thành công. Thất bại được báo và retry tối đa 5 lần, backoff 2–30 giây. Ngắt kết nối hủy retry; stream end dừng kết nối.
4. Dùng tài khoản xem bình luận `đỏ`, đợi cooldown, `đánh hà nội`.
5. Kiểm tra Nhật ký, người chơi và HP trên màn hình khác. Quà streak chỉ tính sự kiện kết thúc, không nhân lại các bản cập nhật. Sự kiện không có msgId bị bỏ qua để tránh trùng không kiểm soát.
6. Gift Mapping: điền gift ID hoặc tên chính xác nhận từ nguồn. Event log lưu loại/kết quả/người gửi và các trường comment, giftId, giftName, count đã chuẩn hóa; không lưu raw payload hoặc thông tin xác thực. Dùng giftId/giftName trong Nhật ký để cấu hình mapping. Mapping theo tên Rose mặc định là cấu hình mẫu, không quy đổi coin/diamond cố định.
7. Kiểm tra like/follow/share, mất mạng và reconnect. Không công bố đã tích hợp thành công trước khi hoàn thành các bước này với LIVE thật.

## OBS trên macOS

Mở `http://127.0.0.1:5173/?broadcast=1` (development) hoặc `http://127.0.0.1:3001/?broadcast=1` (production). Thêm Browser Source trong OBS, width 1920, height 1080, 30 hoặc 60 FPS tùy máy. Nếu Browser Source không có trên bản OBS đang dùng, mở URL trong Chrome và dùng Window Capture. Đặt canvas/output 1920×1080; không capture cửa sổ Admin. Broadcast ẩn link/nút quản trị. Có thể bật toàn màn hình trình duyệt bằng menu hệ điều hành.

Quyền phát qua RTMP/OBS tùy tài khoản và TikTok; app không tạo stream key hay mở quyền LIVE. Nếu tài khoản chưa có quyền, sử dụng phương thức phát mà TikTok cấp cho tài khoản.

## TikTok LIVE Studio

Kiểm tra hệ điều hành được hỗ trợ tại https://www.tiktok.com/studio/download trước khi cài; không giả định có bản macOS. Trên máy dùng LIVE Studio tương thích, thêm nguồn capture cửa sổ trình duyệt hoặc nguồn trình duyệt nếu bản đang dùng hỗ trợ. Nếu Studio ở máy khác, `127.0.0.1` trỏ về máy Studio, không phải Mac chạy game: dùng server HTTPS trên LAN/VPS hoặc capture output hợp lệ từ máy game; không mở Admin ra Internet tùy tiện.

## Checklist trước LIVE thật

- [ ] Xác nhận phương thức tích hợp và quyền phát phù hợp tài khoản.
- [ ] Chạy build/lint/tests; chọn đúng dữ liệu lịch sử hay gộp 34.
- [ ] Xác nhận bản đồ nguồn thiếu các đảo xa bờ là giới hạn dữ liệu, không tuyên bố là bản đồ địa giới/chủ quyền chính thức.
- [ ] Token ngẫu nhiên, không nằm trong Browser Source/URL/log.
- [ ] Thử tài khoản xem thật: chọn phe, tấn công, phòng thủ, quà streak, follow/like/share.
- [ ] Test ngắt/kết nối lại và không nhân đôi gift.
- [ ] Test chiến thắng, hòa, trận mới, khóa spam.
- [ ] OBS/LIVE Studio hiển thị rõ 1080p và không có Admin trên sóng.
- [ ] Chạy soak test ít nhất 30 phút trên máy phát; theo dõi FPS, CPU, dung lượng DB.
