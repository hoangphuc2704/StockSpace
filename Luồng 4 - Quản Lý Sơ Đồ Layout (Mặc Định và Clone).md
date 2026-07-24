# Hướng Dẫn Tích Hợp FE: Luồng 4 - Thiết Kế & Quản Lý Sơ Đồ Layout Kho (Default vs Cloned)

Tài liệu này hướng dẫn cách tích hợp các API liên quan đến sơ đồ không gian kho bãi (Layout, Zone, Rack, Bin), giải thích cơ chế tự động nhân bản (Auto-Clone Layout) khi kích hoạt hợp đồng và giải pháp lưu hàng loạt sơ đồ (Bulk Smart Sync).

---

## 1. Phân Biệt Sơ Đồ Mặc Định (Owner) Và Sơ Đồ Tùy Chỉnh (Tenant)

Để hỗ trợ khả năng phân chia vị trí lưu trữ linh hoạt, hệ thống StockSpace tách biệt sơ đồ kho thành hai loại:

### 1.1. Sơ đồ mặc định (Default Layout) — Do Owner quản trị
* **Đặc điểm:** Thuộc tính `isDefault = true`, trường `tenant` là `null`.
* **Vai trò:** Đại diện cho cấu trúc vật lý thực tế của kho mà Owner đăng tải lên sàn giao dịch. Khách vãng lai (Guest) hoặc Tenant tiềm năng có thể xem sơ đồ mặc định này khi tìm kiếm kho để đánh giá mức độ phù hợp trước khi quyết định thuê.
* **API quản lý (Owner):** `GET` & `PUT` tại `/api/owner/warehouses/{warehouseId}/layout`.

### 1.2. Sơ đồ tùy chỉnh (Cloned / Custom Layout) — Do Tenant sở hữu
* **Đặc điểm:** Thuộc tính `isDefault = false`, trường `tenant` trỏ về tài khoản Tenant đang thuê kho.
* **Vai trò:** Bản sao sơ đồ dành riêng cho Tenant vận hành cất giữ hàng. Tenant được quyền chỉnh sửa vị trí kệ, chia nhỏ ô chứa theo nhu cầu lưu trữ đặc thù của doanh nghiệp mình mà **không làm thay đổi sơ đồ gốc** của chủ kho (Owner).
* **API quản lý (Tenant):** `GET` & `PUT` tại `/api/tenant/warehouses/{warehouseId}/layout`.

```
     [Owner thiết kế Sơ đồ mặc định]
                    │
           Tenant bấm ký Hợp đồng
                    │
            [Hợp đồng ACTIVE] ────────► [Hệ thống tự động chạy Clone Layout]
                                                       │
                                        [Sinh ra Sơ đồ tùy chỉnh của Tenant]
                                                       │
                                          Tenant tự do cấu hình lại sơ đồ
```

---

## 2. Giải Pháp Lưu Hàng Loạt Sơ Đồ (Bulk Smart Sync)

> [!TIP]
> Việc gọi API đơn lẻ để tạo/sửa/xóa từng Zone, Rack, Bin trên giao diện kéo thả (Drag-and-Drop) rất dễ gây bất đồng bộ dữ liệu và làm chậm trải nghiệm UI. 
> Do đó, Backend sử dụng phương thức **Bulk Smart Sync** (Lưu hàng loạt bằng một Request duy nhất).

