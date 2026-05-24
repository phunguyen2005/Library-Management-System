# 📚 Đề Xuất Nâng Cấp Hệ Thống Thư Viện Số — Enterprise Edition

> **Author**: Senior Product Owner & Fullstack Architect  
> **Date**: 2026-05-23  
> **Project**: Book Loan Midterm — TTVP Group
> **Trạng thái hiện tại**: 🎉 **100% ĐÃ HOÀN THÀNH & TÍCH HỢP TẤT CẢ CÁC GIAI ĐOẠN**

---

> [!NOTE]
> Toàn bộ các tính năng được đề xuất nâng cấp dưới đây (từ Phase 1 tới Phase 4) đã được đội ngũ **phát triển hoàn tất 100%** và tích hợp thành công trên cả Backend Laravel và Frontend React.

## I. Hiện Trạng Hệ Thống (As-Is Analysis)

### Tech Stack hiện tại

| Layer | Technology | Version |
|-------|-----------|---------|
| Backend | Laravel | 12.x |
| Auth | Sanctum + OAuth (Socialite) | 4.x |
| Database | SQLite | — |
| Frontend | React + TypeScript | 19.x |
| Build | Vite | 6.x |
| CSS | TailwindCSS | 4.x |
| Animation | Motion (Framer Motion) | 12.x |
| QR | qrcode.react + @yudiel/react-qr-scanner | — |
| AI | @google/genai | 1.x |

### Modules đã triển khai

| Module | Tính năng | Trạng thái |
|--------|-----------|-----------|
| **Auth** | Login, Register, OTP verify, Forgot password, OAuth Google | ✅ Hoàn thiện |
| **Books** | CRUD, Search, Cover, Category, Digital upload, Soft delete | ✅ Hoàn thiện |
| **Borrowing** | 5-state workflow (pending→approved→borrowed→returned/rejected), QR code | ✅ Hoàn thiện |
| **Members** | CRUD admin quản lý thành viên | ✅ Hoàn thiện |
| **Notifications** | In-app notification, Mark read, Email borrowing | ✅ Hoàn thiện |
| **Digital Library** | Upload/download file, Signed URL | ⚠️ Cơ bản |
| **Settings** | Library settings (giờ mở cửa, giới hạn mượn) | ✅ Hoàn thiện |
| **Dashboard** | Admin dashboard with charts | ✅ Hoàn thiện |
| **Reports** | Basic report | ⚠️ Cơ bản |
| **Theme** | Dark/Light mode toggle | ✅ Hoàn thiện |

### Gaps chính cần lấp

- Không có **online reading** (PDF/EPUB viewer)
- Không có **recommendation engine** hay **smart search**
- Không có **audit log** hay **activity tracking**
- Không có **fine/payment** system
- Không có **reservation queue**
- Không có **analytics nâng cao** (reading heatmap, trends)
- Security ở mức cơ bản (chưa có rate limit chi tiết, device tracking, login history)
- Chưa có **CI/CD**, **Docker**, **caching strategy**

---

## II. Đề Xuất Tính Năng Theo Module

---

### Module 1: User Experience Features 🎨

#### 1.1 Smart Search với Autocomplete
- **Mục đích**: Thay thế search cơ bản bằng gợi ý real-time khi gõ
- **Luồng**: User gõ ≥ 2 ký tự → Debounce 300ms → API trả top 5 suggestions (title, author, category) → Click chọn hoặc Enter để xem kết quả đầy đủ
- **Giá trị**: Giảm 60% thời gian tìm sách, tăng conversion
- **Độ khó**: `Easy`
- **Gợi ý**: Sử dụng SQLite FTS5 full-text search, debounce phía FE với `useDeferredValue`

#### 1.2 Wishlist / Favorite Books
- **Mục đích**: Sinh viên đánh dấu sách yêu thích để mượn sau
- **Luồng**: Bấm icon ❤️ trên card sách → Lưu vào bảng `favorites` → Xem danh sách ở trang "Sách yêu thích" → Nhận notification khi sách hết hạn trở về
- **Giá trị**: Tăng engagement, cung cấp data cho recommendation
- **Độ khó**: `Easy`
- **Gợi ý**: Bảng pivot `member_id + book_id`, API `POST /favorites/{bookId}`, `DELETE /favorites/{bookId}`

