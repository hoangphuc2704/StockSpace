# Generated forms

Thư mục này chứa bộ form dùng chung và catalog form của ứng dụng. `FormShell` là lớp form dùng chung cho các page/component hiện tại; nó giữ nguyên `onSubmit`, `className` và các thuộc tính HTML nên không làm thay đổi state, validation hoặc API handler của từng page.

Các form cụ thể trong catalog vẫn có thể dùng độc lập để preview UI. Nhóm auth trong `AuthForms.jsx` hỗ trợ chế độ `embedded` cùng các props state/handler và đang được dùng trực tiếp trong các page auth.

## Sử dụng

```jsx
import FormsCatalog from '@/form'

// Có thể render FormsCatalog ở một route hoặc một trang preview riêng khi cần.
```

Các form riêng lẻ cũng được export từ `src/form/index.jsx`, ví dụ `LoginForm`, `WarehousePostForm`, `InboundReceiptForm`, `UserCreateForm`, `FormShell`.
