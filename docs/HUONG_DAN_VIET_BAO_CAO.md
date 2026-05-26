# HƯỚNG DẪN VIẾT NỘI DUNG BÁO CÁO
## Hệ thống Quản lý Thư viện – Laravel 12 + React 19

> **Lưu ý:** Đây là tài liệu hướng dẫn chi tiết cho từng mục trong Mục lục đề xuất.  
> Mỗi mục có gợi ý nội dung, sơ đồ cần vẽ, bảng cần tạo và độ dài ước tính.

---

## DANH SÁCH HÌNH VẼ / BẢNG / CHỮ VIẾT TẮT

### Danh mục Chữ viết tắt cần liệt kê

| Ký hiệu | Nghĩa đầy đủ |
|---|---|
| API | Application Programming Interface |
| RBAC | Role-Based Access Control |
| REST | Representational State Transfer |
| SPA | Single Page Application |
| OTP | One-Time Password |
| OAuth | Open Authorization |
| ORM | Object-Relational Mapping |
| ERD | Entity Relationship Diagram |
| DFD | Data Flow Diagram |
| UC | Use Case |
| JWT | JSON Web Token |
| IPN | Instant Payment Notification |
| i18n | Internationalization |
| UI/UX | User Interface / User Experience |
| CSV | Comma-Separated Values |
| CRUD | Create, Read, Update, Delete |
| MVC | Model-View-Controller |
| AI | Artificial Intelligence |
| LLM | Large Language Model |
| VNPay | Cổng thanh toán Vietnam Payment |
| MoMo | Mobile Money – Ví điện tử MoMo |

---

## CHƯƠNG 1: TỔNG QUAN ĐỀ TÀI

### 1.1. Bối cảnh và lý do chọn đề tài
**Nội dung cần viết:**
- Thực trạng quản lý thư viện truyền thống (sổ sách thủ công, khó tra cứu, mất thời gian)
- Nhu cầu số hóa thư viện trong môi trường giáo dục đại học
- Xu hướng ứng dụng công nghệ (web app, AI, thanh toán điện tử) vào quản lý thư viện
- Lý do nhóm chọn xây dựng hệ thống này (kết hợp học thuật + thực tiễn)

**Độ dài gợi ý:** 1–1.5 trang

### 1.2. Mục tiêu đề tài

**1.2.1. Mục tiêu tổng quát**
- Xây dựng hệ thống quản lý thư viện trực tuyến toàn diện, thay thế quy trình thủ công

**1.2.2. Mục tiêu cụ thể**
Liệt kê dạng bullet:
- Xây dựng hệ thống xác thực đa vai trò (Student / Librarian / Admin) với Sanctum
- Cung cấp quy trình mượn – trả sách tự động với kiểm soát tồn kho thời gian thực
- Tích hợp hàng đợi đặt chỗ tự động khi sách hết
- Hỗ trợ thanh toán tiền phạt trực tuyến (MoMo / VNPay)
- Tích hợp trợ lý AI Gemini để gợi ý sách và hỗ trợ tra cứu
- Cung cấp hệ thống đặt phòng học với check-in qua mã xác nhận
- Hỗ trợ song ngữ Tiếng Việt / Tiếng Anh

### 1.3. Phạm vi hệ thống

**1.3.1. In-Scope** – Giữ nguyên nội dung đang có trong báo cáo hiện tại (Chương 2.1), bổ sung thêm:
- Phòng học (Study Room Booking)
- Tài nguyên số (Digital Documents – PDF/EPUB)
- Thông báo Email tự động

**1.3.2. Out-of-Scope** – Giữ nguyên từ báo cáo hiện tại (Chương 2.2)

### 1.4. Ý nghĩa thực tiễn
- Ý nghĩa với sinh viên: tra cứu và mượn sách nhanh, quản lý khoản phạt minh bạch
- Ý nghĩa với thư viện: giảm tải công việc thủ công, số liệu chính xác, báo cáo tự động
- Ý nghĩa kỹ thuật: áp dụng các công nghệ hiện đại (Laravel 12, React 19, AI, Payment Gateway)