#### 1.3 Reading History & Recently Viewed
- **Mục đích**: Lịch sử duyệt sách gần đây
- **Luồng**: Mỗi lần user click vào chi tiết sách → Ghi log vào `book_views` (book_id, member_id, viewed_at) → Hiển thị carousel "Đã xem gần đây" ở trang Home
- **Giá trị**: Nâng UX, hỗ trợ quay lại sách đã xem nhưng chưa mượn
- **Độ khó**: `Easy`
- **Gợi ý**: Lưu client-side localStorage cho guest, server-side cho logged-in users

#### 1.4 Book Rating & Review
- **Mục đích**: Sinh viên đánh giá sách sau khi trả
- **Luồng**: Khi phiếu mượn chuyển sang `returned` → Hiện popup đánh giá (1-5 sao + comment) → Hiển thị trên trang chi tiết sách → Tính average rating
- **Giá trị**: Social proof, community-driven quality indicator
- **Độ khó**: `Easy`
- **Gợi ý**: Bảng `reviews` (member_id, book_id, rating, comment, created_at), chỉ cho phép review 1 lần/lượt mượn

#### 1.5 Infinite Scroll + Skeleton Loading
- **Mục đích**: Thay pagination truyền thống bằng lazy load
- **Luồng**: Trang catalog load 20 sách đầu → Scroll đến cuối → IntersectionObserver trigger load thêm 20 → Hiện skeleton placeholder khi đang tải
- **Giá trị**: UX mượt mà hơn, giảm thao tác click
- **Độ khó**: `Easy`
- **Gợi ý**: `IntersectionObserver` API, cursor-based pagination thay offset

#### 1.6 Keyboard Shortcuts
- **Mục đích**: Power user có thể thao tác nhanh bằng phím
- **Luồng**: `Ctrl+K` mở search, `Ctrl+B` mở sách yêu thích, `/` focus search bar, `Esc` đóng modal
- **Giá trị**: Tăng tốc workflow cho admin/thủ thư
- **Độ khó**: `Easy`
- **Gợi ý**: Custom React hook `useHotkeys`, hiển thị hints ở tooltip

#### 1.7 Notification Center nâng cao
- **Mục đích**: Trung tâm thông báo với phân loại và realtime
- **Luồng**: Bell icon hiển thị badge đếm → Click mở dropdown → Tabs: Tất cả / Mượn trả / Hệ thống → Mark read từng item hoặc tất cả → Realtime push qua polling hoặc SSE
- **Giá trị**: Không bỏ lỡ thông báo quan trọng (sắp hết hạn, sách available)
- **Độ khó**: `Medium`
- **Gợi ý**: Đã có cơ sở (NotificationController), cần thêm notification types và SSE endpoint

---

### Module 2: AI-Powered Features 🤖

#### 2.1 AI Book Recommendation
- **Mục đích**: Gợi ý sách cá nhân hóa dựa trên lịch sử mượn
- **Luồng**: Collect data (lịch sử mượn, favorites, ratings) → Gửi prompt tới Gemini API kèm context → Trả về top 5 sách recommended với lý do → Hiển thị trên Home
- **Giá trị**: Tăng 40% khả năng mượn thêm sách
- **Độ khó**: `Medium`
- **Gợi ý**: Đã có `@google/genai`. Tạo endpoint `GET /ai/recommendations` gọi Gemini với context user

#### 2.2 AI Book Summary / Abstract
- **Mục đích**: Tự động tóm tắt nội dung sách
- **Luồng**: Admin upload sách → Background job gọi Gemini để generate summary → Lưu vào `books.ai_summary` → Hiển thị trên trang chi tiết
- **Giá trị**: Sinh viên đọc overview trước khi quyết định mượn
- **Độ khó**: `Medium`
- **Gợi ý**: Queue job `GenerateBookSummary`, dùng PDF text extraction + Gemini summarize

