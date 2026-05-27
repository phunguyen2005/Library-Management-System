export interface BookApiRecord {
  book_id: number;
  title: string;
  author: string;
  genre?: string | null;
  published_year?: number | null;
  cover?: string | null;
  location?: string | null;
  is_digital?: boolean | number;
  resource_type?: string | null;
  file_format?: string | null;
  file_size?: string | null;
  file_url?: string | null;
  open_url?: string | null;
  download_url?: string | null;
  has_attached_file?: boolean;
  has_digital_file?: boolean;
  digital_file_name?: string | null;
  download_count?: number | null;
  total_quantity?: number | null;
   available_quantity?: number | null;
  repairing_quantity?: number | null;
  is_available?: boolean | number;
  favorite_count?: number | null;
  is_favorite?: boolean | number;
  avg_rating?: number | null;
  reviews_count?: number | null;
  ai_summary?: string | null;
  ai_tags?: string[] | null;
  ai_summary_generated_at?: string | null;
}

export interface FormattedBook {
  id: number;
  book_id: number;
  title: string;
  author: string;
  isbn: string;
  category: string;
  genre: string;
  location: string;
  status: string;
  statusKey?: 'available' | 'unavailable';
  statusColor: string;
  cover: string;
  quantity: number;
  available_quantity: number;
  repairing_quantity?: number;
  published_year?: number;
  is_available: boolean;
  is_digital: boolean;
  resource_type?: string | null;
  file_format?: string | null;
  file_size?: string | null;
  has_digital_file?: boolean;
  digital_file_name?: string | null;
  download_count?: number | null;
  favorite_count?: number | null;
  is_favorite?: boolean;
  avg_rating?: number;
  reviews_count?: number;
  ai_summary?: string | null;
  ai_tags?: string[];
  ai_summary_generated_at?: string | null;
}

export interface DigitalDocument {
  id: number;
  title: string;
  author: string;
  type: string;
  format: string;
  size: string;
  color: string;
  cover?: string | null;
  downloads: number;
  openUrl: string | null;
  downloadUrl: string | null;
  hasAttachedFile: boolean;
  aiSummary?: string | null;
  aiTags?: string[];
  aiSummaryGeneratedAt?: string | null;
  readingProgress?: ReadingProgressRecord | null;
  is_favorite?: boolean;
}

export interface ReadingProgressRecord {
  progress_id: number;
  book_id: number;
  member_id: number;
  current_page: number;
  total_pages: number;
  progress_percent: number;
  last_read_at?: string | null;
  updated_at?: string | null;
  book?: {
    book_id: number;
    title: string;
    author: string;
    cover?: string | null;
    file_format?: string | null;
  } | null;
}
