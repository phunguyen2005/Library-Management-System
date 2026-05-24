import { apiRequest } from './client';

export interface Reviewer {
  member_id: number;
  name: string;
}

export interface ReviewRecord {
  review_id: number;
  member_id: number;
  book_id: number;
  loan_id: number;
  rating: number;
  comment: string | null;
  created_at: string;
  updated_at: string;
  member: Reviewer;
}

export interface ReviewsResponse {
  data: ReviewRecord[];
  total: number;
  current_page: number;
  last_page: number;
}

export interface SubmitReviewResponse {
  message: string;
  review: ReviewRecord;
  avg_rating: number;
  reviews_count: number;
}

export async function fetchBookReviews(bookId: number, page = 1, limit = 5): Promise<ReviewsResponse> {
  return apiRequest<ReviewsResponse>(`/books/${bookId}/reviews?page=${page}&limit=${limit}`);
}

export async function submitBookReview(
  bookId: number,
  rating: number,
  comment: string | null,
  loanId: number
): Promise<SubmitReviewResponse> {
  return apiRequest<SubmitReviewResponse>(`/books/${bookId}/reviews`, {
    method: 'POST',
    body: {
      rating,
      comment,
      loan_id: loanId,
    },
  });
}