#### 2.3 AI Semantic Search
- **Mục đích**: Tìm sách bằng ngôn ngữ tự nhiên thay vì keyword chính xác
- **Luồng**: User nhập "sách về lập trình web cho người mới" → Backend gửi query tới Gemini Embedding → So sánh vector similarity với book descriptions → Trả kết quả xếp theo relevance
- **Giá trị**: Tìm được sách ngay cả khi không biết tên chính xác
- **Độ khó**: `Hard`
- **Gợi ý**: Gemini Embedding API, lưu embeddings trong SQLite hoặc file-based vector store

#### 2.4 AI Chatbot Hỗ Trợ Tìm Sách
- **Mục đích**: Chat assistant giúp sinh viên tìm sách qua hội thoại
- **Luồng**: Floating chat bubble → User hỏi "Tôi cần tài liệu về cơ sở dữ liệu" → Chatbot parse intent → Query DB → Trả kết quả kèm link → Có thể hỏi follow-up
- **Giá trị**: Trải nghiệm tương tác tự nhiên, hỗ trợ 24/7
- **Độ khó**: `Medium`
- **Gợi ý**: Gemini chat API + function calling để query thực tế từ DB

#### 2.5 AI Auto Tag Generation
- **Mục đích**: Tự động gắn tags/keywords khi thêm sách mới
- **Luồng**: Admin nhập title + description → Gọi Gemini extract keywords → Gợi ý 5-10 tags → Admin confirm/edit → Lưu vào bảng `book_tags`
- **Giá trị**: Chuẩn hóa metadata, cải thiện tìm kiếm
- **Độ khó**: `Easy`
- **Gợi ý**: Gọi Gemini trực tiếp từ FE khi form submit, hiện preview tags trước khi lưu

---

### Module 3: Digital Library Features 📖

#### 3.1 Online PDF/EPUB Reader
- **Mục đích**: Đọc tài liệu số trực tiếp trên web mà không cần download
- **Luồng**: Click "Đọc online" → Mở viewer full-screen → Load PDF/EPUB → Hỗ trợ zoom, page navigation, fullscreen → Lưu reading progress
- **Giá trị**: Core feature của thư viện số hiện đại, giảm piracy vì không cần download
- **Độ khó**: `Medium`
- **Gợi ý**: `react-pdf` (dùng PDF.js) hoặc `@vivliostyle/viewer` cho EPUB. Streaming qua signed URL

#### 3.2 Bookmark & Highlight
- **Mục đích**: Đánh dấu trang và highlight đoạn văn trong tài liệu
- **Luồng**: Đang đọc → Click icon bookmark → Lưu page number + timestamp → Bôi đen text → Popup "Highlight" hoặc "Add note" → Lưu vào DB → Xem lại ở "My Annotations"
- **Giá trị**: Trải nghiệm đọc chuyên nghiệp, hỗ trợ học tập
- **Độ khó**: `Hard`
- **Gợi ý**: Bảng `annotations` (member_id, book_id, page, type, content, position_data)

#### 3.3 Reading Progress Sync
- **Mục đích**: Đồng bộ tiến trình đọc giữa các thiết bị
- **Luồng**: User đọc đến trang 47 trên laptop → Đóng tab → Mở trên điện thoại → Tự động nhảy trang 47 → "Tiếp tục đọc" trên Home
- **Giá trị**: Seamless cross-device experience
- **Độ khó**: `Easy`
- **Gợi ý**: Bảng `reading_progress` (member_id, book_id, current_page, total_pages, updated_at), API `PUT /reading-progress/{bookId}`

#### 3.4 Reservation Queue (Đặt chỗ)
- **Mục đích**: Đặt chỗ khi sách hết số lượng available
- **Luồng**: Sách hết → Hiện nút "Đặt chỗ" thay "Mượn" → User bấm → Thêm vào queue → Khi sách được trả → Notify người đầu queue → Tự động tạo phiếu mượn pending → Hết hạn 24h nếu không confirm
- **Giá trị**: Không mất cơ hội mượn, quản lý demand minh bạch
- **Độ khó**: `Medium`
- **Gợi ý**: Bảng `reservations` (member_id, book_id, position, status, expires_at), Scheduled command kiểm tra expired

