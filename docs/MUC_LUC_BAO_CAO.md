# MỤC LỤC BÁO CÁO – HỆ THỐNG QUẢN LÝ THƯ VIỆN
## (Book Loan Management System – Laravel 12 + React 19)

---

DANH SÁCH HÌNH VẼ .....................................................................................  i  
DANH SÁCH BẢNG ..........................................................................................  ii  
DANH MỤC CÁC KÝ HIỆU VÀ CHỮ VIẾT TẮT ............................................  iii  
LỜI MỞ ĐẦU ....................................................................................................  iv  
BẢNG PHÂN CÔNG CÔNG VIỆC ....................................................................  vi  

---

## CHƯƠNG 1: TỔNG QUAN ĐỀ TÀI

1.1. Bối cảnh và lý do chọn đề tài  
1.2. Mục tiêu đề tài  
&nbsp;&nbsp;&nbsp;&nbsp;1.2.1. Mục tiêu tổng quát  
&nbsp;&nbsp;&nbsp;&nbsp;1.2.2. Mục tiêu cụ thể  
1.3. Phạm vi hệ thống  
&nbsp;&nbsp;&nbsp;&nbsp;1.3.1. Danh sách chức năng thực hiện (In-Scope)  
&nbsp;&nbsp;&nbsp;&nbsp;1.3.2. Danh sách chức năng không thực hiện (Out-of-Scope)  
1.4. Ý nghĩa thực tiễn  
1.5. Cấu trúc báo cáo  

---

## CHƯƠNG 2: CƠ SỞ LÝ THUYẾT VÀ CÔNG NGHỆ SỬ DỤNG

2.1. Tổng quan về hệ thống quản lý thư viện  
&nbsp;&nbsp;&nbsp;&nbsp;2.1.1. Khái niệm và vai trò của hệ thống quản lý thư viện  
&nbsp;&nbsp;&nbsp;&nbsp;2.1.2. Xu hướng số hóa thư viện hiện đại  
2.2. Kiến trúc ứng dụng Web hiện đại  
&nbsp;&nbsp;&nbsp;&nbsp;2.2.1. Mô hình Client–Server và kiến trúc REST  
&nbsp;&nbsp;&nbsp;&nbsp;2.2.2. Mô hình SPA (Single Page Application)  
&nbsp;&nbsp;&nbsp;&nbsp;2.2.3. Cơ chế xác thực Token-Based (Laravel Sanctum)  
2.3. Công nghệ Backend  
&nbsp;&nbsp;&nbsp;&nbsp;2.3.1. Laravel 12 và hệ sinh thái Eloquent ORM  
&nbsp;&nbsp;&nbsp;&nbsp;2.3.2. Cơ sở dữ liệu SQLite và tính nhất quán giao dịch (Database Transactions)  
&nbsp;&nbsp;&nbsp;&nbsp;2.3.3. Hàng đợi công việc (Queue Jobs) và thông báo Email (Mailables)  
2.4. Công nghệ Frontend  
&nbsp;&nbsp;&nbsp;&nbsp;2.4.1. React 19 và hệ thống quản lý trạng thái (Context API)  
&nbsp;&nbsp;&nbsp;&nbsp;2.4.2. TailwindCSS 4 và thiết kế giao diện đa chủ đề (Dark/Light Mode)  
&nbsp;&nbsp;&nbsp;&nbsp;2.4.3. Thư viện kiểm thử Vitest và React Testing Library  
2.5. Tích hợp AI với Gemini API  
2.6. Cổng thanh toán trực tuyến (VNPay / MoMo Sandbox)  
2.7. Lý do lựa chọn công nghệ  
2.8. Kết luận chương  

---

## CHƯƠNG 3: PHÂN TÍCH YÊU CẦU HỆ THỐNG

