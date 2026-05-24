type UserRole = 'student' | 'admin';

type RawBook = {
  book_id: number;
  title: string;
  author: string;
  genre?: string | null;
  published_year?: number | null;
  is_available?: boolean | number;
  cover?: string | null;
  location?: string | null;
  total_quantity?: number | null;
  available_quantity?: number | null;
};

type BookPayload = {
  title: string;
  author: string;
  category?: string;
  genre?: string;
  published_year?: number;
  location?: string;
  cover?: string;
  quantity?: number;
};

type MockMember = {
  member_id: number;
  name: string;
  email?: string | null;
  phone_number?: string | null;
  password: string;
};

type MockLibrarian = {
  librarian_id: number;
  name: string;
  email: string;
  password: string;
};

type BorrowStatus = 'pending' | 'borrowed' | 'returned' | 'rejected';

type MockBorrow = {
  loan_id: number;
  member_id: number;
  librarian_id?: number | null;
  book_id: number;
  status: BorrowStatus;
  borrow_date: string;
  return_date?: string | null;
};

const DEFAULT_COVER =
  'https://images.unsplash.com/photo-1544947950-fa07a98d237f?auto=format&fit=crop&q=80&w=600';

const books: RawBook[] = [
  {
    book_id: 101,
    title: 'Ngôn ngữ học đại cương',
    author: 'Lê Quang Thiêm',
    genre: 'Ngôn ngữ học',
    published_year: 2021,
    is_available: 1,
    cover: DEFAULT_COVER,
    location: 'Khu A1',
    total_quantity: 5,
    available_quantity: 2,
  },
  {
    book_id: 102,
    title: 'Tâm lý học giáo dục',
    author: 'Trần Thị Minh Đức',
    genre: 'Tâm lý học',
    published_year: 2022,
    is_available: 1,
    cover: DEFAULT_COVER,
    location: 'Khu B2',
    total_quantity: 4,
    available_quantity: 1,
  },
  {
    book_id: 103,
    title: 'Phương pháp nghiên cứu khoa học',
    author: 'Nguyễn Văn Tuấn',
    genre: 'Nghien cuu',
    published_year: 2020,
    is_available: 0,
    cover: DEFAULT_COVER,
    location: 'Khu C1',
    total_quantity: 2,
    available_quantity: 0,
  },
  {
    book_id: 104,
    title: 'Lập trình web hiện đại',
    author: 'Phạm Gia Hưng',
    genre: 'Công nghệ thông tin',
    published_year: 2024,
    is_available: 1,
    cover: DEFAULT_COVER,
    location: 'Khu D4',
    total_quantity: 8,
    available_quantity: 6,
  },
];

const members: MockMember[] = [
  {
    member_id: 1,
    name: 'Nguyễn Thị Minh Anh',
    email: '4801104101@student.hcmue.edu.vn',
    phone_number: '0901000001',
    password: '123456',
  },
  {
    member_id: 2,
    name: 'Trần Văn Khoa',
    email: '4801104102@student.hcmue.edu.vn',
    phone_number: '0901000002',
    password: '123456',
  },
  {
    member_id: 3,
    name: 'Lê Thị Ngọc Hân',
    email: '4901104111@student.hcmue.edu.vn',
    phone_number: '0901000003',
    password: '123456',
  },
  {
    member_id: 4,
    name: 'Phạm Quốc Huy',
    email: '4901104112@student.hcmue.edu.vn',
    phone_number: '0901000004',
    password: '123456',
  },
  {
    member_id: 5,
    name: 'Vũ Hoàng Nam',
    email: '4901104113@student.hcmue.edu.vn',
    phone_number: '0901000005',
    password: '123456',
  },
  {
    member_id: 6,
    name: 'Hoàng Thị Lan',
    email: '5001104121@student.hcmue.edu.vn',
    phone_number: '0901000006',
    password: '123456',
  },
  {
    member_id: 7,
    name: 'Đỗ Minh Đức',
    email: '5001104122@student.hcmue.edu.vn',
    phone_number: '0901000007',
    password: '123456',
  },
  {
    member_id: 8,
    name: 'Bùi Thị Thanh Tâm',
    email: '5001104123@student.hcmue.edu.vn',
    phone_number: '0901000008',
    password: '123456',
  },
  {
    member_id: 9,
    name: 'Nguyễn Gia Bảo',
    email: '5101104131@student.hcmue.edu.vn',
    phone_number: '0901000009',
    password: '123456',
  },
  {
    member_id: 10,
    name: 'Trần Ngọc Hạnh',
    email: '5101104132@student.hcmue.edu.vn',
    phone_number: '0901000010',
    password: '123456',
  },
];

const librarians: MockLibrarian[] = [
  {
    librarian_id: 1,
    name: 'Nguyễn Văn An',
    email: 'nguyen.van.an@hcmue.edu.vn',
    password: '123456',
  },
  {
    librarian_id: 2,
    name: 'Trần Thị Mai',
    email: 'tran.thi.mai@hcmue.edu.vn',
    password: '123456',
  },
];

