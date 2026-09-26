export type MediaFormat =
  "book" | "audiobook" | "kindle" | "movie" | "tv" | "podcast";

export type MediaRating = 1 | 2 | 3 | 4 | 5;

export type MediaItem = {
  monthKey: string;
  sk: string;
  title: string;
  author?: string;
  format: MediaFormat;
  comments?: string;
  createdAt: string;
  rating?: MediaRating;
};

export type MediaBatchUpdateItem = {
  monthKey: string;
  sk: string;
  title?: string;
  author?: string | null;
  format?: MediaFormat;
  comments?: string | null;
  rating?: MediaRating | null;
};

export type MediaBatchUpdateRequest = {
  updates: MediaBatchUpdateItem[];
};

export type MediaBatchUpdateResult = {
  monthKey: string;
  sk: string;
  success: boolean;
  error?: string;
};

export type MediaBatchUpdateResponse = {
  successCount: number;
  failureCount: number;
  results: MediaBatchUpdateResult[];
};

export type MediaCreateRequest = {
  monthKey: string;
  title: string;
  author?: string;
  format: MediaFormat;
  comments?: string;
  rating?: MediaRating;
};

export type MediaCreateResponse = {
  success: true;
  entry: MediaItem;
};
