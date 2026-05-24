export type TrainingLogConfig = {
  id: string;
  name: string;
};

export const TRAINING_LOG_SECTIONS: TrainingLogConfig[] = [
  { id: "paris-2026", name: "Paris 2026" },
  { id: "indy-2025", name: "Indy 2025" },
];

export const TRAINING_LOG_NAMES: Record<string, string> = Object.fromEntries(
  TRAINING_LOG_SECTIONS.map((section) => [section.id, section.name]),
);
