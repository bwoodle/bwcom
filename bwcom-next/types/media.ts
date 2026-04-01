export type MediaFormat =
  | 'book'
  | 'audiobook'
  | 'kindle'
  | 'movie'
  | 'tv'
  | 'podcast';

export type MediaItem = {
  monthKey: string;
  sk: string;
  title: string;
  format: MediaFormat;
  comments?: string;
  createdAt: string;
};

export type MediaBatchUpdateItem = {
  monthKey: string;
  sk: string;
  title?: string;
  format?: MediaFormat;
  comments?: string | null;
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
  format: MediaFormat;
  comments?: string;
};

export type MediaCreateResponse = {
  success: true;
  entry: MediaItem;
};