### 1.5. Cấu trúc báo cáo
Mô tả ngắn gọn từng chương (1 câu mỗi chương), tổng 8 chương.

---

## CHƯƠNG 2: CƠ SỞ LÝ THUYẾT VÀ CÔNG NGHỆ SỬ DỤNG

### 2.1. Tổng quan về hệ thống quản lý thư viện
- Định nghĩa Library Management System (LMS)
- Các chức năng cốt lõi của LMS hiện đại
- Tham khảo các hệ thống thực tế (Koha, Evergreen, v.v.)

### 2.2. Kiến trúc ứng dụng Web hiện đại
**Bảng so sánh cần tạo:**
| Tiêu chí | MPA (Multi-page) | SPA (Single-page) |
|---|---|---|
| Tốc độ tải | Chậm hơn | Nhanh hơn (sau lần đầu) |
| SEO | Tốt | Cần SSR |
| Trải nghiệm | Giật | Mượt |
| Phù hợp với đề tài | Không | ✅ |

### 2.3. Công nghệ Backend

**Bảng so sánh framework PHP:**
| Framework | Phiên bản | Ưu điểm | Nhược điểm |
|---|---|---|---|
| Laravel | 12 | Eloquent ORM mạnh, Sanctum tích hợp sẵn | Nặng hơn micro-frameworks |
| Slim | 4 | Nhẹ, linh hoạt | Ít tính năng built-in |
| CodeIgniter | 4 | Đơn giản | Ít cộng đồng |
→ **Lý do chọn Laravel 12:** Hệ sinh thái đầy đủ, tích hợp Sanctum, Queue, Mail, phù hợp dự án quy mô vừa

**2.3.2. Database Transaction:**
Giải thích `DB::transaction()` và `lockForUpdate()` – tại sao cần thiết khi duyệt mượn sách:
```php
DB::transaction(function () {
    $loan = Borrowing::lockForUpdate()->findOrFail($loanId);
    $book = Book::lockForUpdate()->findOrFail($loan->book_id);
    // ... approve logic
});
```

### 2.4. Công nghệ Frontend

**Bảng so sánh React vs Vue vs Angular:**
| Tiêu chí | React 19 | Vue 3 | Angular 17 |
|---|---|---|---|
| Kiểu | Library | Framework | Framework |
| Learning curve | Trung bình | Dễ | Khó |
| Hiệu năng | Cao | Cao | Trung bình |
| Lý do chọn | ✅ Hệ sinh thái rộng | — | — |

### 2.5. Gemini AI
- Giới thiệu Google Gemini API
- Hai use case trong hệ thống: Chatbot hỏi đáp + Gợi ý sách cá nhân hóa
- Sơ đồ luồng AI Chat (prompt → Gemini → response)

### 2.6. Cổng thanh toán VNPay / MoMo
- Giải thích luồng IPN (Instant Payment Notification)
- Sơ đồ luồng: Student → MoMo → IPN callback → Laravel xác nhận → cập nhật fine

### 2.7. Lý do lựa chọn công nghệ
**Bảng tổng hợp:**
| Thành phần | Công nghệ chọn | Lý do |
|---|---|---|
| Backend | Laravel 12 | Sanctum, Eloquent, Queue, Mail |
| Database | SQLite | Đơn giản, không cần server riêng cho dev |
| Frontend | React 19 | Hệ sinh thái, TypeScript, hiệu năng |
| Styling | TailwindCSS 4 | Utility-first, dark mode, responsive |
| Auth | Laravel Sanctum | Token-based, đa vai trò |
| AI | Gemini API | Miễn phí sandbox, đa ngôn ngữ |
| Payment | MoMo / VNPay | Phổ biến tại Việt Nam |
| Testing BE | PHPUnit | Tích hợp sẵn Laravel |
| Testing FE | Vitest + RTL | Nhanh, tích hợp Vite |

---

## CHƯƠNG 3: PHÂN TÍCH YÊU CẦU HỆ THỐNG