### Cơ chế hoạt động của Bulk Smart Sync:
1. Người dùng (Owner hoặc Tenant) thao tác thiết kế sơ đồ trên Canvas/SVG (vẽ Zone, xếp Rack, chia Bin). Giao diện lưu toàn bộ trạng thái sơ đồ tạm thời vào bộ nhớ Client (State).
2. Khi người dùng nhấn nút **"Lưu sơ đồ"**, FE đóng gói toàn bộ sơ đồ thành một cấu trúc cây JSON lồng nhau (`Zones` chứa `Racks` chứa `Bins`) và gửi duy nhất một request `PUT` lên Backend.
3. Backend nhận dữ liệu và thực hiện thuật toán so khớp (Syncing):
   - **Tạo mới:** Tự động lưu các Zone/Rack/Bin mới xuất hiện (không có `id` trong request).
   - **Cập nhật:** Tự động sửa tên, tọa độ, kích thước, giới hạn thể tích/trọng lượng của các thực thể đã có (có `id` trùng khớp).
   - **Xóa bỏ:** Tự động xóa các thực thể không còn nằm trong danh sách gửi lên.
   - **Cơ chế an toàn (Ràng buộc tồn kho):** Nếu người dùng cố tình xóa một Bin mà **Bin đó hiện đang chứa hàng tồn kho (`StockBatch.quantity > 0`)**, Backend sẽ lập tức từ chối và ném lỗi `STOCK_BATCH_NOT_FOUND` hoặc lỗi tương ứng để bảo vệ hàng hóa của khách hàng.

---

## 3. Cấu Trúc Request Body Mẫu Cho API Lưu Hàng Loạt (Bulk Layout Save)

Dưới đây là định dạng dữ liệu JSON mà FE cần đóng gói để gửi lên khi người dùng nhấn nút lưu sơ đồ:

* **Endpoint (Tenant):** `PUT /api/tenant/warehouses/{warehouseId}/layout`
* **Endpoint (Owner):** `PUT /api/owner/warehouses/{warehouseId}/layout`
* **JSON Request Body:**
```json
{
  "width": 100,
  "height": 100,
  "zones": [
    {
      "id": "c51387e3-d5cd-424d-9360-e36a8394c416", 
      "name": "Khu A - Hàng Khô",
      "coordinateX": 0,
      "coordinateY": 0,
      "width": 50,
      "height": 50,
      "racks": [
        {
          "id": "d449d532-d94e-480b-b529-2d8f87bafddb",
          "name": "Kệ A1",
          "code": "RACK-A1",
          "coordinateX": 5,
          "coordinateY": 5,
          "width": 10,
          "height": 40,
          "bins": [
            {
              "id": "e0c5a3bb-0432-4eeb-be3a-61dc7c921004", 
              "name": "Ô A1-01",
              "code": "BIN-A1-01",
              "maxWeight": 500.0,
              "maxVolume": 2.0,
              "coordinateX": 0,
              "coordinateY": 0,
              "width": 10,
              "height": 10
            }
          ]
        }
      ]
    }
  ]
}
```
*(Nếu phần tử nào mới tạo hoàn toàn trên UI, hãy bỏ trống trường `"id"` hoặc truyền `null` để Backend nhận diện và tự sinh mã UUID)*.

---

## 4. Các Endpoints Tích Hợp Phía Frontend

### 4.1. Lấy Sơ Đồ Layout (Tenant)
* **API:** `GET /api/tenant/warehouses/{warehouseId}/layout`
* **Mô tả:** Trả về toàn bộ cây sơ đồ không gian kho (Layout $\rightarrow$ Zone $\rightarrow$ Rack $\rightarrow$ Bin). Backend tự động trả về sơ đồ đã clone của Tenant. Nếu chưa có bản clone tùy chỉnh, hệ thống sẽ trả về bản sao sơ đồ mặc định của Owner để hiển thị.

### 4.2. Lấy Sơ Đồ Layout (Owner)
* **API:** `GET /api/owner/warehouses/{warehouseId}/layout`
* **Mô tả:** Lấy sơ đồ mặc định của Owner.

### 4.3. Xem Sơ Đồ Layout Kho Công Khai (Public / Guest / Tenant xem trước)
* **API:** `GET /api/warehouses/{warehouseId}/layout`
* **Mô tả:** Public endpoint. Dùng cho trang chi tiết kho bãi ở ngoài cổng thông tin (không cần đăng nhập). Chỉ cho phép xem (`GET`), không được sửa.
* **Ghi chú:** Trả về sơ đồ mặc định (`isDefault = true`) của kho bãi đó.