3.1. Xác định tác nhân (Actor)  
&nbsp;&nbsp;&nbsp;&nbsp;3.1.1. Sinh viên / Thành viên (Student / Member)  
&nbsp;&nbsp;&nbsp;&nbsp;3.1.2. Thủ thư (Librarian)  
&nbsp;&nbsp;&nbsp;&nbsp;3.1.3. Quản trị viên (Admin)  
3.2. Yêu cầu chức năng  
&nbsp;&nbsp;&nbsp;&nbsp;3.2.1. Module Xác thực – Authentication (Đăng nhập, OTP, OAuth, Đặt lại mật khẩu)  
&nbsp;&nbsp;&nbsp;&nbsp;3.2.2. Module Quản lý Sách và Tài nguyên số  
&nbsp;&nbsp;&nbsp;&nbsp;3.2.3. Module Mượn – Trả Sách (Borrowing Workflow)  
&nbsp;&nbsp;&nbsp;&nbsp;3.2.4. Module Đặt chỗ / Hàng đợi chờ (Reservation Queue)  
&nbsp;&nbsp;&nbsp;&nbsp;3.2.5. Module Phòng học (Study Room Booking)  
&nbsp;&nbsp;&nbsp;&nbsp;3.2.6. Module Quản lý Thành viên và Nhân viên  
&nbsp;&nbsp;&nbsp;&nbsp;3.2.7. Module Phạt và Thanh toán (Fine & Payment)  
&nbsp;&nbsp;&nbsp;&nbsp;3.2.8. Module Thông báo và Nhật ký hệ thống (Notification & Audit Log)  
&nbsp;&nbsp;&nbsp;&nbsp;3.2.9. Module Báo cáo và Thống kê  
&nbsp;&nbsp;&nbsp;&nbsp;3.2.10. Module Trợ lý AI (Gemini Chatbot & Gợi ý sách)  
3.3. Yêu cầu phi chức năng  
&nbsp;&nbsp;&nbsp;&nbsp;3.3.1. Hiệu năng và khả năng mở rộng  
&nbsp;&nbsp;&nbsp;&nbsp;3.3.2. Bảo mật hệ thống  
&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;– Xác thực người dùng (Token-Based, OTP, OAuth)  
&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;– Phân quyền theo vai trò (RBAC)  
&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;– Bảo mật API (Throttle, Signed URL)  
&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;– Bảo mật dữ liệu (Hashing, No Plaintext)  
&nbsp;&nbsp;&nbsp;&nbsp;3.3.3. Khả dụng và tính nhất quán dữ liệu  
&nbsp;&nbsp;&nbsp;&nbsp;3.3.4. Khả năng kiểm tra và truy vết (Audit Log)  
&nbsp;&nbsp;&nbsp;&nbsp;3.3.5. Đa ngôn ngữ (i18n: Tiếng Việt / Tiếng Anh)  
3.4. Sơ đồ Use Case  
&nbsp;&nbsp;&nbsp;&nbsp;3.4.1. Sơ đồ Use Case tổng quan  
&nbsp;&nbsp;&nbsp;&nbsp;3.4.2. Sơ đồ Use Case – Sinh viên  
&nbsp;&nbsp;&nbsp;&nbsp;3.4.3. Sơ đồ Use Case – Thủ thư  
&nbsp;&nbsp;&nbsp;&nbsp;3.4.4. Sơ đồ Use Case – Quản trị viên  
3.5. Đặc tả Use Case chi tiết  
&nbsp;&nbsp;&nbsp;&nbsp;3.5.1. UC-01: Đăng nhập và xác thực OTP Email  
&nbsp;&nbsp;&nbsp;&nbsp;3.5.2. UC-02: Đăng nhập qua Google (OAuth)  
&nbsp;&nbsp;&nbsp;&nbsp;3.5.3. UC-03: Gửi yêu cầu mượn sách  
&nbsp;&nbsp;&nbsp;&nbsp;3.5.4. UC-04: Duyệt mượn sách và xác nhận trả sách  
&nbsp;&nbsp;&nbsp;&nbsp;3.5.5. UC-05: Quản lý hàng đợi đặt chỗ (Reservation Queue)  
&nbsp;&nbsp;&nbsp;&nbsp;3.5.6. UC-06: Đặt phòng học và check-in qua mã xác nhận  
&nbsp;&nbsp;&nbsp;&nbsp;3.5.7. UC-07: Thanh toán tiền phạt (VNPay / MoMo / Tiền mặt)  
&nbsp;&nbsp;&nbsp;&nbsp;3.5.8. UC-08: Xóa bỏ (Waive) tiền phạt  
&nbsp;&nbsp;&nbsp;&nbsp;3.5.9. UC-09: Tương tác với trợ lý Gemini AI  
&nbsp;&nbsp;&nbsp;&nbsp;3.5.10. UC-10: Xuất báo cáo thống kê (CSV)  
3.6. Biểu đồ Trình tự (Sequence Diagram)  
&nbsp;&nbsp;&nbsp;&nbsp;3.6.1. Luồng Đăng nhập hệ thống  
&nbsp;&nbsp;&nbsp;&nbsp;3.6.2. Luồng Gửi yêu cầu mượn sách  
&nbsp;&nbsp;&nbsp;&nbsp;3.6.3. Luồng Duyệt mượn và xác nhận trả sách  
&nbsp;&nbsp;&nbsp;&nbsp;3.6.4. Luồng Thanh toán tiền phạt trực tuyến (MoMo IPN)  
&nbsp;&nbsp;&nbsp;&nbsp;3.6.5. Luồng Đặt phòng học và check-in  
3.7. Kết luận chương  

