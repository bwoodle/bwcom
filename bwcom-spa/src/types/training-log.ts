export type DailyEntry = {
  logId: string;
  sk: string;
  date: string;
  entryType: "daily";
  slot: "workout1" | "workout2";
  description: string;
  miles: number;
  highlight?: boolean;
};

export type WeeklyEntry = {
  logId: string;
  sk: string;
  date: string;
  entryType: "week";
  description: string;
};

export type TrainingLogEntry = DailyEntry | WeeklyEntry;

export type TrainingLogSection = {
  id: string;
  name: string;
  entries: TrainingLogEntry[];
};

export type TrainingLogBatchUpdateItem = {
  sk: string;
  description?: string;
  miles?: number;
  highlight?: boolean;
};

export type TrainingLogBatchUpdateRequest = {
  logId: string;
  updates: TrainingLogBatchUpdateItem[];
};

export type TrainingLogBatchUpdateResult = {
  sk: string;
  success: boolean;
  error?: string;
};

export type TrainingLogBatchUpdateResponse = {
  logId: string;
  successCount: number;
  failureCount: number;
  results: TrainingLogBatchUpdateResult[];
};

export type TrainingLogCreateRequest = {
  logId: string;
  entryType: "daily" | "week";
  date: string;
  description: string;
  slot?: "workout1" | "workout2";
  miles?: number;
  highlight?: boolean;
};

export type TrainingLogCreateResponse = {
  success: true;
  entry: TrainingLogEntry;
};
