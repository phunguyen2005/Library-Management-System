import React from 'react';
import { useNavigate } from 'react-router-dom';
import ThemeToggle from '../../components/ThemeToggle';
import logo from '../../assets/logo.png';

export default function TermsOfUse() {
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
                <span className="material-symbols-outlined text-sm">gavel</span>
                Văn bản pháp lý
              </span>
              <h1 className="font-headline mt-3 text-3xl font-extrabold tracking-tight text-on-background md:text-4xl">
                Điều Khoản Sử Dụng
              </h1>
              <p className="mt-2 text-xs text-on-surface-variant font-medium">
                Cập nhật lần cuối: Tháng 5, 2026 • Thư viện số Đại học Sư phạm TP.HCM
              </p>
            </div>

            {/* Document Content */}
            <div className="space-y-8 text-sm leading-relaxed text-on-surface-variant">
              
              <section className="space-y-3">
                <h2 className="text-lg font-bold text-on-background flex items-center gap-2">
                  <span className="text-primary font-bold">1.</span> Chấp nhận các điều khoản
                </h2>
                <p>
                  Bằng việc truy cập, đăng nhập và sử dụng hệ thống Thư viện số Trường Đại học Sư phạm TP.HCM (HCMUE Digital Library), bạn đồng ý tuân thủ toàn bộ các quy định dưới đây. Nếu bạn không đồng ý với bất kỳ phần nào của các điều khoản này, vui lòng ngừng sử dụng dịch vụ của hệ thống ngay lập tức.
                </p>
              </section>

              <section className="space-y-3">
                <h2 className="text-lg font-bold text-on-background flex items-center gap-2">
                  <span className="text-primary font-bold">2.</span> Quyền và trách nhiệm của Bạn đọc (Sinh viên/Giảng viên)
                </h2>
                <ul className="list-disc pl-5 space-y-2">
                  <li><strong>Tài khoản cá nhân:</strong> Mỗi tài khoản được cấp theo mã số sinh viên (MSSV) hoặc mã giảng viên là tài sản riêng của cá nhân đó. Bạn chịu trách nhiệm bảo mật mật khẩu và các hoạt động mượn sách diễn ra dưới tài khoản của mình.</li>
                  <li><strong>Sử dụng hợp pháp:</strong> Bạn đọc cam kết chỉ sử dụng tài liệu phục vụ cho mục đích học tập, giảng dạy và nghiên cứu khoa học phi thương mại.</li>
                  <li><strong>Ý thức bảo quản:</strong> Giữ gìn nguyên vẹn sách vật lý khi mượn về nhà. Không được gạch xóa, viết vẽ lên sách, làm rách trang hoặc làm ẩm ướt tài liệu.</li>
                </ul>
              </section>

              <section className="space-y-3">
                <h2 className="text-lg font-bold text-on-background flex items-center gap-2">
                  <span className="text-primary font-bold">3.</span> Chính sách mượn trả tài liệu vật lý
                </h2>
                <div className="rounded-2xl bg-surface-container p-5 border border-outline-variant/30 space-y-3">
                  <p className="font-semibold text-on-background">Hệ thống áp dụng các giới hạn mượn trả sau đây:</p>
                  <ul className="list-disc pl-5 space-y-1">
                    <li><strong>Số lượng tối đa:</strong> Tối đa 5 cuốn sách vật lý đang được mượn cùng lúc.</li>
                    <li><strong>Thời hạn mượn:</strong> 14 ngày kể từ thời điểm xác nhận nhận sách từ thủ thư.</li>
                    <li><strong>Gia hạn:</strong> Bạn đọc có thể gia hạn trực tuyến thêm tối đa 1 lần (thêm 7 ngày) thông qua hệ thống nếu sách đó không nằm trong hàng đợi đặt trước của độc giả khác.</li>
                  </ul>
                </div>
              </section>

              <section className="space-y-3">
                <h2 className="text-lg font-bold text-on-background flex items-center gap-2">
                  <span className="text-primary font-bold">4.</span> Quy định về tài liệu số & Bản quyền
                </h2>
                <p>
                  Toàn bộ tài liệu số trên hệ thống (E-Book, Audio, giáo trình điện tử, đề cương bài giảng) đều được bảo hộ bản quyền thuộc sở hữu trí tuệ của HCMUE hoặc các đối tác liên kết. Bạn đọc tuyệt đối không được sao chép, tải xuống trái phép (ngoài các công cụ được hệ thống cấp phép), phát tán hoặc chia sẻ tài liệu số ra các kênh công cộng khác. Mọi hành vi vi phạm bản quyền sẽ bị khóa tài khoản vĩnh viễn và chuyển giao xử lý kỷ luật theo quy chế nhà trường.
                </p>
              </section>

              <section className="space-y-3">
                <h2 className="text-lg font-bold text-on-background flex items-center gap-2">
                  <span className="text-primary font-bold">5.</span> Phí phạt quá hạn & Thanh toán trực tuyến
                </h2>
                <p>
                  Để đảm bảo tính công bằng và lưu thông tài nguyên hiệu quả, độc giả trả sách muộn sẽ chịu phí quá hạn quy định:
                </p>
                <ul className="list-disc pl-5 space-y-2">
                  <li><strong>Mức phí quá hạn:</strong> 5.000 VND / cuốn / ngày quá hạn.</li>
                  <li><strong>Giới hạn phạt tối đa:</strong> Mức phạt tối đa cho một cuốn sách không vượt quá 200.000 VND.</li>
                  <li><strong>Thanh toán trực tuyến:</strong> Độc giả có thể thanh toán trực tiếp qua ví MoMo tích hợp sẵn trên hệ thống hoặc nộp tiền mặt trực tiếp tại quầy thư viện cho thủ thư xác nhận.</li>
                </ul>
              </section>

              <section className="space-y-3">
                <h2 className="text-lg font-bold text-on-background flex items-center gap-2">
                  <span className="text-primary font-bold">6.</span> Thay đổi điều khoản sử dụng
                </h2>
                <p>
                  Thư viện có quyền thay đổi, điều chỉnh các nội dung trong điều khoản này bất kỳ lúc nào để phù hợp với định hướng phát triển của Nhà trường. Những thay đổi sẽ được cập nhật công khai tại trang này và có hiệu lực ngay lập tức.
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
