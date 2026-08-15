# 🏗️ Giải pháp Xử lý Sức chứa (Capacity) trong WMS

Tài liệu này giải quyết 3 bài toán lớn liên quan đến việc tính toán sức chứa thực tế của Bin (Ngăn) dựa trên khối lượng (kg), thể tích (m³), và đơn vị tính (UOM) của sản phẩm trong hệ thống StockSpace.

---

## Vấn đề 1: Nhập số lượng (Quantity) nhưng Bin lại tính bằng kg/m³
**Tình trạng:** Bạn set Bin có `maxWeight = 50kg`. Khi nhập kho, form lại yêu cầu gõ "Số lượng" (ví dụ: 15 cái) chứ không phải gõ "50kg". Làm sao để biết 15 cái đó có vượt 50kg hay không?

**Cách giải quyết (Công thức cốt lõi của WMS):**
Hệ thống **không bắt người dùng tự nhẩm tính kg**. Thay vào đó, hệ thống tự động dịch từ sức chứa vật lý (kg/m³) sang "Số lượng tối đa có thể cất vào" (Max Quantity) dựa trên thông số của 1 đơn vị sản phẩm (SKU).

**Công thức Backend/Frontend đang áp dụng ngầm:**
```text
Sức chứa theo Khối lượng (MaxQtyByWeight) = floor( Bin.maxWeight / SKU.weight )
Sức chứa theo Thể tích (MaxQtyByVolume)   = floor( Bin.maxVolume / SKU.volume )

=> Số lượng cất tối đa (Max Quantity)     = min( MaxQtyByWeight, MaxQtyByVolume )
```

*Ví dụ thực tế:* 
- Bin của bạn có: `maxWeight = 50kg`, `maxVolume = 2 m³`.
- Sản phẩm Điện thoại có: `weight = 3kg/chiếc`, `volume = 0.05 m³/chiếc`.
- Tính toán: 
  - Khối lượng: $50 / 3 = 16.6 \rightarrow$ Cất được tối đa **16** chiếc.
  - Thể tích: $2 / 0.05 = 40 \rightarrow$ Cất được tối đa **40** chiếc.
- **Kết luận hệ thống:** Lấy số nhỏ nhất $\rightarrow$ UI sẽ hiển thị `Max: 16`. 
Người dùng chỉ cần nhập số lượng $\le 16$ chiếc. Hệ thống đã lo phần tính toán kg ở phía sau.

---

## Vấn đề 2: Nhập tủ lạnh nặng 60kg vào Bin chỉ chịu được 50kg
**Tình trạng:** Nếu sản phẩm (Tủ lạnh) nặng 60kg, vượt quá tải trọng 50kg của Bin thì sao? Làm sao để ước lượng?

**Cách giải quyết:**
Dựa vào công thức ở Vấn đề 1:
- Khối lượng: $50 / 60 = 0.83 \rightarrow$ Dùng hàm `floor` (làm tròn xuống) $\rightarrow$ Cất được tối đa **0** chiếc tủ lạnh.

**Hành vi của hệ thống:**
1. Trên giao diện Inbound, ở ngay cái Bin đó sẽ hiển thị `Avail: 0 / Max: 0`.
2. Hệ thống sẽ **khóa hoàn toàn** (Disable) ô nhập số lượng của Bin đó đối với mã SKU Tủ lạnh.
3. Người dùng bắt buộc phải chọn một cái Rack/Bin khác ở tầng trệt (những Bin dành cho hàng nặng, `maxWeight` = 1000kg) để cất tủ lạnh vào.

*Lưu ý cho Team Dev:* Khi người dùng chọn 1 SKU trong form Inbound, FE phải lấy `weight` và `volume` của SKU đó chia cho `maxWeight` và `maxVolume` của toàn bộ Bins để render ra con số `Max` tương ứng ngay lập tức.

---

## Vấn đề 3: Đơn vị tính (UOM) của SKU không phải là Kg
**Tình trạng:** SKU có UOM là "Thùng", "Cái", "Hộp", "Pallet" (chứ không phải kg). Làm sao để config và tính toán khi bỏ vào Bin?

**Bản chất vấn đề:** Đơn vị tính (UOM - Unit of Measure) chỉ dùng để **đếm số lượng** (1 thùng, 2 hộp, 3 chiếc). Nó hoàn toàn không liên quan đến đại lượng vật lý.