#### 3.5 Download Limitation & Watermark
- **Mục đích**: Giới hạn số lần download và đóng watermark chống sao chép
- **Luồng**: Admin cấu hình max_downloads_per_book = 3 → User download → Counter giảm → Hết quota → Chỉ đọc online → PDF được watermark tên user + mã SV
- **Giá trị**: Bảo vệ bản quyền, accountability
- **Độ khó**: `Hard`
- **Gợi ý**: `mpdf` hoặc `FPDI` để watermark server-side, bảng `download_logs`

---

### Module 4: Admin & Staff Features 🏗️

#### 4.1 Audit Log System
- **Mục đích**: Ghi lại mọi hành động quan trọng trong hệ thống
- **Luồng**: Mọi action (CRUD sách, duyệt/từ chối, đổi settings) → Middleware/Observer tự động log → Bảng `audit_logs` (user_id, action, entity_type, entity_id, old_values, new_values, ip, user_agent, created_at)
- **Giá trị**: Truy vết, compliance, accountability — **bắt buộc cho enterprise**
- **Độ khó**: `Medium`
- **Gợi ý**: Laravel Model Observer hoặc package `owen-it/laravel-auditing`. Trang admin "Nhật ký hệ thống" với filter theo user/action/entity

#### 4.2 Damaged / Lost Book Management
- **Mục đích**: Quản lý sách hỏng hoặc mất
- **Luồng**: Thủ thư nhận trả sách hỏng → Đánh dấu "Damaged" hoặc "Lost" → Hệ thống tính phí phạt → Gửi notification tới sinh viên → Cập nhật inventory
- **Giá trị**: Quản lý tài sản chặt chẽ, quy trình xử lý rõ ràng
- **Độ khó**: `Medium`
- **Gợi ý**: Thêm `condition` vào borrowing return flow, bảng `fines` (borrowing_id, amount, reason, status, paid_at)

#### 4.3 Fine / Payment System
- **Mục đích**: Tính phí trễ hạn tự động
- **Luồng**: Sách quá hạn → Scheduled job tính: days_overdue × rate_per_day → Cập nhật `fines` → Hiển thị trên trang sinh viên → Admin mark "Đã thu" → Clear debt trước khi cho mượn tiếp
- **Giá trị**: Tăng tính trách nhiệm, quy trình thu phí minh bạch
- **Độ khó**: `Medium`
- **Gợi ý**: Bảng `fines`, LibrarySetting thêm `fine_per_day`, Command `CalculateOverdueFines` chạy daily

#### 4.4 Advanced Report Dashboard
- **Mục đích**: Dashboard phân tích chi tiết với nhiều loại biểu đồ
- **Luồng**: Admin mở Reports → Chọn khoảng thời gian → Hiển thị: Top sách mượn nhiều, Trend mượn theo tháng, Tỷ lệ trả đúng hạn, Sách chưa bao giờ được mượn, Sinh viên tích cực nhất
- **Giá trị**: Data-driven decision making
- **Độ khó**: `Medium`
- **Gợi ý**: Aggregate queries backend, Recharts / Chart.js frontend. Export PDF/Excel

#### 4.5 Export Excel / PDF
- **Mục đích**: Xuất báo cáo dạng file
- **Luồng**: Admin chọn loại báo cáo + khoảng thời gian → Bấm "Xuất Excel" hoặc "Xuất PDF" → Backend generate file → Download
- **Giá trị**: Báo cáo offline, gửi cho quản lý
- **Độ khó**: `Easy`
- **Gợi ý**: `maatwebsite/excel` cho Excel, `barryvdh/laravel-dompdf` cho PDF

#### 4.6 Maintenance Mode
- **Mục đích**: Chế độ bảo trì hệ thống
- **Luồng**: Admin bật maintenance → Tất cả user thấy trang "Hệ thống đang bảo trì" → Admin vẫn truy cập bình thường → Admin tắt maintenance → Hệ thống hoạt động lại
- **Giá trị**: Nâng cấp DB, deploy mà không gây lỗi cho user
- **Độ khó**: `Easy`
- **Gợi ý**: Laravel built-in `php artisan down --secret=xxx`, FE check header `Retry-After`

