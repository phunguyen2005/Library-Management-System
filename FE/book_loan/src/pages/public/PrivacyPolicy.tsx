import React from 'react';
import { useNavigate } from 'react-router-dom';
import ThemeToggle from '../../components/ThemeToggle';
import logo from '../../assets/logo.png';

export default function PrivacyPolicy() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-surface text-on-surface flex flex-col font-sans transition-colors duration-300">
      {/* Header bar */}
      <header className="sticky top-0 z-50 w-full border-b border-outline-variant/30 bg-surface-bright/80 backdrop-blur-md shadow-sm">
        <div className="mx-auto flex h-16 max-w-screen-xl items-center justify-between px-6">
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => navigate('/')}>
            <div className="flex h-9 w-14 items-center justify-center rounded-xl bg-surface-container p-1 shadow-sm">
              <img src={logo} alt="HCMUE Logo" className="h-full w-auto object-contain" />
            </div>
            <span className="font-headline text-lg font-bold tracking-tight text-primary">
              Thư viện số HCMUE
            </span>
          </div>

          <div className="flex items-center gap-4">
            <ThemeToggle />
            <button
              onClick={() => navigate('/')}
              className="flex items-center gap-1.5 rounded-xl border border-outline-variant bg-surface-container-lowest/80 px-4 py-2 text-sm font-semibold hover:bg-surface-container transition-all active:scale-95 cursor-pointer"
            >
              <span className="material-symbols-outlined text-[18px]">arrow_back</span>
              <span>Trang chủ</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-grow py-12 px-6">
        <div className="mx-auto max-w-3xl">
          <div className="rounded-3xl border border-surface-container-high bg-surface-bright p-8 shadow-xl shadow-primary/5 md:p-12">
            
            {/* Title */}
            <div className="mb-8 border-b border-outline-variant/50 pb-6 text-center">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-xs font-bold uppercase tracking-widest text-primary border border-primary/20">
                <span className="material-symbols-outlined text-sm">security</span>
                Quyền riêng tư
              </span>
              <h1 className="font-headline mt-3 text-3xl font-extrabold tracking-tight text-on-background md:text-4xl">
                Chính Sách Bảo Mật
              </h1>
              <p className="mt-2 text-xs text-on-surface-variant font-medium">
                Cập nhật lần cuối: Tháng 5, 2026 • Thư viện số Đại học Sư phạm TP.HCM
              </p>
            </div>

            {/* Document Content */}
            <div className="space-y-8 text-sm leading-relaxed text-on-surface-variant">
              
              <section className="space-y-3">
                <h2 className="text-lg font-bold text-on-background flex items-center gap-2">
                  <span className="text-primary font-bold">1.</span> Thu thập thông tin cá nhân
                </h2>
                <p>
                  Hệ thống Thư viện số HCMUE thu thập thông tin của bạn khi bạn thực hiện đăng ký tài khoản, đăng nhập hoặc thực hiện các thao tác tìm kiếm, mượn sách. Các thông tin thu thập bao gồm:
                </p>
                <ul className="list-disc pl-5 space-y-1">
                  <li>Họ tên, mã số sinh viên (MSSV) hoặc mã giảng viên.</li>
                  <li>Địa chỉ email học đường do Trường cấp (định dạng @student.hcmue.edu.vn hoặc @hcmue.edu.vn).</li>
                  <li>Số điện thoại liên hệ cá nhân.</li>
                  <li>Lịch sử mượn trả tài liệu, lịch sử đọc sách và tiến độ đọc sách số.</li>
                  <li>Địa chỉ IP và thông tin thiết bị đăng nhập (User Agent) để phục vụ bảo mật tài khoản.</li>
                </ul>
              </section>

              <section className="space-y-3">
                <h2 className="text-lg font-bold text-on-background flex items-center gap-2">
                  <span className="text-primary font-bold">2.</span> Sử dụng thông tin thu thập
                </h2>
                <p>
                  Thông tin cá nhân thu thập được sử dụng duy nhất cho các mục đích hoạt động nội bộ của Thư viện:
                </p>
                <ul className="list-disc pl-5 space-y-2">
                  <li><strong>Quản lý mượn trả:</strong> Xác định chính xác độc giả mượn tài liệu, theo dõi thời hạn để gửi thông báo nhắc trả sách đúng thời gian hoặc xử lý phạt quá hạn nếu có.</li>
                  <li><strong>Tối ưu hóa gợi ý bằng AI:</strong> Lịch sử mượn và danh mục sách yêu thích của bạn được xử lý thông qua hệ thống trí tuệ nhân tạo (Gemini AI) để đề xuất cá nhân hóa những đầu sách phù hợp nhất với học lực, chuyên ngành hoặc sở thích đọc của bạn.</li>
                  <li><strong>An ninh hệ thống:</strong> Ghi vết kiểm toán (Audit Logs) hành động đăng nhập, đăng xuất và đổi thiết bị để bảo mật tài khoản trước các đợt truy cập bất thường.</li>
                </ul>
              </section>

              <section className="space-y-3">
                <h2 className="text-lg font-bold text-on-background flex items-center gap-2">
                  <span className="text-primary font-bold">3.</span> Bảo mật dữ liệu cá nhân
                </h2>
                <p>
                  Chúng tôi cam kết bảo vệ dữ liệu cá nhân của bạn đọc ở mức an toàn cao nhất bằng các phương thức mã hóa dữ liệu truyền tải (HTTPS), bảo mật cơ sở dữ liệu và lưu trữ mã hóa mật khẩu một chiều (bcrypt). Hệ thống không chia sẻ, chuyển giao hoặc mua bán dữ liệu cá nhân của bạn đọc với bất kỳ bên thứ ba nào ngoài phạm vi hoạt động giáo dục của trường HCMUE.
                </p>
              </section>

              <section className="space-y-3">
                <h2 className="text-lg font-bold text-on-background flex items-center gap-2">
                  <span className="text-primary font-bold">4.</span> Cookie và công nghệ theo dõi
                </h2>
                <p>
                  Thư viện số sử dụng Cookie và LocalStorage trên trình duyệt để duy trì trạng thái đăng nhập của bạn (thông qua mã thông báo Token của Laravel Sanctum). Bạn có thể cấu hình chặn cookie từ trình duyệt của mình, tuy nhiên điều này có thể ảnh hưởng trực tiếp đến trải nghiệm tự động đăng nhập khi mở lại hệ thống.
                </p>
              </section>

              <section className="space-y-3">
                <h2 className="text-lg font-bold text-on-background flex items-center gap-2">
                  <span className="text-primary font-bold">5.</span> Quyền kiểm soát thông tin của độc giả
                </h2>
                <p>
                  Độc giả có toàn quyền quản lý thông tin của mình thông qua khu vực thiết lập tài khoản:
                </p>
                <ul className="list-disc pl-5 space-y-1">
                  <li>Thay đổi thông tin liên lạc (số điện thoại) hoặc cập nhật mật khẩu mới.</li>
                  <li>Xem và đăng xuất từ xa khỏi các thiết bị đáng ngờ đang sử dụng tài khoản của mình.</li>
                  <li>Tùy chọn bật/tắt nhận email thông báo khi có sách mới về hoặc khi sách mượn sắp đến hạn trả.</li>
                </ul>
              </section>

              <section className="space-y-3">
                <h2 className="text-lg font-bold text-on-background flex items-center gap-2">
                  <span className="text-primary font-bold">6.</span> Liên hệ giải đáp
                </h2>
                <p>
                  Nếu bạn có bất kỳ câu hỏi nào liên quan đến chính sách bảo mật thông tin cá nhân trên hệ thống, vui lòng liên hệ Ban quản trị Thư viện Trường ĐH Sư phạm TP.HCM qua email <a href="mailto:thuvien@hcmue.edu.vn" className="text-primary hover:underline font-semibold">thuvien@hcmue.edu.vn</a> để được xử lý kịp thời.
                </p>
              </section>

            </div>

            {/* Support info */}
            <div className="mt-10 pt-6 border-t border-outline-variant/50 flex flex-col md:flex-row justify-between items-center gap-4 text-xs text-on-surface-variant font-medium">
              <span>Mọi thắc mắc xin liên hệ: <a href="mailto:thuvien@hcmue.edu.vn" className="text-primary hover:underline font-semibold">thuvien@hcmue.edu.vn</a></span>
              <span>Hotline: (028) 3835 2020</span>
            </div>

          </div>
        </div>
      </main>

      {/* Mini Footer */}
      <footer className="py-6 border-t border-outline-variant/30 text-center text-xs text-on-surface-variant bg-surface-bright">
        © {new Date().getFullYear()} Trường Đại học Sư phạm TP.HCM. Bản quyền thuộc về Thư viện số HCMUE.
      </footer>
    </div>
  );
}