---

## CHƯƠNG 4: THIẾT KẾ HỆ THỐNG

4.1. Kiến trúc tổng thể  
&nbsp;&nbsp;&nbsp;&nbsp;4.1.1. Kiến trúc phân tầng (Layered Architecture)  
&nbsp;&nbsp;&nbsp;&nbsp;4.1.2. Sơ đồ thành phần (Component Diagram)  
4.2. Thiết kế Cơ sở dữ liệu  
&nbsp;&nbsp;&nbsp;&nbsp;4.2.1. Sơ đồ Quan hệ thực thể (ERD)  
&nbsp;&nbsp;&nbsp;&nbsp;4.2.2. Mô tả chi tiết các bảng dữ liệu chính  
&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;– Bảng `books`  
&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;– Bảng `borrowing`  
&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;– Bảng `members`  
&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;– Bảng `librarians`  
&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;– Bảng `fines` và `fine_payments`  
&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;– Bảng `reservations`  
&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;– Bảng `rooms` và `room_bookings`  
&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;– Bảng `notifications` và `audit_logs`  
&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;– Bảng `library_settings`  
&nbsp;&nbsp;&nbsp;&nbsp;4.2.3. Cơ chế Trigger và tính nhất quán dữ liệu (SQLite Triggers)  
4.3. Thiết kế RESTful API  
&nbsp;&nbsp;&nbsp;&nbsp;4.3.1. Nhóm API Xác thực (Authentication)  
&nbsp;&nbsp;&nbsp;&nbsp;4.3.2. Nhóm API Sách và Tài nguyên số  
&nbsp;&nbsp;&nbsp;&nbsp;4.3.3. Nhóm API Mượn – Trả  
&nbsp;&nbsp;&nbsp;&nbsp;4.3.4. Nhóm API Đặt chỗ (Reservation)  
&nbsp;&nbsp;&nbsp;&nbsp;4.3.5. Nhóm API Phòng học (Study Room)  
&nbsp;&nbsp;&nbsp;&nbsp;4.3.6. Nhóm API Phạt và Thanh toán (Fine & Payment)  
&nbsp;&nbsp;&nbsp;&nbsp;4.3.7. Nhóm API Quản trị (Admin: Thành viên, Thủ thư, Cài đặt, Báo cáo)  
&nbsp;&nbsp;&nbsp;&nbsp;4.3.8. Nhóm API AI (Chatbot, Gợi ý sách)  
4.4. Thiết kế Kiến trúc Bảo mật  
&nbsp;&nbsp;&nbsp;&nbsp;4.4.1. Tổng quan các lớp bảo mật (Security Layers Overview)  
&nbsp;&nbsp;&nbsp;&nbsp;4.4.2. Lớp Xác thực (Authentication Layer)  
&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;– Token-Based Authentication với Laravel Sanctum  
&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;– Xác thực Email qua mã OTP (Email Verification)  
&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;– Đăng nhập qua Google OAuth 2.0  
&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;– Luồng đặt lại mật khẩu an toàn (Password Reset OTP)  
&nbsp;&nbsp;&nbsp;&nbsp;4.4.3. Lớp Phân quyền (Authorization Layer – RBAC)  
&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;– Mô hình vai trò và quyền hạn (Role & Permission Model)  
&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;– Ma trận phân quyền (Permission Matrix)  
&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;– Middleware `EnsureUserRole` và `EnsureLibrarianHasPermission`  
&nbsp;&nbsp;&nbsp;&nbsp;4.4.4. Lớp Bảo mật API (API Security Layer)  
&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;– Giới hạn tốc độ yêu cầu (Rate Limiting / Throttle)  
&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;– URL có chữ ký cho tải tài nguyên số (Signed URL)  
&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;– CORS Policy cấu hình giữa Frontend và Backend  
&nbsp;&nbsp;&nbsp;&nbsp;4.4.5. Lớp Bảo mật Dữ liệu (Data Security Layer)  
&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;– Băm mật khẩu với `Hash::make()` (Bcrypt)  
&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;– Không lưu trữ token / OTP dưới dạng văn bản thuần (No Plaintext)  
&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;– Bảo vệ SQL Injection qua Eloquent ORM (Prepared Statements)  
&nbsp;&nbsp;&nbsp;&nbsp;4.4.6. Lớp Bảo mật Frontend (Frontend Security Layer)  
&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;– Bảo vệ định tuyến phía Client (`ProtectedRoute`)  
&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;– Không tin tưởng dữ liệu phía Client cho phân quyền  
&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;– Quản lý phiên và thu hồi token từ xa (Device Management)  
&nbsp;&nbsp;&nbsp;&nbsp;4.4.7. Lớp Kiểm tra và Truy vết (Audit & Monitoring Layer)  
&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;– Nhật ký kiểm tra toàn hệ thống (`audit_logs`)  
&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;– Lịch sử đăng nhập và thiết bị (`login_histories`)  
4.5. Thiết kế Giao diện người dùng (UI Mockup)  
&nbsp;&nbsp;&nbsp;&nbsp;4.5.1. Nguyên tắc thiết kế và hệ thống màu sắc  
&nbsp;&nbsp;&nbsp;&nbsp;4.5.2. Màn hình chung (Đăng nhập, Đăng ký, Trang chủ)  
&nbsp;&nbsp;&nbsp;&nbsp;4.5.3. Màn hình Sinh viên  
&nbsp;&nbsp;&nbsp;&nbsp;4.5.4. Màn hình Thủ thư  
&nbsp;&nbsp;&nbsp;&nbsp;4.5.5. Màn hình Quản trị viên  
4.6. Kết luận chương  