---

### Module 5: Security Features 🔒

#### 5.1 Login History & Device Tracking
- **Mục đích**: Xem lịch sử đăng nhập và quản lý thiết bị
- **Luồng**: Mỗi lần login → Ghi log (ip, user_agent, device_type, location, timestamp) → User xem trong Settings → Phát hiện login lạ → "Đăng xuất thiết bị này"
- **Giá trị**: An ninh tài khoản, phát hiện truy cập trái phép
- **Độ khó**: `Medium`
- **Gợi ý**: Bảng `login_histories`, parse user-agent với `jenssegers/agent`, revoke token cụ thể qua Sanctum

#### 5.2 Rate Limiting nâng cao
- **Mục đích**: Chống spam và brute force chi tiết hơn
- **Luồng**: Config rate limit per endpoint: Login 5/min, API 60/min, Search 30/min → Vượt quota → 429 Too Many Requests → Tự động block IP sau 10 lần vi phạm liên tiếp
- **Giá trị**: DDoS mitigation cơ bản, bảo vệ resource
- **Độ khó**: `Easy`
- **Gợi ý**: Laravel `RateLimiter` đã có, cần custom per-route. Thêm middleware `BlockSuspiciousIp`

#### 5.3 Session Management
- **Mục đích**: Quản lý phiên đăng nhập active
- **Luồng**: User mở Settings → Xem danh sách sessions active (device, IP, last activity) → Bấm "Revoke" session cụ thể hoặc "Đăng xuất tất cả"
- **Giá trị**: Kiểm soát tài khoản, đăng xuất từ xa khi mất thiết bị
- **Độ khó**: `Easy`
- **Gợi ý**: Sanctum `currentAccessToken()->delete()`, list `personal_access_tokens` per user

#### 5.4 Password Policy & Two-Factor Authentication
- **Mục đích**: Chính sách mật khẩu mạnh + xác thực 2 lớp
- **Luồng**: Register/Change password → Validate: ≥8 ký tự, có uppercase, number, special char → Bật 2FA → Login bình thường → Nhập OTP từ email/app → Access granted
- **Giá trị**: Bảo mật tài khoản nâng cao
- **Độ khó**: `Medium`
- **Gợi ý**: Đã có OTP infrastructure, mở rộng cho login 2FA. TOTP với `pragmarx/google2fa`

#### 5.5 Secure File Upload Validation
- **Mục đích**: Kiểm tra file upload chặt chẽ hơn
- **Luồng**: Upload file → Check MIME type thực sự (không chỉ extension) → Scan virus signature cơ bản → Limit file size → Rename file → Lưu ngoài webroot
- **Giá trị**: Ngăn upload malware, directory traversal
- **Độ khó**: `Easy`
- **Gợi ý**: Laravel validation `mimes:pdf,epub`, `max:20480`, `Storage::disk('private')`

---

### Module 6: Analytics & Monitoring 📊

#### 6.1 User Analytics Dashboard
- **Mục đích**: Theo dõi hành vi người dùng
- **Luồng**: Thu thập events (page views, searches, borrows) → Aggregate → Dashboard hiển thị: DAU/MAU, Top searches, Bounce rate, Average session duration
- **Giá trị**: Hiểu user behavior để cải thiện sản phẩm
- **Độ khó**: `Medium`
- **Gợi ý**: Bảng `analytics_events`, Laravel Middleware log page views, Dashboard admin mới

#### 6.2 Popular Books & Trending
- **Mục đích**: Xếp hạng sách theo độ hot
- **Luồng**: Count borrows + views + favorites per book per time window → Tính weighted score → Hiển thị "Trending This Week" trên Home → Badge "🔥 Hot" trên card
- **Giá trị**: Social proof, FOMO effect tăng mượn
- **Độ khó**: `Easy`
- **Gợi ý**: Aggregate query trực tiếp, hoặc cache trong `books.popularity_score`, update daily