### 3.1. Xác định tác nhân
**Bảng Actor:**
| Actor | Mô tả | Vai trò trong hệ thống |
|---|---|---|
| Sinh viên (Student) | Người dùng cuối, có tài khoản thành viên | Mượn sách, đặt phòng, thanh toán phạt |
| Thủ thư (Librarian) | Nhân viên thư viện | Duyệt mượn, quản lý sách, phê duyệt phòng |
| Quản trị viên (Admin) | Thủ thư cấp cao | Toàn quyền + quản lý nhân viên, báo cáo |

### 3.4. Sơ đồ Use Case
**Cần vẽ 4 sơ đồ** (giữ từ báo cáo hiện tại + bổ sung sơ đồ Admin riêng):
- Use Case tổng quan (tất cả actor)
- Use Case Sinh viên (chi tiết)
- Use Case Thủ thư (chi tiết)  
- Use Case Quản trị viên (chi tiết – bao gồm waive fine, manage librarians, audit log)

### 3.5. Đặc tả Use Case
**Template cho mỗi UC:**
```
Mã UC: UC-0X
Tên Use Case: [Tên]
Tác nhân: [Actor]
Điều kiện tiền đề (Pre-condition): ...
Điều kiện hậu đề (Post-condition): ...
Luồng chính (Main Flow):
  1. ...
  2. ...
Luồng thay thế (Alternative Flow):
  A1. Nếu ... thì ...
Luồng ngoại lệ (Exception Flow):
  E1. Nếu ... thì ...
```

**Giữ toàn bộ UC đặc tả hiện có** (từ Chương 2.4.4 báo cáo hiện tại).  
**Bổ sung thêm:**
- UC-06: Đặt phòng học
- UC-07: Thanh toán tiền phạt MoMo
- UC-08: Waive fine (Admin)
- UC-09: AI Chatbot
- UC-10: Xuất CSV báo cáo

### 3.6. Biểu đồ Trình tự
**Giữ 3 sequence diagram hiện có.** Bổ sung thêm:
- Sequence: Thanh toán MoMo (Student → FE → BE → MoMo → IPN → BE → Student)
- Sequence: Đặt phòng và check-in

### 3.7. Sơ đồ Trạng thái
**Borrowing State Machine:**
```
pending → approved → borrowed → returned
pending → rejected
approved → rejected (nếu hủy trước khi nhận)
```

**Room Booking State Machine:**
```
pending → approved → checked_in → checked_out
pending → rejected
approved → cancelled
```

### 3.8. DFD
**DFD Mức 0:** 1 ô hệ thống trung tâm, các tác nhân bên ngoài (Student, Librarian, Admin, MoMo, Google, Gemini AI), các luồng dữ liệu vào/ra.

**DFD Mức 1:** Phân rã thành 5–6 tiến trình con:
1. Xác thực người dùng
2. Quản lý sách
3. Mượn – trả – đặt chỗ
4. Phạt – thanh toán
5. Phòng học
6. Báo cáo & thống kê

---

## CHƯƠNG 4: THIẾT KẾ HỆ THỐNG

### 4.1. Kiến trúc tổng thể
**Sơ đồ Component cần vẽ:**
```
[React FE] ←→ [Laravel API] ←→ [SQLite DB]
                    ↕
              [Google Gemini AI]
                    ↕
              [MoMo / VNPay Gateway]
                    ↕
              [Email Server (SMTP)]
```

**Giải thích kiến trúc phân tầng:**
- Presentation Layer: React 19 (Vite, TailwindCSS 4)
- API Layer: Laravel 12 REST API (Sanctum, Middleware)
- Business Logic Layer: Services, Controllers, FormRequests
- Data Layer: Eloquent ORM, SQLite

### 4.2. Thiết kế CSDL
**Giữ toàn bộ ERD và bảng từ Chương 3.2 báo cáo hiện tại.**  
**Bổ sung mô tả các bảng còn thiếu:**
- `rooms`, `room_bookings`
- `notifications`, `audit_logs`
- `library_settings` (giải thích là Singleton pattern)
- `favorites`, `reviews`, `reading_progress`