const borrows: MockBorrow[] = [
  {
    loan_id: 1,
    member_id: 1,
    librarian_id: 1,
    book_id: 101,
    status: 'borrowed',
    borrow_date: '2026-03-20',
    return_date: null,
  },
  {
    loan_id: 2,
    member_id: 2,
    book_id: 102,
    status: 'pending',
    borrow_date: '2026-03-25',
    return_date: null,
  },
  {
    loan_id: 3,
    member_id: 1,
    librarian_id: 1,
    book_id: 103,
    status: 'returned',
    borrow_date: '2026-03-01',
    return_date: '2026-03-15',
  },
];

function wait(ms = 120) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function toStatusLabel(status: BorrowStatus) {
  if (status === 'pending') return 'Chờ duyệt';
  if (status === 'borrowed') return 'Đang mượn';
  if (status === 'returned') return 'Đã trả';
  if (status === 'rejected') return 'Từ chối';
  return status;
}

function nextBookId() {
  return books.reduce((max, item) => Math.max(max, item.book_id), 100) + 1;
}

function nextLoanId() {
  return borrows.reduce((max, item) => Math.max(max, item.loan_id), 0) + 1;
}

export async function mockLogin(role: UserRole, identifier: string, password: string) {
  await wait();

  if (role === 'admin') {
    const librarian = librarians.find(
      (item) => String(item.librarian_id) === identifier || item.email === identifier
    );

    if (!librarian || librarian.password !== password) {
      throw new Error('Tài khoản hoặc mật khẩu không chính xác.');
    }

    return {
      message: 'Đăng nhập thành công',
      user: {
        librarian_id: librarian.librarian_id,
        name: librarian.name,
        email: librarian.email,
      },
      role,
    };
  }

  const member = members.find(
    (item) => String(item.member_id) === identifier || item.email === identifier
  );

    if (!member || member.password !== password) {
      throw new Error('Tài khoản hoặc mật khẩu không chính xác.');
    }

  return {
    message: 'Đăng nhập thành công',
    user: {
      member_id: member.member_id,
      name: member.name,
      email: member.email,
      phone_number: member.phone_number,
    },
    role,
  };
}

export async function mockRegisterStudent(
  name: string,
  email: string,
  password: string,
  phoneNumber?: string
) {
  await wait();

  if (members.some((item) => item.email === email)) {
    throw new Error('Email đã tồn tại.');
  }

  const memberId = members.reduce((max, item) => Math.max(max, item.member_id), 2301000) + 1;

  const newMember: MockMember = {
    member_id: memberId,
    name,
    email,
    phone_number: phoneNumber,
    password,
  };

  members.push(newMember);

  return {
    message: 'Đăng ký thành công',
    user: {
      member_id: newMember.member_id,
      name: newMember.name,
      email: newMember.email,
      phone_number: newMember.phone_number,
    },
    role: 'student' as const,
  };
}

export async function mockFetchBooks() {
  await wait();
  return clone(books);
}

export async function mockSearchBooks(query: string) {
  await wait();
  const normalized = query.trim().toLowerCase();

  if (!normalized) {
    return clone(books);
  }

  return clone(
    books.filter(
      (item) =>
        item.title.toLowerCase().includes(normalized) ||
        item.author.toLowerCase().includes(normalized) ||
        (item.genre || '').toLowerCase().includes(normalized)
    )
  );
}

export async function mockAddBook(payload: BookPayload) {
  await wait();

  const qty = Math.max(1, Number(payload.quantity ?? 1));

  const newBook: RawBook = {
    book_id: nextBookId(),
    title: payload.title,
    author: payload.author,
    genre: payload.category || payload.genre || 'Khac',
    published_year: payload.published_year,
    cover: payload.cover || DEFAULT_COVER,
    location: payload.location || 'Khu A',
    total_quantity: qty,
    available_quantity: qty,
    is_available: qty > 0,
  };

  books.push(newBook);
  return clone(newBook);
}

export async function mockUpdateBook(bookId: number, payload: BookPayload) {
  await wait();

  const index = books.findIndex((item) => item.book_id === bookId);
  if (index < 0) {
    throw new Error('Không tìm thấy sách.');
  }

  const current = books[index];
  const nextQty = payload.quantity;

  const updated: RawBook = {
    ...current,
    title: payload.title || current.title,
    author: payload.author || current.author,
    genre: payload.category || payload.genre || current.genre,
    published_year: payload.published_year ?? current.published_year,
    cover: payload.cover || current.cover,
    location: payload.location || current.location,
  };

  if (typeof nextQty === 'number') {
    const diff = nextQty - Number(current.total_quantity ?? 0);
    const available = Math.max(0, Number(current.available_quantity ?? 0) + diff);
    updated.total_quantity = nextQty;
    updated.available_quantity = available;
    updated.is_available = available > 0;
  }

  books[index] = updated;
  return clone(updated);
}