---

## CHƯƠNG 5: TRIỂN KHAI HỆ THỐNG

5.1. Môi trường phát triển  
&nbsp;&nbsp;&nbsp;&nbsp;5.1.1. Yêu cầu hệ thống (Phần cứng và phần mềm)  
&nbsp;&nbsp;&nbsp;&nbsp;5.1.2. Thiết lập và khởi chạy dự án (Backend + Frontend)  
5.2. Triển khai Backend (Laravel 12)  
&nbsp;&nbsp;&nbsp;&nbsp;5.2.1. Cấu trúc thư mục dự án Laravel  
&nbsp;&nbsp;&nbsp;&nbsp;5.2.2. Hệ thống xác thực đa vai trò với Laravel Sanctum  
&nbsp;&nbsp;&nbsp;&nbsp;5.2.3. Xử lý Mượn – Trả với Database Transaction (Pessimistic Locking)  
&nbsp;&nbsp;&nbsp;&nbsp;5.2.4. Hàng đợi Reservation và tự động kích hoạt khi có sách trả  
&nbsp;&nbsp;&nbsp;&nbsp;5.2.5. Tích hợp Gemini AI (Chatbot và Gợi ý sách)  
&nbsp;&nbsp;&nbsp;&nbsp;5.2.6. Tích hợp cổng thanh toán VNPay và MoMo (IPN Callback)  
&nbsp;&nbsp;&nbsp;&nbsp;5.2.7. Hệ thống thông báo Email (Mailables + Queue Jobs)  
&nbsp;&nbsp;&nbsp;&nbsp;5.2.8. Dữ liệu mẫu – Seeders và Factories  
5.3. Triển khai Frontend (React 19)  
&nbsp;&nbsp;&nbsp;&nbsp;5.3.1. Cấu trúc thư mục và kiến trúc module API (src/api/)  
&nbsp;&nbsp;&nbsp;&nbsp;5.3.2. Quản lý phiên đăng nhập (AuthContext + localStorage)  
&nbsp;&nbsp;&nbsp;&nbsp;5.3.3. Các màn hình Sinh viên  
&nbsp;&nbsp;&nbsp;&nbsp;5.3.4. Các màn hình Thủ thư  
&nbsp;&nbsp;&nbsp;&nbsp;5.3.5. Các màn hình Quản trị viên  
&nbsp;&nbsp;&nbsp;&nbsp;5.3.6. Chatbot AI nổi (Floating Gemini Chatbot)  
&nbsp;&nbsp;&nbsp;&nbsp;5.3.7. Hỗ trợ đa ngôn ngữ (i18n – Tiếng Việt / Tiếng Anh)  
5.4. Kết luận chương  

