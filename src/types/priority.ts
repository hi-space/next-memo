export type Priority = 1 | 2 | 3 | 4 | 5;

export interface PriorityConfig {
  emoji: string;
  label: string;
}

export const priorityEmojis: Record<Priority, PriorityConfig> = {
  1: {
    emoji: '🔵',
    label: '낮음',
  },
  2: {
    emoji: '🟢',
    label: '보통',
  },
  3: {
    emoji: '🟡',
    label: '중요',
  },
  4: {
    emoji: '🟠',
    label: '높음',
  },
  5: {
    emoji: '🔴',
    label: '긴급',
  },
} as const;

export const getPriorityConfig = (priority: Priority): PriorityConfig => {
  return priorityEmojis[priority] || priorityEmojis[1];
};
