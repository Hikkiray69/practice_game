import { QuestStatus } from "@/entities/quest";

export const STATUS_LABELS: Record<QuestStatus, string> = {
  new: "Новая",
  inProgress: "В процессе",
  completed: "Завершена",
  failed: "Провалена",
};
