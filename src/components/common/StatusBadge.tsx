import React from 'react';
import { RecordStatus } from '../../types';
import { CheckCircle2, AlertTriangle, Clock, PieChart } from 'lucide-react';
import { cn } from '../../lib/utils';

interface StatusBadgeProps {
  status: RecordStatus;
  className?: string;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, className }) => {
  const config: Record<
    RecordStatus,
    { label: string; icon: React.ReactNode; bg: string; text: string; border: string }
  > = {
    pending: {
      label: 'Pending',
      icon: <Clock className="w-3 h-3" />,
      bg: 'bg-amber-50 dark:bg-amber-950/50',
      text: 'text-amber-700 dark:text-amber-300',
      border: 'border-amber-200 dark:border-amber-800/60',
    },
    partial: {
      label: 'Partially Settled',
      icon: <PieChart className="w-3 h-3" />,
      bg: 'bg-cyan-50 dark:bg-cyan-950/50',
      text: 'text-cyan-700 dark:text-cyan-300',
      border: 'border-cyan-200 dark:border-cyan-800/60',
    },
    settled: {
      label: 'Settled',
      icon: <CheckCircle2 className="w-3 h-3" />,
      bg: 'bg-emerald-50 dark:bg-emerald-950/50',
      text: 'text-emerald-700 dark:text-emerald-300',
      border: 'border-emerald-200 dark:border-emerald-800/60',
    },
    overdue: {
      label: 'Overdue',
      icon: <AlertTriangle className="w-3 h-3" />,
      bg: 'bg-rose-50 dark:bg-rose-950/50',
      text: 'text-rose-700 dark:text-rose-300',
      border: 'border-rose-200 dark:border-rose-800/60',
    },
  };

  const item = config[status] || config.pending;

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium border',
        item.bg,
        item.text,
        item.border,
        className
      )}
    >
      {item.icon}
      <span>{item.label}</span>
    </span>
  );
};