---

## CHƯƠNG 6: KIỂM THỬ HỆ THỐNG

6.1. Chiến lược và kế hoạch kiểm thử  
6.2. Kiểm thử Backend (PHPUnit)  
&nbsp;&nbsp;&nbsp;&nbsp;6.2.1. AuthSecurityTest – Kiểm thử xác thực và phân quyền  
&nbsp;&nbsp;&nbsp;&nbsp;6.2.2. BorrowWorkflowTest – Kiểm thử luồng mượn – trả sách  
&nbsp;&nbsp;&nbsp;&nbsp;6.2.3. DatabaseIntegrityTest – Kiểm thử tính nhất quán dữ liệu  
6.3. Kiểm thử Frontend (Vitest + React Testing Library)  
&nbsp;&nbsp;&nbsp;&nbsp;6.3.1. login.test.tsx – Kiểm thử giao diện đăng nhập  
&nbsp;&nbsp;&nbsp;&nbsp;6.3.2. protected-route.test.tsx – Kiểm thử bảo vệ định tuyến  
&nbsp;&nbsp;&nbsp;&nbsp;6.3.3. admin-requests.test.tsx – Kiểm thử trang quản lý yêu cầu  
6.4. Kiểm thử Yêu cầu phi chức năng  
&nbsp;&nbsp;&nbsp;&nbsp;6.4.1. Kiểm thử hiệu năng và tốc độ phản hồi  
&nbsp;&nbsp;&nbsp;&nbsp;6.4.2. Kiểm thử bảo mật  
&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;– Kiểm thử xác thực: token hợp lệ / hết hạn / bị thu hồi  
&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;– Kiểm thử phân quyền: truy cập sai vai trò (HTTP 403)  
&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;– Kiểm thử Rate Limiting: vượt ngưỡng (HTTP 429)  
&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;– Kiểm thử Signed URL: URL giả mạo bị từ chối  
&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;– Kiểm thử bảo vệ SQL Injection qua Eloquent  
6.5. Kết quả kiểm thử tổng hợp  
6.6. Kết luận chương  

---

## CHƯƠNG 7: ĐÁNH GIÁ VÀ CẢI TIẾN

7.1. Đánh giá kết quả đạt được  
&nbsp;&nbsp;&nbsp;&nbsp;7.1.1. Mức độ hoàn thành so với mục tiêu ban đầu  
&nbsp;&nbsp;&nbsp;&nbsp;7.1.2. Đánh giá hiệu suất hệ thống  
&nbsp;&nbsp;&nbsp;&nbsp;7.1.3. Đánh giá giao diện người dùng (UI/UX)  
7.2. Hạn chế hiện tại  
7.3. Hướng phát triển và cải tiến  
&nbsp;&nbsp;&nbsp;&nbsp;7.3.1. Các tính năng cần nâng cấp ngắn hạn  
&nbsp;&nbsp;&nbsp;&nbsp;7.3.2. Định hướng mở rộng quy mô dài hạn  

---

## CHƯƠNG 8: KẾT LUẬN

8.1. Tóm tắt quá trình phát triển  
8.2. Những bài học kinh nghiệm  
&nbsp;&nbsp;&nbsp;&nbsp;8.2.1. Thách thức đã vượt qua  
&nbsp;&nbsp;&nbsp;&nbsp;8.2.2. Kiến thức và kỹ năng thu được  
8.3. Định hướng tương lai  

---

TÀI LIỆU THAM KHẢO  
PHỤ LỤC  