#### 6.3 Borrowing Trends Chart
- **Mục đích**: Biểu đồ xu hướng mượn/trả theo thời gian
- **Luồng**: Admin chọn range → Line chart: mượn vs trả theo ngày/tuần/tháng → Pie chart: phân bổ theo category → Bar chart: top 10 sách
- **Giá trị**: Forecast demand, planning mua sách mới
- **Độ khó**: `Easy`
- **Gợi ý**: Đã có AdminReports, mở rộng queries và chart types

#### 6.4 System Health Monitoring
- **Mục đích**: Giám sát sức khỏe hệ thống
- **Luồng**: Endpoint `/health` check: DB connection, Disk space, Queue status, Memory usage → Dashboard hiển thị traffic icon xanh/đỏ → Alert khi disk > 90%
- **Giá trị**: Proactive monitoring, uptime guarantee
- **Độ khó**: `Easy`
- **Gợi ý**: Laravel health check endpoint, FE polling mỗi 60s

---

### Module 7: Real-world Enterprise Features 🏢

#### 7.1 Multi-Branch Library
- **Mục đích**: Hỗ trợ nhiều chi nhánh thư viện
- **Luồng**: Thêm bảng `branches` → Mỗi sách thuộc 1 branch → Student chọn branch → Xem sách theo branch → Mượn/trả tại branch đó → Admin quản lý per-branch
- **Giá trị**: Scalable cho trường có nhiều cơ sở
- **Độ khó**: `Hard`
- **Gợi ý**: `branch_id` FK trên books, borrowing. Middleware scope query theo branch

#### 7.2 Barcode System (Mã vạch sách)
- **Mục đích**: In và quét mã vạch cho sách vật lý
- **Luồng**: Admin tạo sách → Hệ thống generate barcode (ISBN hoặc internal code) → In nhãn dán → Thủ thư quét barcode khi cho mượn/trả → Auto-fill thông tin
- **Giá trị**: Giảm sai sót nhập liệu, tăng tốc quy trình
- **Độ khó**: `Easy`
- **Gợi ý**: `milon/barcode` PHP package, đã có QR infrastructure → mở rộng cho barcode

#### 7.3 Email Automation nâng cao
- **Mục đích**: Tự động gửi email theo trigger events
- **Luồng**: Cấu hình email templates: Sắp hết hạn (3 ngày trước), Quá hạn, Sách available (reservation), Welcome email, Monthly summary → Queue job gửi background
- **Giá trị**: Giảm tỷ lệ trả trễ, tăng engagement
- **Độ khó**: `Medium`
- **Gợi ý**: Đã có Mail infrastructure. Thêm Mailable classes + scheduled commands

#### 7.4 API Documentation (Swagger/OpenAPI)
- **Mục đích**: Tài liệu API tự động
- **Luồng**: Annotate controllers → Generate OpenAPI spec → Swagger UI tại `/api/docs` → Developers test trực tiếp
- **Giá trị**: Documentation is code, dễ bảo trì, chuyên nghiệp khi demo
- **Độ khó**: `Easy`
- **Gợi ý**: `darkaonline/l5-swagger` hoặc `dedoc/scramble` (auto-generate, zero config)

#### 7.5 Webhook Support
- **Mục đích**: Gửi event tới external systems
- **Luồng**: Admin cấu hình webhook URL + events (book_created, borrow_approved...) → Khi event xảy ra → POST JSON payload tới URL → Retry 3 lần nếu fail
- **Giá trị**: Integration với hệ thống khác (ERP, LMS)
- **Độ khó**: `Medium`
- **Gợi ý**: Bảng `webhooks` (url, events, secret), Job `DispatchWebhook`

---

### Module 8: Technical / Architecture Improvements ⚙️

#### 8.1 Caching Strategy
- **Mục đích**: Giảm tải DB, tăng response time
- **Luồng**: Cache book list 5 phút, Cache dashboard stats 15 phút, Cache-busting khi CRUD → Response time giảm 70%
- **Giá trị**: Performance, scalability
- **Độ khó**: `Easy`
- **Gợi ý**: Laravel Cache (file driver cho SQLite setup), `Cache::remember()` trên hot queries

