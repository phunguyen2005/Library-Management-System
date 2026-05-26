import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';

type LibraryPolicyModalProps = {
  isOpen: boolean;
  onClose: () => void;
};

type TabType = 'general' | 'borrowing' | 'fines' | 'rooms' | 'librarian';

export default function LibraryPolicyModal({ isOpen, onClose }: LibraryPolicyModalProps) {
  const { t, i18n } = useTranslation();
  const [activeTab, setActiveTab] = useState<TabType>('general');

  if (!isOpen) return null;

  const currentLang = (i18n.language || 'vi').startsWith('en') ? 'en' : 'vi';

  // Localized content for rich visual presentation
  const content = {
    vi: {
      title: 'Chính Sách & Quy Định Thư Viện',
      subtitle: 'Cẩm nang tra cứu nhanh quy định, phí phạt và hướng dẫn vận hành thư viện.',
      close: 'Đóng',
      tabs: {
        general: 'Giới thiệu chung',
        borrowing: 'Quy định Mượn - Trả',
        fines: 'Biểu Phí Phạt',
        rooms: 'Phòng Học Nhóm',
        librarian: 'Nghiệp vụ Thủ thư',
      },
      sections: {
        general: {
          title: 'Chào mừng đến với Thư viện số HCMUE',
          body: 'Hệ thống Quản lý Mượn Sách & Đặt Phòng Học được xây dựng nhằm cung cấp dịch vụ tra cứu trực tuyến hiện đại, hỗ trợ sinh viên và giảng viên tiếp cận nguồn học liệu phong phú và không gian tự học chuẩn quốc tế.',
          rulesTitle: 'Cam kết chung',
          rules: [
            'Tôn trọng không gian tự học, giữ yên lặng và bảo vệ tài sản chung.',
            'Xuất trình thẻ sinh viên/giảng viên hợp lệ khi thực hiện các giao dịch trực tiếp.',
            'Mỗi cá nhân có trách nhiệm bảo mật thông tin tài khoản đăng nhập.',
            'Mọi hành vi gian lận hoặc phá hoại học liệu sẽ bị xử lý kỷ luật theo quy chế nhà trường.',
          ]
        },
        borrowing: {
          title: 'Quy trình Mượn & Trả Sách',
          body: 'Áp dụng cho mọi đối tượng sinh viên đăng ký mượn tài liệu vật lý hoặc đọc trực tuyến tại Thư viện.',
          rulesTitle: 'Quy định chi tiết',
          items: [
            {
              title: 'Hạn mức mượn sách',
              desc: 'Mỗi sinh viên được mượn tối đa 5 cuốn sách vật lý cùng một lúc. Không giới hạn số lượng tài liệu số (PDF/EPUB) đọc online.'
            },
            {
              title: 'Thời gian mượn',
              desc: 'Thời hạn mượn mặc định là 14 ngày. Sinh viên có thể xin gia hạn tối đa 1 lần (thêm 7 ngày) thông qua cổng thông tin cá nhân trước ngày hết hạn 2 ngày, với điều kiện cuốn sách đó không nằm trong hàng đợi đặt trước của người khác.'
            },
            {
              title: 'Quy trình nhận sách',
              desc: 'Sau khi yêu cầu mượn được duyệt, sinh viên cần đến quầy thủ thư để nhận sách vật lý trong vòng 24 giờ. Quá thời gian này, yêu cầu sẽ tự động bị hủy.'
            },
            {
              title: 'Tài liệu số đặc biệt',
              desc: 'Các giáo trình, tài liệu số chỉ được đọc trực tuyến trên hệ thống và tự động lưu lại tiến trình đọc của sinh viên để tiếp tục lần sau.'
            }
          ]
        },
        fines: {
          title: 'Quy định xử phạt & Bồi thường',
          body: 'Hệ thống tự động tính toán phí phạt ngay khi sách quá hạn hoặc được thủ thư đánh giá hư hỏng.',
          rulesTitle: 'Khung xử lý vi phạm',
          items: [
            {
              title: 'Phí phạt trễ hạn',
              desc: 'Phạt 5.000 VND / cuốn / ngày trễ hạn. Hệ thống không áp dụng ngày ân hạn (trừ khi có cấu hình đặc biệt).'
            },
            {
              title: 'Trần phạt tối đa',
              desc: 'Số tiền phạt quá hạn cho mỗi cuốn sách không vượt quá 200.000 VND để giảm bớt gánh nặng tài chính cho sinh viên.'
            },
            {
              title: 'Hư hỏng & Mất sách',
              desc: 'Trường hợp mất sách hoặc hỏng nặng không thể phục hồi: Sinh viên phải bồi thường 100% giá trị sách theo giá thị trường hiện hành + Phí xử lý nghiệp vụ 20.000 VND. Hư hại nhẹ (rách trang, viết vẽ bậy): phạt từ 10.000 VND - 50.000 VND tùy mức độ thực tế.'
            },
            {
              title: 'Phương thức thanh toán',
              desc: 'Hỗ trợ quét mã QR thanh toán online tự động qua ví MoMo hoặc cổng VNPay. Sinh viên cũng có thể nộp tiền mặt trực tiếp tại quầy Thủ thư để được phê duyệt gạch nợ lập tức.'
            },
            {
              title: 'Khóa tài khoản tạm thời',
              desc: 'Nếu tài khoản có bất kỳ khoản nợ phạt nào chưa thanh toán (> 0 VND), hệ thống sẽ tự động khóa quyền tạo yêu cầu mượn sách mới hoặc đặt phòng học nhóm.'
            }
          ]
        },
        rooms: {
          title: 'Hướng dẫn sử dụng Phòng học nhóm',
          body: 'Phòng tự học thông minh được trang bị bảng trắng, tivi và máy lạnh phục vụ mục đích nghiên cứu học thuật của nhóm sinh viên.',
          rulesTitle: 'Quy định đặt phòng',
          items: [
            {
              title: 'Số lượng thành viên tối thiểu',
              desc: 'Chỉ chấp nhận các lượt đặt phòng học nhóm có số lượng thành viên từ 2 người trở lên.'
            },
            {
              title: 'Hạn mức thời gian',
              desc: 'Mỗi lượt đặt tối đa 3 giờ sử dụng. Mỗi sinh viên được đặt tối đa 2 lượt/ngày và được đặt trước tối đa 7 ngày.'
            },
            {
              title: 'Quy định Check-in trễ',
              desc: 'Nhóm sinh viên phải có mặt và thực hiện quét mã QR check-in tại phòng trong vòng 15 phút đầu tiên kể từ giờ hẹn. Sau 15 phút, lịch đặt phòng sẽ tự động bị hủy và giải phóng phòng cho nhóm khác.'
            },
            {
              title: 'Hủy lịch đặt',
              desc: 'Để tránh bị tính điểm danh tiếng xấu, sinh viên cần thực hiện hủy lịch đặt phòng học trước giờ hẹn ít nhất 2 giờ.'
            }
          ]
        },
        librarian: {
          title: 'Cẩm nang nghiệp vụ dành cho Thủ thư',
          body: 'Hướng dẫn chuẩn hóa quy trình vận hành, duyệt yêu cầu và hỗ trợ độc giả dành riêng cho nhân viên thư viện.',
          rulesTitle: 'Quy trình nghiệp vụ cốt lõi',
          items: [
            {
              title: 'Bước 1: Duyệt yêu cầu mượn sách',
              desc: 'Khi nhận được thông báo yêu cầu mượn: Thủ thư cần đến kệ sách kiểm tra tình trạng vật lý và số lượng khả dụng của cuốn sách đó trước khi nhấn nút "Phê duyệt" trên hệ thống.'
            },
            {
              title: 'Bước 2: Xác nhận giao sách',
              desc: 'Khi sinh viên đến nhận sách: Thủ thư kiểm tra thẻ sinh viên để đối chiếu thông tin tài khoản, bàn giao sách vật lý và nhấn "Xác nhận nhận sách" trên màn hình quản trị.'
            },
            {
              title: 'Bước 3: Nhận trả sách & Kiểm định',
              desc: 'Khi sinh viên trả sách: Thủ thư kiểm tra kỹ các trang sách xem có bị rách, ướt nước hay bôi bẩn không. Nếu phát hiện hư hại, lập tức nhập phiếu đánh giá hư hỏng để hệ thống tự tạo phạt. Nếu sách bình thường, nhấn "Xác nhận trả sách" để chuyển trạng thái về trống.'
            },
            {
              title: 'Bước 4: Điều phối hàng đợi tự động',
              desc: 'Hệ thống tích hợp hàng đợi đặt trước tự động. Khi một cuốn sách được trả, nếu có sinh viên khác đang xếp hàng chờ mượn, hệ thống sẽ tự chuyển trạng thái giữ sách cho người tiếp theo và gửi email thông báo tự động.'
            },
            {
              title: 'Bước 5: Quản lý phòng học & Hỗ trợ check-in',
              desc: 'Thủ thư có quyền kiểm tra tình trạng sử dụng thực tế của các phòng học nhóm. Trong trường hợp thiết bị QR của phòng học gặp lỗi kỹ thuật, thủ thư có thể thực hiện "Check-in thủ công" hoặc nhập mã Code đặt chỗ trên hệ thống để giúp sinh viên vào phòng.'
            }
          ]
        }
      }
    },
    en: {
      title: 'Library Policies & Regulations',
      subtitle: 'Quick reference guide for library rules, fine systems, and librarian workflows.',
      close: 'Close',
      tabs: {
        general: 'Overview',
        borrowing: 'Borrow & Return',
        fines: 'Fines & Penalties',
        rooms: 'Study Rooms',
        librarian: 'Librarian Guide',
      },
      sections: {
        general: {
          title: 'Welcome to HCMUE Digital Library',
          body: 'The Book Borrowing & Study Room Management System is designed to provide modern online services, helping students and faculty access rich learning materials and international-standard self-study spaces.',
          rulesTitle: 'General Commitments',
          rules: [
            'Respect the self-study space, keep quiet, and protect public property.',
            'Present a valid student/faculty ID card when performing in-person transactions.',
            'Each individual is responsible for keeping their login credentials secure.',
            'Any act of fraud or vandalism of library resources will be disciplined according to university rules.'
          ]
        },
        borrowing: {
          title: 'Borrow & Return Workflow',
          body: 'Applies to all students registering to borrow physical materials or read online at the Library.',
          rulesTitle: 'Detailed Rules',
          items: [
            {
              title: 'Borrow Limit',
              desc: 'Each student can borrow up to 5 physical books at a time. No limit on online reading of digital documents (PDF/EPUB).'
            },
            {
              title: 'Borrow Period',
              desc: 'The default borrow period is 14 days. Students can request an extension once (7 additional days) through their profile portal 2 days before the due date, provided the book is not reserved by someone else.'
            },
            {
              title: 'Pickup Process',
              desc: 'After a borrow request is approved, the student must pick up the book at the counter within 24 hours, or the request is automatically canceled.'
            },
            {
              title: 'Digital Resources',
              desc: 'Special textbook digital files are available for online streaming/reading only, and the system automatically saves reading progress.'
            }
          ]
        },
        fines: {
          title: 'Fines & Reimbursements',
          body: 'The system automatically calculates fines when books are overdue or determined by the librarian to be damaged.',
          rulesTitle: 'Fine Framework',
          items: [
            {
              title: 'Overdue Fines',
              desc: 'Fine of 5,000 VND / book / overdue day. No grace days are applied unless specially configured.'
            },
            {
              title: 'Maximum Cap',
              desc: 'The overdue fine for any single book is capped at 200,000 VND to avoid excessive financial burden on students.'
            },
            {
              title: 'Loss & Damage',
              desc: 'In case of book loss or irreparable damage: Students must pay 100% of current market value + a 20,000 VND processing fee. Minor damage (torn page, scribbles): fined 10,000 VND - 50,000 VND depending on actual assessment.'
            },
            {
              title: 'Payment Methods',
              desc: 'Supports automatic online QR code payments via MoMo or VNPay. Students can also pay by cash directly at the Librarian counter for instant debt clearance.'
            },
            {
              title: 'Account Hold',
              desc: 'If the account has any outstanding unpaid fines (> 0 VND), the system automatically locks the permission to request new book borrows or book study rooms.'
            }
          ]
        },
        rooms: {
          title: 'Study Room Guidelines',
          body: 'Smart study rooms equipped with whiteboards, TVs, and air conditioners are provided for academic research of student groups.',
          rulesTitle: 'Room Booking Rules',
          items: [
            {
              title: 'Minimum Members',
              desc: 'Only group room bookings with 2 or more members are accepted.'
            },
            {
              title: 'Time Limits',
              desc: 'Each booking is capped at 3 hours. Each student is allowed up to 2 bookings per day and can book up to 7 days in advance.'
            },
            {
              title: 'Late Check-in Policy',
              desc: 'The student group must be present and scan the QR code to check in within the first 15 minutes of the scheduled time. After 15 minutes, the booking is automatically canceled.'
            },
            {
              title: 'Cancellation Deadline',
              desc: 'To avoid penalty reputation points, students must cancel the booking at least 2 hours before the scheduled time.'
            }
          ]
        },
        librarian: {
          title: 'Librarian Operational Standard',
          body: 'Standardized guidelines for operating, reviewing requests, and helping readers specifically for library staff.',
          rulesTitle: 'Core Librarian Operations',
          items: [
            {
              title: 'Step 1: Review Borrow Request',
              desc: 'Upon receiving a request notification: The librarian must inspect the physical shelf to verify the book availability and state before clicking "Approve".'
            },
            {
              title: 'Step 2: Confirm Book Handout',
              desc: 'When the student arrives: Check their student ID card to match details, hand over the book, and click "Confirm Pickup" in the admin dashboard.'
            },
            {
              title: 'Step 3: Receive Returns & Inspect',
              desc: 'Upon return: Inspect the book pages for water damage, tear, or scribbles. If damage is found, create a damage report to generate a fine. If correct, confirm the return to mark the copy as available.'
            },
            {
              title: 'Step 4: Automatic Queue Dispatch',
              desc: 'The queue system is automated. When a book is returned, if there are students waiting in the queue, the system automatically reserves the copy for the next student and sends an email alert.'
            },
            {
              title: 'Step 5: Room Management & Manual Check-in',
              desc: 'Librarians have rights to oversee study room occupancy. If a room QR scanner malfunctions, the librarian can perform a "Manual Check-in" or input the student\'s booking code to assist them.'
            }
          ]
        }
      }
    }
  };

  const activeContent = content[currentLang] || content.vi;

  // Resolve current active section
  const currentSection = activeTab === 'general' ? null : 
    activeTab === 'borrowing' ? activeContent.sections.borrowing :
    activeTab === 'fines' ? activeContent.sections.fines :
    activeTab === 'rooms' ? activeContent.sections.rooms :
    activeContent.sections.librarian;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm">
      <div className="w-full max-w-4xl h-[85vh] flex flex-col overflow-hidden rounded-2xl border border-white/20 bg-white/95 shadow-2xl shadow-slate-900/30 dark:bg-slate-900/95 dark:border-slate-800">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 p-6 bg-slate-50/50 dark:bg-slate-950/20">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <span className="material-symbols-outlined text-2xl font-light">menu_book</span>
            </div>
            <div>
              <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100">{activeContent.title}</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{activeContent.subtitle}</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors cursor-pointer"
          >
            <span className="material-symbols-outlined text-xl">close</span>
          </button>
        </div>

        {/* Modal Layout */}
        <div className="flex-1 flex overflow-hidden">
          
          {/* Navigation Sidebar */}
          <div className="w-64 border-r border-slate-100 dark:border-slate-800 bg-slate-50/30 dark:bg-slate-950/10 p-4 overflow-y-auto space-y-1">
            {(Object.keys(activeContent.tabs) as TabType[]).map((tabKey) => (
              <button
                key={tabKey}
                onClick={() => setActiveTab(tabKey)}
                className={`w-full flex items-center gap-3 px-4 py-3 text-left text-sm font-semibold rounded-xl transition-all cursor-pointer ${
                  activeTab === tabKey
                    ? 'bg-primary text-white shadow-md shadow-primary/10'
                    : 'text-slate-600 hover:text-slate-800 hover:bg-slate-50 dark:text-slate-400 dark:hover:text-slate-200 dark:hover:bg-slate-800/50'
                }`}
              >
                <span className="material-symbols-outlined text-lg">
                  {tabKey === 'general' ? 'info' : 
                   tabKey === 'borrowing' ? 'swap_horiz' : 
                   tabKey === 'fines' ? 'payments' : 
                   tabKey === 'rooms' ? 'meeting_room' : 'assignment_ind'}
                </span>
                {activeContent.tabs[tabKey]}
              </button>
            ))}
          </div>

          {/* Content Pane */}
          <div className="flex-1 p-8 overflow-y-auto custom-scrollbar bg-white dark:bg-slate-900">
            {activeTab === 'general' && (
              <div className="space-y-6">
                <div>
                  <h4 className="text-xl font-bold text-slate-800 dark:text-slate-100">{activeContent.sections.general.title}</h4>
                  <p className="mt-3 text-sm text-slate-600 dark:text-slate-400 leading-relaxed">{activeContent.sections.general.body}</p>
                </div>
                
                <hr className="border-slate-100 dark:border-slate-800" />
                
                <div>
                  <h5 className="text-sm font-bold text-slate-500 uppercase tracking-wider">{activeContent.sections.general.rulesTitle}</h5>
                  <ul className="mt-4 space-y-3">
                    {activeContent.sections.general.rules.map((rule, idx) => (
                      <li key={idx} className="flex gap-3 text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                        <span className="material-symbols-outlined text-green-500 text-lg select-none">check_circle</span>
                        {rule}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            )}

            {activeTab !== 'general' && currentSection && (
              <div className="space-y-6">
                <div>
                  <h4 className="text-xl font-bold text-slate-800 dark:text-slate-100">
                    {currentSection.title}
                  </h4>
                  <p className="mt-3 text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                    {currentSection.body}
                  </p>
                </div>

                <hr className="border-slate-100 dark:border-slate-800" />

                <div>
                  <h5 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-4">
                    {currentSection.rulesTitle}
                  </h5>
                  
                  <div className="space-y-4">
                    {currentSection.items.map((item, idx) => (
                      <div 
                        key={idx} 
                        className="p-5 border border-slate-100 dark:border-slate-800 rounded-2xl bg-slate-50/50 dark:bg-slate-950/20 hover:bg-slate-50 dark:hover:bg-slate-950/40 transition-colors"
                      >
                        <div className="flex gap-3">
                          <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary text-xs font-bold mt-0.5">
                            {idx + 1}
                          </div>
                          <div>
                            <h6 className="font-bold text-slate-800 dark:text-slate-100 text-sm">{item.title}</h6>
                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1.5 leading-relaxed">{item.desc}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end border-t border-slate-100 dark:border-slate-800 p-6 bg-slate-50/50 dark:bg-slate-950/10 shrink-0">
          <button
            onClick={onClose}
            className="px-6 py-2 bg-slate-800 hover:bg-slate-700 dark:bg-slate-200 dark:hover:bg-slate-100 text-white dark:text-slate-900 rounded-xl text-sm font-semibold shadow-md transition-all hover:-translate-y-0.5 cursor-pointer"
          >
            {activeContent.close}
          </button>
        </div>
      </div>
    </div>
  );
}
