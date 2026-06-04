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

  const rawLang = i18n.language || 'vi';
  const currentLang = rawLang.startsWith('en') ? 'en' :
                      rawLang.startsWith('zh') ? 'zh' :
                      rawLang.startsWith('ja') ? 'ja' :
                      rawLang.startsWith('ko') ? 'ko' : 'vi';

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
    },
    zh: {
      title: '图书馆政策与规定',
      subtitle: '图书馆规定、费用和馆员操作流程的快速指南。',
      close: '关闭',
      tabs: {
        general: '基本介绍',
        borrowing: '借还规定',
        fines: '罚款收费标准',
        rooms: '小组自习室',
        librarian: '馆员业务',
      },
      sections: {
        general: {
          title: '欢迎来到 HCMUE 数字图书馆',
          body: '本图书借阅及自习室管理系统旨在提供现代化的在线服务，帮助学生和教职工获取丰富的学习资源以及符合国际标准的自学空间。',
          rulesTitle: '共同承诺',
          rules: [
            '尊重自学空间，保持安静，爱护公共财产。',
            '在进行线下业务时，请出示有效的学生证/教师证。',
            '每位用户都有责任妥善保管自己的登录账户信息。',
            '任何欺诈或破坏图书资源的行为都将按照学校规定进行纪律处分。'
          ]
        },
        borrowing: {
          title: '图书借还流程',
          body: '适用于所有申请借阅实体图书或在图书馆在线阅读的学生。',
          rulesTitle: '详细规定',
          items: [
            {
              title: '借阅额度',
              desc: '每位学生最多可同时借阅 5 册实体书。在线阅读数字资源（PDF/EPUB）无数量限制。'
            },
            {
              title: '借阅期限',
              desc: '默认借阅期为 14 天。学生可以在到期前 2 天通过个人门户申请续借 1 次（延长 7 天），前提是该书没有被其他人预约。'
            },
            {
              title: '取书流程',
              desc: '借书申请批准后，学生须在 24 小时内到服务台取书，否则申请将自动取消。'
            },
            {
              title: '数字资源',
              desc: '特定的教材电子书仅供在线阅读，系统会自动保存您的阅读进度。'
            }
          ]
        },
        fines: {
          title: '处罚与赔偿规定',
          body: '当图书逾期或馆员评估图书损坏时，系统会自动计算罚款金额。',
          rulesTitle: '违规处理标准',
          items: [
            {
              title: '逾期罚款',
              desc: '每册图书每天罚款 5,000 VND。除特殊配置外，不设宽限期。'
            },
            {
              title: '最高罚款上限',
              desc: '单本图书的最高逾期罚款不超过 200,000 VND，以减轻学生的经济负担。'
            },
            {
              title: '图书丢失与损坏',
              desc: '图书丢失或严重损坏无法修复时：学生须按当前市场价格 100% 赔偿 + 20,000 VND 业务处理费。轻微损坏（撕页、涂画）：根据实际情况罚款 10,000 VND - 50,000 VND。'
            },
            {
              title: '支付方式',
              desc: '支持通过 MoMo 或 VNPay 钱包扫描二维码在线自动缴费。学生也可以直接在服务台支付现金，以便即时销账。'
            },
            {
              title: '账号临时锁定',
              desc: '若账户有任何未清缴的罚款（> 0 VND），系统将自动锁定，限制其发起新的借书申请或预约自习室。'
            }
          ]
        },
        rooms: {
          title: '小组自习室使用指南',
          body: '智能自习室配备白板、电视和空调，专供学生小组进行学术研究。',
          rulesTitle: '自习室预约规定',
          items: [
            {
              title: '最少人数限制',
              desc: '仅接受 2 人及以上的小组预约申请。'
            },
            {
              title: '使用时间限制',
              desc: '每次预约最长为 3 小时。每位学生每天最多预约 2 次，最多可提前 7 天预约。'
            },
            {
              title: '迟到签到政策',
              desc: '小组成员必须在预约时间开始后的前 15 分钟内到达并在自习室扫码签到。超过 15 分钟未签到，预约将自动取消并释放房间给其他小组。'
            },
            {
              title: '预约取消时限',
              desc: '为避免扣除信誉分，学生须在预约时间前至少 2 小时取消预约。'
            }
          ]
        },
        librarian: {
          title: '馆员业务操作指南',
          body: '专为图书馆工作人员制定的标准化操作流程、申请审核及读者服务规范。',
          rulesTitle: '核心业务流程',
          items: [
            {
              title: '步骤 1：审核借书申请',
              desc: '收到申请通知后：馆员在系统点击“批准”前，须前往书架检查图书实体状态和可用数量。'
            },
            {
              title: '步骤 2：确认发放图书',
              desc: '学生前来取书时：核对学生证信息，发放图书并点击管理后台的“确认取书”。'
            },
            {
              title: '步骤 3：签收退还图书并检查',
              desc: '学生还书时：馆员须仔细检查图书是否有撕毁、浸水或涂写。若发现损坏，立即录入损坏报告以生成罚单；若完好无损，确认还书将副本标记为可用。'
            },
            {
              title: '步骤 4：自动队列调度',
              desc: '系统集成了自动预约队列。当图书归还时，若有其他学生在排队等待，系统会自动为下一位读者保留，并发送自动邮件通知。'
            },
            {
              title: '步骤 5：自习室管理与手动签到',
              desc: '馆员有权检查自习室的实际使用状态。若自习室扫码设备出现技术故障，馆员可在系统进行“手动签到”或输入预约码以协助学生入室。'
            }
          ]
        }
      }
    },
    ja: {
      title: '図書館ポリシーと利用規約',
      subtitle: '図書館の規則、延滞料、および司書業務プロセスのクイックリファレンスガイド。',
      close: '閉じる',
      tabs: {
        general: '基本紹介',
        borrowing: '貸出・返却規定',
        fines: '罰金料金表',
        rooms: 'グループ学習室',
        librarian: '司書業務',
      },
      sections: {
        general: {
          title: 'HCMUE デジタル図書館へようこそ',
          body: '本システムは、現代的なオンライン貸出および自習室予約サービスを提供し、学生や教職員が豊富な学習資料と国際基準の自習スペースにアクセスできるよう設計されています。',
          rulesTitle: '共同の約束',
          rules: [
            '自習スペースを尊重し、静粛を保ち、公共の財産を保護すること。',
            '窓口で手続きを行う際は、有効な学生証/教職員証を提示すること。',
            'アカウント情報のセキュリティ管理は各自の責任で行うこと。',
            '不正行為や図書館資料の破損・落書きは、大学の規則に従って処分されます。'
          ]
        },
        borrowing: {
          title: '貸出と返却のプロセス',
          body: '物理資料의 貸出またはオンライン閲覧を申請するすべての学生に適用されます。',
          rulesTitle: '詳細な規定',
          items: [
            {
              title: '貸出上限数',
              desc: '同時に貸出できる物理本は最大 5 冊までです。デジタル資料（PDF/EPUB）のオンライン閲覧には制限はありません。'
            },
            {
              title: '貸出期間',
              desc: 'デフォルトの貸出期間 is 14 日間です。他の利用者の予約が入っていない場合に限り、期限の 2 日前までにマイページから 1 回（7 日間延長）の延長を申請できます。'
            },
            {
              title: '受け取り手順',
              desc: '貸出が承認された後、24 時間以内にカウンターで本を受け取ってください。時間を超えると、自動的にキャンセルされます。'
            },
            {
              title: 'デジタルリソース',
              desc: '特別な教科書等のデジタルファイルはオンライン閲覧のみ可能で、システムが読書の進捗を自動保存します。'
            }
          ]
        },
        fines: {
          title: 'ペナルティおよび弁償の規定',
          body: '本が延滞した場合、または司書によって破損と判断された場合、システムは自動的に罰金を計算します。',
          rulesTitle: '違反処理の基準',
          items: [
            {
              title: '延滞料金',
              desc: '本 1 冊につき 1 日 5,000 VND の罰金。特別な設定がない限り、猶予期間はありません。'
            },
            {
              title: '上限金額',
              desc: '学生の経済的負担を軽減するため、本 1 冊あたりの延滞罰金の上限は 200,000 VND です。'
            },
            {
              title: '紛失と破損',
              desc: '紛失または修復不可能な破損の場合：現在の市場価格の 100% 弁償 ＋ 20,000 VND の手数料。軽微な破損（ページの破れ、落書き）：実際の状況に応じて 10,000 VND ～ 50,000 VND の罰金。'
            },
            {
              title: '支払い方法',
              desc: 'MoMo または VNPay を利用した QR コード決済でのオンライン自動支払いに対応。司書窓口で直接現金で支払うことで、即時に債務を消去することもできます。'
            },
            {
              title: 'アカウントのロック',
              desc: '未払いの罰金がある場合（> 0 VND）、システムは自動的に新規貸出や学習室の予約権限をロックします。'
            }
          ]
        },
        rooms: {
          title: 'グループ学習室の利用ガイド',
          body: 'ホワイトボード、テレビ、エアコンを備えたスマート学習室で、学生グループの学術研究目的で使用できます。',
          rulesTitle: '学習室の予約規定',
          items: [
            {
              title: '最小利用人数',
              desc: '2 人以上のグループによる予約申請のみ受け付けます。'
            },
            {
              title: '時間制限',
              desc: '1 回の予約は最大 3 時間までです。学生 1 人につき 1 日最大 2 回まで、最大 7 日前から予約可能です。'
            },
            {
              title: '遅刻・チェックイン規定',
              desc: 'グループは予約開始から 15 分以内に部屋に到着し、QR コードをスキャンしてチェックインする必要があります。15 分を過ぎると、自動的にキャンセルされ、他のグループに開放されます。'
            },
            {
              title: '予約キャンセル期限',
              desc: 'ペナルティ（評価点の減点）を避けるため、予約時間の少なくとも 2 時間前までにキャンセルを行ってください。'
            }
          ]
        },
        librarian: {
          title: '司書向け業務標準',
          body: '図書館スタッフ専用の業務標準化、申請レビュー、および読者サポートガイドライン。',
          rulesTitle: 'コア業務プロセス',
          items: [
            {
              title: 'ステップ 1: 貸出申請のレビュー',
              desc: '申請通知を受け取ったら、システムで「承認」をクリックする前に、書架で本の状態と在庫数を確認してください。'
            },
            {
              title: 'ステップ 2: 本の受け渡しの確認',
              desc: '学生が受け取りに来た際：学生証を確認し、本を渡して管理画面の「受取確認」をクリックします。'
            },
            {
              title: 'ステップ 3: 返却の受領と検査',
              desc: '返却時：本のページに水濡れ、破れ、落書きがないか確認します。破損がある場合は、破損レポートを登録して罰金を生成します。問題がなければ返却確認を行い、コピーを利用可能状態に戻します。'
            },
            {
              title: 'ステップ 4: 自動予約待ち行列制御',
              desc: 'システムに自動予約待ちキューが組み込まれています。本が返却された際に予約待ちの利用者がいる場合、次の利用者のために自動で取り置きされ、自動メール通知が送信されます。'
            },
            {
              title: 'ステップ 5: 自習室管理と手動チェックイン',
              desc: '司書は学習室の実際の利用状況を監督できます。部屋の QR スキャナーに障害が発生した場合、司書は管理システムで「手動チェックイン」を行うか、予約コードを入力して学生の入室を支援できます。'
            }
          ]
        }
      }
    },
    ko: {
      title: '도서관 규정 및 정책',
      subtitle: '도서관 규정, 연체료 및 사서 업무 프로세스에 대한 빠른 참조 안내서.',
      close: '닫기',
      tabs: {
        general: '일반 소개',
        borrowing: '대출 및 반납 규정',
        fines: '연체료 기준',
        rooms: '그룹 스터디룸',
        librarian: '사서 업무 가이드',
      },
      sections: {
        general: {
          title: 'HCMUE 디지털 도서관에 오신 것을 환영합니다',
          body: '본 도서 대출 및 스터디룸 관리 시스템은 현대적인 온라인 서비스를 제공하여 학생과 교직원이 풍부한 학습 리소스와 국제 기준의 자율 학습 공간에 접근할 수 있도록 설계되었습니다.',
          rulesTitle: '공동 서약',
          rules: [
            '자율 학습 공간을 존중하고, 조용히 하며, 공공 자산을 보호합니다.',
            '대면 업무 진행 시 유효한 학생증/교직원증을 제시해 주십시오.',
            '각 사용자는 개인 로그인 계정 정보에 대한 보안 관리 책임이 있습니다.',
            '도서 자원에 대한 부정행위나 훼손은 학칙에 따라 징계 처분을 받게 됩니다.'
          ]
        },
        borrowing: {
          title: '도서 대출 및 반납 프로세스',
          body: '실물 도서 대출을 신청하거나 도서관에서 온라인 읽기를 이용하는 모든 학생에게 적용됩니다.',
          rulesTitle: '상세 규정',
          items: [
            {
              title: '대출 한도',
              desc: '학생 1인당 동시에 대출 가능한 실물 도서는 최대 5권입니다. 전자 도서(PDF/EPUB) 온라인 읽기는 수량 제한이 없습니다.'
            },
            {
              title: '대출 기간',
              desc: '기본 대출 기간은 14일입니다. 다른 이용자의 대기 예약이 없는 경우에 한해 만기일 2일 전까지 마이페이지에서 1회(7일 연장) 연장 신청을 할 수 있습니다.'
            },
            {
              title: '도서 수령 절차',
              desc: '대출 신청이 승인된 후, 학생은 24시간 이내에 카운터에서 도서를 수령해야 합니다. 시간이 지나면 신청이 자동으로 취소됩니다.'
            },
            {
              title: '디지털 리소스',
              desc: '특정 교재 디지털 파일은 온라인 스트리밍/읽기만 가능하며, 시스템이 독서 진도를 자동으로 저장합니다.'
            }
          ]
        },
        fines: {
          title: '연체료 및 변상 규정',
          body: '도서 연체 또는 사서 검수 시 도서 훼손이 확인되는 경우 시스템이 자동으로 연체료를 계산합니다.',
          rulesTitle: '위반 처리 기준',
          items: [
            {
              title: '연체료 부과',
              desc: '도서 1권당 1일 5,000 VND 부과. 별도 설정이 없는 한 유예 기간은 적용되지 않습니다.'
            },
            {
              title: '최대 벌금 상한선',
              desc: '학생들의 경제적 부담을 줄이기 위해 도서 1권당 최대 누적 연체료는 200,000 VND를 초과할 수 없습니다.'
            },
            {
              title: '도서 분실 및 훼손',
              desc: '도서 분실 또는 수리가 불가능할 정도의 심각한 훼손 시: 현재 시장 가격의 100% 변상 + 20,000 VND의 업무 처리 수수료 부과. 경미한 훼손(페이지 찢어짐, 낙서): 실제 상태에 따라 10,000 VND ~ 50,000 VND 벌금 부과.'
            },
            {
              title: '납부 방법',
              desc: 'MoMo 또는 VNPay 지갑을 통한 온라인 QR코드 자동 납부를 지원합니다. 학생은 즉시 부채를 소멸하기 위해 사서 카운터에서 직접 현금으로 납부할 수도 있습니다.'
            },
            {
              title: '계정 임시 잠금',
              desc: '계정에 미납된 연체료 벌금이 있는 경우(> 0 VND), 시스템은 자동으로 새로운 도서 대출 신청 및 스터디룸 예약을 잠금 처리합니다.'
            }
          ]
        },
        rooms: {
          title: '그룹 자습실 이용 안내',
          body: '학생 그룹의 학술 연구 목적을 위해 화이트보드, TV, 에어컨이 구비된 스마트 자습실을 제공합니다.',
          rulesTitle: '자습실 예약 규정',
          items: [
            {
              title: '최소 이용 인원',
              desc: '2인 이상의 그룹 예약 신청만 수락됩니다.'
            },
            {
              title: '이용 시간 제한',
              desc: '1회 예약 시 최대 3시간까지 이용 가능합니다. 학생 1인당 하루 최대 2회 예약 가능하며, 최대 7일 전부터 예약할 수 있습니다.'
            },
            {
              title: '지각 및 체크인 규정',
              desc: '예약 시간 시작 후 처음 15분 이내에 도착하여 스터디룸 QR 코드를 스캔해 체크인해야 합니다. 15분이 지나면 예약이 자동으로 취소되고 다른 그룹에 방이 개방됩니다.'
            },
            {
              title: '예약 취소 기한',
              desc: '평판 점수 벌점을 피하기 위해 예약 시간 최소 2시간 전까지 예약을 취소해야 합니다.'
            }
          ]
        },
        librarian: {
          title: '사서 표준 업무 매뉴얼',
          body: '도서관 직원을 위한 표준화된 운영 지침, 대출 신청 검토 및 독자 지원 안내서.',
          rulesTitle: '핵심 업무 프로세스',
          items: [
            {
              title: '1단계: 대출 신청 검토',
              desc: '대출 요청 알림 수신 시: 사서는 시스템에서 "승인"을 클릭하기 전에 서가에서 도서의 실물 상태와 대출 가능 수량을 확인해야 합니다.'
            },
            {
              title: '2단계: 도서 인도 확인',
              desc: '학생이 도서를 수령하러 올 때: 학생증을 확인하여 계정 정보와 대조하고, 도서를 인도한 후 관리자 화면에서 "수령 확인"을 클릭합니다.'
            },
            {
              title: '3단계: 반납 수령 및 검수',
              desc: '반납 시: 도서 페이지가 찢어졌거나 물에 젖었거나 낙서가 있는지 주의 깊게 확인합니다. 훼손이 발견되면 즉시 훼손 보고서를 입력해 벌금을 생성합니다. 문제 없으면 반납을 확인하여 해당 사본을 사용 가능 상태로 전환합니다.'
            },
            {
              title: '4단계: 자동 예약 대기열 배정',
              desc: '시스템에 예약 대기열이 자동으로 통합되어 있습니다. 도서 반납 시 대기자가 있는 경우, 시스템이 자동으로 다음 대기자에게 예약을 배정하고 자동 이메일 알림을 보냅니다.'
            },
            {
              title: '5단계: 자습실 관리 및 수동 체크인',
              desc: '사서는 스터디룸의 실제 이용 상태를 감독할 권한이 있습니다. 자습실 QR 스캐너 기술 고장 시, 사서는 시스템에서 "수동 체크인"을 수행하거나 예약 코드를 입력해 학생의 입실을 도울 수 있습니다.'
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