#### 8.2 Queue / Background Jobs
- **Mục đích**: Xử lý tasks nặng ở background
- **Luồng**: Send email → Queue → Worker xử lý → Không block HTTP response. Tương tự cho: AI summary generation, Report export, Watermark PDF
- **Giá trị**: Response time nhanh, non-blocking UX
- **Độ khó**: `Easy` (đã có cơ sở)
- **Gợi ý**: Đã có jobs table migration. Chạy `php artisan queue:work`. Dùng database driver

#### 8.3 API Versioning
- **Mục đích**: Versioned API cho backward compatibility
- **Luồng**: `/api/v1/books`, `/api/v2/books` → V1 vẫn hoạt động khi V2 có breaking changes
- **Giá trị**: Professional API design, không break mobile clients
- **Độ khó**: `Easy`
- **Gợi ý**: Route prefix grouping, separate controller namespaces

#### 8.4 Repository Pattern
- **Mục đích**: Tách business logic khỏi controller
- **Luồng**: Controller → Service → Repository → Model. Controller chỉ handle HTTP, Service chứa business logic, Repository chứa data access
- **Giá trị**: Testable, maintainable, clean architecture
- **Độ khó**: `Medium`
- **Gợi ý**: Tạo `app/Repositories/`, `app/Services/` directories. Refactor từng controller dần

#### 8.5 Docker Deployment
- **Mục đích**: Containerize ứng dụng
- **Luồng**: Dockerfile cho BE (PHP-FPM + Nginx) → Dockerfile cho FE (Node build + Nginx serve) → docker-compose.yml orchestrate cả hai
- **Giá trị**: "Works on my machine" → "Works everywhere"
- **Độ khó**: `Medium`
- **Gợi ý**: Laravel Sail đã có trong dev deps. Tạo production Dockerfile riêng

#### 8.6 CI/CD Pipeline
- **Mục đích**: Automated testing và deployment
- **Luồng**: Push code → GitHub Actions: Lint → Test BE → Test FE → Build → Deploy staging → Manual approve → Deploy production
- **Giá trị**: Quality gate, automated deployment, professional workflow
- **Độ khó**: `Medium`
- **Gợi ý**: `.github/workflows/ci.yml`, separate jobs cho BE và FE

#### 8.7 Error Logging & Monitoring
- **Mục đích**: Thu thập và phân tích lỗi production
- **Luồng**: Exception xảy ra → Log structured JSON → Dashboard hiển thị: error count, stack trace, affected users → Alert khi spike
- **Giá trị**: Detect và fix bugs nhanh hơn
- **Độ khó**: `Easy`
- **Gợi ý**: Laravel built-in logging + custom error handler. Hoặc free tier Sentry/Bugsnag

---

## III. Ma Trận Đánh Giá Effort

### Effort Summary theo Module

| Module | Features | Easy | Medium | Hard | Tổng Effort |
|--------|----------|------|--------|------|-------------|
| UX Features | 7 | 5 | 2 | 0 | ~4-5 ngày |
| AI Features | 5 | 1 | 3 | 1 | ~5-7 ngày |
| Digital Library | 5 | 1 | 2 | 2 | ~7-10 ngày |
| Admin & Staff | 6 | 2 | 3 | 0 | ~5-7 ngày |
| Security | 5 | 2 | 2 | 0 | ~3-4 ngày |
| Analytics | 4 | 3 | 1 | 0 | ~3-4 ngày |
| Enterprise | 5 | 2 | 2 | 1 | ~5-7 ngày |
| Technical | 7 | 4 | 3 | 0 | ~5-7 ngày |
| **Tổng** | **44** | **20** | **18** | **4** | **~37-51 ngày** |

### Effort Classification

| Độ khó | Thời gian ước tính | Ví dụ |
|--------|-------------------|-------|
| `Easy` | 0.5 – 1 ngày | Wishlist, Skeleton loading, Cache |
| `Medium` | 1 – 3 ngày | Audit log, AI recommendation, Reservation |
| `Hard` | 3 – 5 ngày | Semantic search, PDF reader + annotations, Watermark |

---