### 4.3. Thiết kế RESTful API
**Giữ toàn bộ từ Chương 3.3 báo cáo hiện tại.**  
**Bổ sung thêm** các nhóm API còn thiếu:
- Reservation API
- Study Room API
- AI API
- Notification API
- Audit Log API

**Format bảng API chuẩn:**
| Method | Endpoint | Mô tả | Phân quyền |
|---|---|---|---|
| POST | /api/login | Đăng nhập | Public |
| ... | ... | ... | ... |

### 4.4. Thiết kế RBAC
**Ma trận phân quyền cần tạo:**

| Permission | Student | Librarian | Admin |
|---|---|---|---|
| manage_books | ❌ | ✅ | ✅ |
| manage_members | ❌ | ✅ | ✅ |
| approve_requests | ❌ | ✅ | ✅ |
| manage_rooms | ❌ | ✅ | ✅ |
| manage_librarians | ❌ | ❌ | ✅ |
| waive_fines | ❌ | ❌ | ✅ |
| view_audit_logs | ❌ | ❌ | ✅ |
| view_reports | ❌ | ❌ | ✅ |
| manage_settings | ❌ | ❌ | ✅ |

### 4.5. Thiết kế UI Mockup
**Di chuyển toàn bộ hình ảnh giao diện từ Chương 4.2 báo cáo hiện tại vào đây.**  
Bổ sung thêm mô tả nguyên tắc thiết kế:
- Bảng màu sắc (primary, secondary, dark/light variables)
- Typography (font family, size hierarchy)
- Responsive breakpoints

---

## CHƯƠNG 5: TRIỂN KHAI HỆ THỐNG

### 5.1. Môi trường phát triển
**Bảng yêu cầu hệ thống:**
| Thành phần | Phiên bản | Mục đích |
|---|---|---|
| PHP | 8.2+ | Backend runtime |
| Composer | 2.x | PHP dependency manager |
| Node.js | 18+ | Frontend build tool |
| npm | 9+ | JS package manager |
| SQLite | 3.x | Database (development) |
| Laravel | 12.x | Backend framework |
| React | 19.x | Frontend library |

**Giữ toàn bộ hướng dẫn cài đặt từ Chương 4.1 báo cáo hiện tại.**

### 5.2. Triển khai Backend
**5.2.3. DB Transaction (quan trọng – cần code minh họa):**

```php
// BorrowingController::approve()
DB::transaction(function () use ($loanId, $librarian) {
    $loan = Borrowing::lockForUpdate()->findOrFail($loanId);
    // Validate business rules...
    $book = Book::lockForUpdate()->findOrFail($loan->book_id);
    // Update loan & inventory...
});
```

**5.2.4. Reservation Queue (cần code + sơ đồ luồng):**
Khi sách được trả → hệ thống tự động kiểm tra hàng đợi → kích hoạt reservation tiếp theo → gửi email thông báo cho sinh viên tiếp theo.

**5.2.5 – 5.2.7:** Bổ sung mới hoàn toàn – trình bày code snippet + sơ đồ luồng cho AI, VNPay/MoMo, Email.

**Giữ toàn bộ nội dung từ Chương 4.1 và 4.2 báo cáo hiện tại.**

### 5.3. Triển khai Frontend
**Giữ toàn bộ nội dung từ Chương 4.2 báo cáo hiện tại.**  
**Bổ sung mới:**
- 5.3.6: Mô tả Floating Chatbot (component, state management, API call)
- 5.3.7: Giải thích cấu trúc i18n (en.json / vi.json), cách switch ngôn ngữ

---

## CHƯƠNG 6: KIỂM THỬ HỆ THỐNG

### 6.1. Chiến lược kiểm thử
**Bảng chiến lược:**
| Loại kiểm thử | Công cụ | Phạm vi |
|---|---|---|
| Unit Test (BE) | PHPUnit | Models, Controllers, Services |
| Feature Test (BE) | PHPUnit | API endpoints end-to-end |
| Unit Test (FE) | Vitest | Components, hooks |
| Integration Test (FE) | React Testing Library | User interactions |
| Manual Test | Postman | API endpoints |
| Performance Test | Browser DevTools | Tốc độ tải trang |