export async function mockDeleteBook(bookId: number) {
  await wait();

  const index = books.findIndex((item) => item.book_id === bookId);
  if (index < 0) {
    throw new Error('Không tìm thấy sách.');
  }

  books.splice(index, 1);

  return { message: 'Xoa sach thanh cong' };
}

export async function mockGetAllMembers() {
  await wait();

  return clone(
    members.map((item) => ({
      member_id: item.member_id,
      name: item.name,
      email: item.email,
      phone_number: item.phone_number,
    }))
  );
}

export async function mockRequestBorrow(memberId: number, bookId: number) {
  await wait();

  const member = members.find((item) => item.member_id === memberId);
  if (!member) {
    throw new Error('Không tìm thấy thành viên.');
  }

  const book = books.find((item) => item.book_id === bookId);
  if (!book) {
    throw new Error('Không tìm thấy sách.');
  }

  if (Number(book.available_quantity ?? 0) <= 0) {
    throw new Error('Sách hiện không có sẵn để mượn.');
  }

  const loan: MockBorrow = {
    loan_id: nextLoanId(),
    member_id: memberId,
    book_id: bookId,
    status: 'pending',
    borrow_date: new Date().toISOString().slice(0, 10),
    return_date: null,
  };

  borrows.push(loan);

  return {
    message: 'Yêu cầu mượn sách đã được gửi',
    loan: clone(loan),
  };
}

export async function mockGetMemberRequests(memberId: number) {
  await wait();

  return clone(
    borrows
      .filter((item) => item.member_id === memberId)
      .sort((a, b) => b.loan_id - a.loan_id)
      .map((item) => {
        const book = books.find((b) => b.book_id === item.book_id);

        return {
          id: item.loan_id,
          bookTitle: book?.title || 'Không rõ',
          author: book?.author || 'Không rõ',
          cover: book?.cover || DEFAULT_COVER,
          category: book?.genre || 'Khac',
          status: item.status,
          borrow_date: item.borrow_date,
          return_date: item.return_date || null,
        };
      })
  );
}

export async function mockGetAllRequests() {
  await wait();

  return clone(
    borrows
      .slice()
      .sort((a, b) => b.loan_id - a.loan_id)
      .map((item) => {
        const member = members.find((m) => m.member_id === item.member_id);
        const book = books.find((b) => b.book_id === item.book_id);

        return {
          id: item.loan_id,
          name: member?.name || 'Không rõ',
          role: 'SV',
          roleColor: 'bg-primary-container text-primary',
          code: member?.member_id || 'N/A',
          book: book?.title || 'Không rõ',
          bookCode: book?.book_id || 'N/A',
          status: toStatusLabel(item.status),
          date: item.return_date || item.borrow_date,
          raw_status: item.status,
        };
      })
  );
}

export async function mockApproveBorrow(loanId: number, librarianId: number) {
  await wait();

  const librarian = librarians.find((item) => item.librarian_id === librarianId);
  if (!librarian) {
    throw new Error('Thủ thư không hợp lệ.');
  }

  const loan = borrows.find((item) => item.loan_id === loanId);
  if (!loan) {
    throw new Error('Không tìm thấy yêu cầu mượn.');
  }

  if (loan.status !== 'pending') {
    throw new Error('Yêu cầu này đã được xử lý.');
  }

  const book = books.find((item) => item.book_id === loan.book_id);
  if (!book || Number(book.available_quantity ?? 0) <= 0) {
    throw new Error('Sách hiện không có sẵn.');
  }

  loan.status = 'borrowed';
  loan.librarian_id = librarianId;
  loan.borrow_date = new Date().toISOString().slice(0, 10);

  book.available_quantity = Math.max(0, Number(book.available_quantity ?? 0) - 1);
  book.is_available = Number(book.available_quantity ?? 0) > 0;

  return {
    message: 'Đã duyệt yêu cầu mượn',
    loan: clone(loan),
  };
}

export async function mockReturnBook(loanId: number, librarianId: number) {
  await wait();

  const librarian = librarians.find((item) => item.librarian_id === librarianId);
  if (!librarian) {
    throw new Error('Thủ thư không hợp lệ.');
  }

  const loan = borrows.find((item) => item.loan_id === loanId);
  if (!loan) {
    throw new Error('Không tìm thấy yêu cầu mượn.');
  }

  if (loan.status !== 'borrowed') {
    throw new Error('Yêu cầu này chưa ở trạng thái đang mượn.');
  }

  loan.status = 'returned';
  loan.return_date = new Date().toISOString().slice(0, 10);

  const book = books.find((item) => item.book_id === loan.book_id);
  if (book) {
    book.available_quantity = Number(book.available_quantity ?? 0) + 1;
    book.is_available = true;
  }

  return {
    message: 'Đã xử lý trả sách',
    loan: clone(loan),
  };
}
