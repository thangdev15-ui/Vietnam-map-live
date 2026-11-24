# Nguồn bản đồ

- geoBoundaries gbOpen, VNM ADM1, boundary ID VNM-ADM1-63759600.
- Commit nguồn: `9469f09`; metadata năm đại diện 2008, build 12/12/2023.
- GeoJSON gốc: https://media.githubusercontent.com/media/wmgeolab/geoBoundaries/9469f09/releaseData/gbOpen/VNM/ADM1/geoBoundaries-VNM-ADM1.geojson
- Metadata được lưu nguyên văn trong `source-metadata.json`, công bố giấy phép nguồn **Public Domain**. geoBoundaries yêu cầu attribution: https://www.geoboundaries.org/api.html ; https://www.geoboundaries.org/citation.html . Giữ attribution khi phân phối.
- `source.geojson` có 64 features do Côn Đảo tách riêng. `scripts/maps.mjs` union Côn Đảo với Bà Rịa Vũng Tàu, chuẩn hóa tên HCM và khoảng trắng Hà Nội, tạo đúng 63 vùng; không tạo polygon giả.
- `historical63.json`: bản đồ lịch sử, không phải địa giới hiện hành; dữ liệu nguồn cũ có thể có sai lệch so với địa giới ngay trước năm 2025.
- `merged34.json`: union 23 nhóm và giữ 11 vùng theo Nghị quyết 202/2025/QH15. Đây là hình học gộp từ dữ liệu lịch sử, **không phải bộ GeoJSON địa giới chính thức hiện hành**, không bảo đảm những điều chỉnh ranh giới chi tiết.
- Danh sách hợp nhất: https://cms.baochinhphu.vn/nghi-quyet-cua-quoc-hoi-ve-sap-xep-don-vi-hanh-chinh-cap-tinh-102250612191145158.htm
- Nguồn không bảo đảm đầy đủ các đảo/quần đảo xa bờ; không dùng bản đồ game để diễn giải chủ quyền. Không tự bổ sung hình học không có nguồn.

Chạy `node scripts/maps.mjs` để tái tạo. Loader chọn dataset bằng `settings.map`. Để thay dữ liệu: chuẩn hóa về `Province[]` gồm id duy nhất, name, center [longitude,latitude], polygons theo MultiPolygon GeoJSON, giữ nguồn và giấy phép. Bản đồ và engine cùng dùng một file; mọi lần đổi dataset phải bắt đầu trận mới.
