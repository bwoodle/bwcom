export type RaceSource = "manual" | "legacy-spreadsheet";

export type RaceValidationState = "staged" | "validated";

export type RaceItem = {
  yearKey: string;
  sk: string;
  date: string;
  distance: string;
  time: string;
  vdot: number;
  name?: string;
  comments?: string;
  source?: RaceSource;
  importBatchId?: string;
  legacySourceRowId?: string;
  validationState?: RaceValidationState;
  promotedAt?: string;
  createdAt: string;
};

export type RaceCreateRequest = {
  date: string;
  distance: string;
  time: string;
  vdot: number;
  name?: string;
  comments?: string;
  source?: RaceSource;
  importBatchId?: string;
  legacySourceRowId?: string;
  validationState?: RaceValidationState;
};

export type RaceCreateResponse = {
  success: true;
  entry: RaceItem;
};

export type RaceBatchUpdateItem = {
  yearKey: string;
  sk: string;
  time?: string;
  vdot?: number;
  name?: string | null;
  comments?: string | null;
  validationState?: RaceValidationState;
};

export type RaceBatchUpdateRequest = {
  updates: RaceBatchUpdateItem[];
};

export type RaceBatchUpdateResult = {
  yearKey: string;
  sk: string;
  success: boolean;
  error?: string;
};

export type RaceBatchUpdateResponse = {
  successCount: number;
  failureCount: number;
  results: RaceBatchUpdateResult[];
};

export type RaceDraft = {
  time?: string;
  vdot?: number;
  name?: string;
  comments?: string;
  validationState?: RaceValidationState;
};
