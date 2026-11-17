/**
 * Date and Due Date Utilities
 */

export function formatDate(dateString: string): string {
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return dateString;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const targetDate = new Date(date);
    targetDate.setHours(0, 0, 0, 0);

    const diffDays = Math.round((today.getTime() - targetDate.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';

    return date.toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: date.getFullYear() !== today.getFullYear() ? 'numeric' : undefined,
    });
  } catch {
    return dateString;
  }
}

export function formatFullDate(dateString: string): string {
  try {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return dateString;
  }
}

export interface DueStatus {
  label: string;
  isOverdue: boolean;
  daysRemaining: number;
  urgency: 'overdue' | 'urgent' | 'upcoming' | 'distant' | 'none';
}

export function getDueStatus(dueDateStr?: string | null): DueStatus {
  if (!dueDateStr) {
    return {
      label: 'No due date',
      isOverdue: false,
      daysRemaining: 9999,
      urgency: 'none',
    };
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const due = new Date(dueDateStr);
  due.setHours(0, 0, 0, 0);

  const diffTime = due.getTime() - today.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays < 0) {
    const overdueDays = Math.abs(diffDays);
    return {
      label: overdueDays === 1 ? 'Overdue by 1 day' : `Overdue by ${overdueDays} days`,
      isOverdue: true,
      daysRemaining: diffDays,
      urgency: 'overdue',
    };
  } else if (diffDays === 0) {
    return {
      label: 'Due today',
      isOverdue: false,
      daysRemaining: 0,
      urgency: 'urgent',
    };
  } else if (diffDays === 1) {
    return {
      label: 'Due tomorrow',
      isOverdue: false,
      daysRemaining: 1,
      urgency: 'urgent',
    };
  } else if (diffDays <= 7) {
    return {
      label: `Due in ${diffDays} days`,
      isOverdue: false,
      daysRemaining: diffDays,
      urgency: 'upcoming',
    };
  } else {
    return {
      label: `Due ${formatDate(dueDateStr)}`,
      isOverdue: false,
      daysRemaining: diffDays,
      urgency: 'distant',
    };
  }
}