**Cách giải quyết:**
Bắt buộc trong hệ thống WMS, **Bảng Sản phẩm (Product/SKU)** phải có 2 trường dữ liệu tĩnh song hành với UOM. Nghĩa là khi tạo SKU mới, người dùng phải khai báo:
1. `UOM` (Đơn vị tính): ví dụ "Thùng".
2. `Weight` (Khối lượng quy chuẩn): 1 "Thùng" này nặng bao nhiêu **Kg**.
3. `Volume` (Thể tích quy chuẩn): 1 "Thùng" này chiếm bao nhiêu **m³**.

**Quy trình chuẩn hóa:**
- Dù UOM là gì ("Cái", "Tấm", "Lít", "Bao"), thì hệ thống luôn luôn quy đổi ngầm: `1 UOM = X kg` và `1 UOM = Y m³`.
- Từ đó, thuật toán ở Vấn đề 1 vẫn chạy hoàn hảo.
- Mọi giới hạn của Bin/Rack (`maxWeight`, `maxVolume`) trong hệ thống **phải luôn luôn được chuẩn hóa cố định ở 1 đơn vị duy nhất** (ví dụ: Kg và m³). KHÔNG BAO GIỜ lưu tải trọng của kệ bằng đơn vị "Thùng" hay "Pallet", vì các SKU khác nhau sẽ có thùng to thùng nhỏ khác nhau.

### Hướng dẫn kiểm tra Code (Checklist cho Dev)
1. Kiểm tra API `POST /skus` (Tạo sản phẩm mới): Đã bắt buộc (require) người dùng nhập `weight` (kg) và `volume` (m³) chưa? Nếu chưa, phải thêm ngay vào DB.
2. Kiểm tra API `GET /warehouses/{id}/layout`: Đã có trả về `maxWeight`, `maxVolume` của Bin chưa?
3. Khi FE gọi API tạo Inbound (`POST /receipts/inbound`), BE phải kiểm tra (Validate): 
   `Tổng Quantity * SKU.weight + Hàng cũ trong Bin.weight <= Bin.maxWeight`. Nếu vi phạm, trả về lỗi 400.

---

## Vấn đề 4: Project hiện tại đang BỊ THIẾU trường `weight` và `volume` cho Product (SKU)
**Tình trạng:** Hiện tại mã nguồn BE (`ProductSku.java`) hoàn toàn không có trường lưu trữ khối lượng hay thể tích của 1 đơn vị sản phẩm. Do đó, form nhập Inbound hiển thị `Avail/Max` nhưng thực chất chỉ đang giả lập (mock) hoặc tính sai logic (chỉ đếm số lượng thô).

**Cách giải quyết & Hướng dẫn Code cụ thể (Dành cho Dev):**
Bắt buộc phải nâng cấp hệ thống (Refactor) để luồng tạo SKU có thu thập thông số vật lý.

**Bước 1: Sửa Database và Entity (Backend)**
Mở file `ProductSku.java`, bổ sung:
```java
    @Column(name = "weight", precision = 10, scale = 3)
    private BigDecimal weight; // Khối lượng 1 UOM (kg)

    @Column(name = "volume", precision = 10, scale = 3)
    private BigDecimal volume; // Thể tích 1 UOM (m³)
```
*(Nếu dùng Flyway/Liquibase, hãy viết script `ALTER TABLE product_skus ADD COLUMN weight NUMERIC(10,3), ADD COLUMN volume NUMERIC(10,3);`)*.

**Bước 2: Sửa DTO và Service (Backend)**
- Mở `ProductSkuRequest.java` và `ProductSkuResponse.java`, bổ sung `weight` và `volume` (Kiểu `BigDecimal`).
- Mở `ProductSkuService.java`, nhớ map 2 trường này từ Request sang Entity lúc `create` và `update`.

**Bước 3: Sửa Form tạo SKU (Frontend)**
- Mở file component chứa form tạo SKU của Tenant.
- Bổ sung 2 Input Fields:
  - **Khối lượng / 1 Đơn vị tính (kg)**: Bắt buộc nhập > 0.
  - **Thể tích / 1 Đơn vị tính (m³)**: Bắt buộc nhập > 0.
- Update Payload JSON khi gọi API `POST /api/tenant/skus` để gửi kèm 2 biến này.

**Bước 4: Sửa Logic Inbound (Áp dụng công thức vào thực tế)**
- Khi bấm chọn SKU trong form Inbound, Frontend sẽ có data của `sku.weight` và `sku.volume`.
- Frontend chạy công thức `Min(Bin.maxWeight / sku.weight, Bin.maxVolume / sku.volume)` để tính ra giới hạn tối đa `Max: Y` cho cái Bin đó.
- Backend ở API `POST /inbound` cũng viết y chang phép chia này để validate chéo, đề phòng trường hợp User hack Frontend nhập quá số lượng cho phép.
