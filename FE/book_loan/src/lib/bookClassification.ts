export type BookClassification = {
  code: 'A' | 'B' | 'C' | 'D' | 'E' | 'F' | 'G' | 'H' | 'I' | 'J';
  genre: string;
  label: string;
  shelfLabel: string;
  shelves: string[];
  aliases: string[];
};

export const BOOK_CLASSIFICATIONS: BookClassification[] = [
  {
    code: 'A',
    genre: 'Khoa học Tự nhiên',
    label: 'A - Khoa học Tự nhiên',
    shelfLabel: 'KHTN - Khoa học Tự nhiên',
    shelves: ['A1', 'A2', 'A3', 'A4'],
    aliases: ['Khoa học', 'KHTN', 'Science', 'Natural Science'],
  },
  {
    code: 'B',
    genre: 'Kinh tế - Lịch sử',
    label: 'B - Kinh tế - Lịch sử',
    shelfLabel: 'KT-LS - Kinh tế - Lịch sử',
    shelves: ['B1', 'B2', 'B3', 'B4', 'B5', 'B6', 'B7', 'B8'],
    aliases: ['Kinh tế', 'Lịch sử', 'KT-LS', 'Economics', 'History', 'Business'],
  },
  {
    code: 'C',
    genre: 'Công nghệ - Kỹ thuật',
    label: 'C - Công nghệ - Kỹ thuật',
    shelfLabel: 'CN-KT - Công nghệ - Kỹ thuật',
    shelves: ['C1', 'C2', 'C3'],
    aliases: ['Công nghệ thông tin', 'CNTT', 'Công nghệ', 'Kỹ thuật', 'Điện - Điện tử', 'Technology'],
  },
  {
    code: 'D',
    genre: 'Văn học - Xã hội',
    label: 'D - Văn học - Xã hội',
    shelfLabel: 'VH-XH - Văn học - Xã hội',
    shelves: ['D1', 'D2', 'D3', 'D4'],
    aliases: ['Văn học', 'Xã hội', 'VH-XH', 'Fiction', 'Literature'],
  },
  {
    code: 'E',
    genre: 'Tham khảo & Từ điển',
    label: 'E - Tham khảo & Từ điển',
    shelfLabel: 'Tham khảo & Từ điển',
    shelves: ['E1', 'E2', 'E3'],
    aliases: ['Tham khảo', 'Từ điển', 'Tạp chí', 'Báo cáo', 'Reference', 'Dictionary'],
  },
  {
    code: 'F',
    genre: 'Ngoại ngữ & Ngoại văn',
    label: 'F - Ngoại ngữ & Ngoại văn',
    shelfLabel: 'Ngoại ngữ & Ngoại văn',
    shelves: ['F1', 'F2', 'F3', 'F4', 'F5', 'F6'],
    aliases: ['Ngoại ngữ', 'Ngoại văn', 'Ngôn ngữ học', 'Language', 'Foreign Language'],
  },
  {
    code: 'G',
    genre: 'Giáo trình Đại học',
    label: 'G - Giáo trình Đại học',
    shelfLabel: 'Giáo trình Đại học',
    shelves: ['G1', 'G2', 'G3', 'G4'],
    aliases: ['Giáo trình', 'Textbook', 'Coursebook', 'Bài giảng'],
  },
  {
    code: 'H',
    genre: 'Pháp luật & Chính trị',
    label: 'H - Pháp luật & Chính trị',
    shelfLabel: 'Pháp luật & Chính trị',
    shelves: ['H1', 'H2', 'H3'],
    aliases: ['Pháp luật', 'Chính trị', 'Luật', 'Law', 'Politics'],
  },
  {
    code: 'I',
    genre: 'Nghệ thuật & Thể thao',
    label: 'I - Nghệ thuật & Thể thao',
    shelfLabel: 'Nghệ thuật & Thể thao',
    shelves: ['I1', 'I2'],
    aliases: ['Nghệ thuật', 'Thể thao', 'Thiết kế', 'Mỹ thuật', 'Design', 'Art', 'Sports'],
  },
  {
    code: 'J',
    genre: 'Triết học & Tâm lý học',
    label: 'J - Triết học & Tâm lý học',
    shelfLabel: 'Triết học & Tâm lý học',
    shelves: ['J1', 'J2', 'J3'],
    aliases: ['Triết học', 'Tâm lý', 'Tâm lý học', 'Kỹ năng', 'Kỹ năng sống', 'Psychology', 'Philosophy'],
  },
];

export const DEFAULT_PHYSICAL_CLASSIFICATION = BOOK_CLASSIFICATIONS.find(
  (item) => item.code === 'G',
) ?? BOOK_CLASSIFICATIONS[0];

export const SHELF_LABELS: Record<string, string> = BOOK_CLASSIFICATIONS.reduce(
  (labels, item) => {
    item.shelves.forEach((shelf) => {
      labels[shelf] = item.shelfLabel;
    });

    return labels;
  },
  {} as Record<string, string>,
);

function normalizeText(value?: string | null) {
  return (value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

export function findClassification(value?: string | null) {
  const normalizedValue = normalizeText(value);

  if (!normalizedValue) {
    return DEFAULT_PHYSICAL_CLASSIFICATION;
  }

  return (
    BOOK_CLASSIFICATIONS.find((item) =>
      [item.genre, item.label, item.code, ...item.aliases].some(
        (alias) => normalizeText(alias) === normalizedValue,
      ),
    ) ?? DEFAULT_PHYSICAL_CLASSIFICATION
  );
}

export function getShelvesForCategory(category?: string | null) {
  return findClassification(category).shelves.map((shelf) => ({
    code: shelf,
    value: `Kệ ${shelf}`,
    label: `Kệ ${shelf} (${SHELF_LABELS[shelf]})`,
  }));
}

export function getDefaultShelfForCategory(category?: string | null) {
  return getShelvesForCategory(category)[0]?.value ?? '';
}

export function normalizePhysicalCategory(category?: string | null) {
  return findClassification(category).genre;
}

export function normalizePhysicalLocation(category?: string | null, location?: string | null) {
  const shelves = getShelvesForCategory(category);
  const match = shelves.find((shelf) => shelf.value === location || shelf.code === location);

  return match?.value ?? shelves[0]?.value ?? '';
}