### 6.2 – 6.3. Kiểm thử Backend + Frontend
**Giữ toàn bộ nội dung từ Chương 5 báo cáo hiện tại.**

### 6.4. Kiểm thử phi chức năng
**Bổ sung mới:**

**Test Cases phi chức năng cần viết:**
| ID | Tiêu chí | Kết quả mong đợi | Kết quả thực tế |
|---|---|---|---|
| NFR-01 | Đăng nhập < 2 giây | ≤ 2000ms | [điền kết quả] |
| NFR-02 | Danh sách sách < 3 giây | ≤ 3000ms | [điền kết quả] |
| NFR-03 | Truy cập role khác bị chặn | HTTP 403 | [điền kết quả] |
| NFR-04 | Token hết hạn bị từ chối | HTTP 401 | [điền kết quả] |

### 6.5. Kết quả kiểm thử tổng hợp
**Bảng tổng hợp:**
| Nhóm Test | Tổng số | Passed | Failed | Tỷ lệ |
|---|---|---|---|---|
| Backend (PHPUnit) | [n] | [n] | 0 | 100% |
| Frontend (Vitest) | [n] | [n] | 0 | 100% |
| Manual (Postman) | [n] | [n] | 0 | 100% |

---

## CHƯƠNG 7: ĐÁNH GIÁ VÀ CẢI TIẾN

### 7.1.1. Mức độ hoàn thành
**Bảng đối chiếu mục tiêu – kết quả:**
| Mục tiêu cụ thể | Trạng thái | Ghi chú |
|---|---|---|
| Xác thực đa vai trò | ✅ Hoàn thành | Sanctum + 3 roles |
| Mượn – trả với kiểm soát tồn kho | ✅ Hoàn thành | DB Transaction |
| Hàng đợi đặt chỗ | ✅ Hoàn thành | Tự động kích hoạt |
| Thanh toán MoMo | ✅ Hoàn thành | IPN Sandbox |
| Gemini AI Chatbot | ✅ Hoàn thành | |
| Phòng học | ✅ Hoàn thành | Check-in qua mã |
| Song ngữ | ✅ Hoàn thành | vi / en |
| Mobile responsive | ✅ Hoàn thành | TailwindCSS |

### 7.2. Hạn chế
**Giữ nội dung từ Chương 6.2 báo cáo hiện tại.**

### 7.3. Hướng phát triển
**Giữ nội dung từ Chương 6.3 báo cáo hiện tại.** Bổ sung:
- Chuyển sang MySQL/PostgreSQL cho production
- Thêm kiểm thử tải (Load Testing với k6)
- Progressive Web App (PWA) cho mobile

---

## CHƯƠNG 8: KẾT LUẬN

**Giữ nội dung từ Chương 6.1 – 6.2 báo cáo hiện tại.**  
Bổ sung phần tóm tắt các đóng góp kỹ thuật của hệ thống.

---

## TÀI LIỆU THAM KHẢO
**Format chuẩn IEEE (thường dùng trong đồ án kỹ thuật):**
```
[1] Taylor, O. et al. (2024). Laravel Documentation – Version 12. Retrieved from https://laravel.com/docs/12.x
[2] Facebook Inc. (2024). React Documentation – Version 19. Retrieved from https://react.dev
[3] Google. (2024). Gemini API Documentation. Retrieved from https://ai.google.dev/docs
[4] MoMo. (2024). MoMo Payment Gateway Integration Guide. Retrieved from https://developers.momo.vn
[5] ...
```

---

## PHỤ LỤC
Có thể bao gồm:
- Toàn bộ bảng đặc tả Use Case (nếu quá dài trong thân báo cáo)
- Postman Collection screenshots
- Seeder data sample
- Hướng dẫn cài đặt chi tiết (nếu không đưa vào Chương 5)