## IV. Recommendation: Lộ Trình Phát Triển

### 🏆 Phase 1 — "Demo-Ready Essentials" (5-7 ngày)
> Ưu tiên cao nhất: wow factor + chiều sâu cho capstone

| # | Feature | Lý do ưu tiên |
|---|---------|---------------|
| 1 | **AI Chatbot tìm sách** | Wow factor khi demo, đã có Gemini SDK |
| 2 | **AI Book Recommendation** | Thể hiện AI integration depth |
| 3 | **Online PDF Reader** | Core feature thư viện số, thiếu = thiếu sản phẩm |
| 4 | **Wishlist / Favorites** | Quick win, nền tảng cho recommendation |
| 5 | **Reservation Queue** | Business logic sâu, thể hiện system design |
| 6 | **Book Rating & Review** | Social feature, data cho AI |

### 🔧 Phase 2 — "Professional Quality" (5-7 ngày)
> Nâng chất lượng production-grade

| # | Feature | Lý do |
|---|---------|-------|
| 7 | **Audit Log System** | Enterprise must-have |
| 8 | **Fine / Payment System** | Business logic thực tế |
| 9 | **Advanced Reports + Export** | Data-driven management |
| 10 | **Login History & Device Tracking** | Security depth |
| 11 | **Smart Search + Autocomplete** | UX polish |
| 12 | **Email Automation (overdue reminders)** | Automation showcase |

### 🚀 Phase 3 — "Enterprise Grade" (5-7 ngày)
> Differentiation từ các đồ án khác

| # | Feature | Lý do |
|---|---------|-------|
| 13 | **AI Auto Tag + Summary** | Full AI integration story |
| 14 | **Reading Progress Sync** | Digital library completeness |
| 15 | **Docker + CI/CD** | DevOps maturity |
| 16 | **API Documentation (Swagger)** | Professional API |
| 17 | **Caching + Queue optimization** | Performance architecture |
| 18 | **System Health Monitoring** | Enterprise monitoring |

### ✨ Phase 4 — "Nice-to-Have Polish" (nếu còn thời gian)

| # | Feature |
|---|---------|
| 19 | Bookmark & Highlight trong PDF |
| 20 | Keyboard Shortcuts |
| 21 | Download Limitation + Watermark |
| 22 | Multi-Branch Library |
| 23 | Webhook Support |
| 24 | Barcode System |

---

## V. Chiến Lược Tối Ưu Cho Demo Capstone

> [!IMPORTANT]
> **Nguyên tắc vàng**: Thà có 10 tính năng hoàn thiện hơn 20 tính năng dở dang.

### Các điểm nhấn khi demo

1. **AI Story**: Chatbot → Recommendation → Auto-tag → Summary = "Hệ thống tích hợp AI xuyên suốt"
2. **Workflow Depth**: Pending → Approved → QR Scan → Borrowed → Overdue fine → Returned → Review = "Luồng nghiệp vụ thực tế"
3. **Digital First**: Online reader → Progress sync → Reservation queue = "Thư viện số thực sự, không chỉ quản lý sách"
4. **Security Showcase**: OTP → OAuth → Login history → Device management → Audit log = "Enterprise security"
5. **Data-Driven**: Analytics dashboard → Trends → Export reports = "Management tool, không chỉ CRUD"

### Tech Highlights cho slide

- **Laravel 12** + React 19 + TypeScript = Modern stack
- **Gemini AI** integration (chat, recommendations, embeddings)
- **5-state workflow** with QR code verification
- **Real-time notifications** with SSE
- **OAuth2** social login + OTP 2FA
- **SQLite FTS5** full-text search
- **Audit logging** + activity tracking
- **Queue-based** background processing
- **Docker-ready** deployment

---

> [!TIP]
> **Recommendation cuối cùng**: Tập trung vào **Phase 1 + Phase 2** (~12-14 ngày) là đủ để tạo ra sản phẩm ấn tượng. Phase 1 mang lại wow factor (AI + Digital), Phase 2 mang lại chiều sâu chuyên nghiệp (Security + Business logic). Đây là combo tối ưu cho điểm số capstone.

