import React from 'react';
import { PaymentMethod } from '../../types';
import { Smartphone, Banknote, CreditCard, Landmark, CircleDot } from 'lucide-react';
import { cn } from '../../lib/utils';

interface PaymentBadgeProps {
  method: PaymentMethod;
  className?: string;
  showIcon?: boolean;
}

export const PaymentBadge: React.FC<PaymentBadgeProps> = ({
  method,
  className,
  showIcon = true,
}) => {
  const config: Record<
    PaymentMethod,
    { label: string; icon: React.ReactNode; bg: string; text: string; darkBg: string; darkText: string }
  > = {
    upi: {
      label: 'UPI',
      icon: <Smartphone className="w-3 h-3" />,
      bg: 'bg-emerald-50',
      text: 'text-emerald-700',
      darkBg: 'dark:bg-emerald-950/60',
      darkText: 'dark:text-emerald-300',
    },
    cash: {
      label: 'Cash',
      icon: <Banknote className="w-3 h-3" />,
      bg: 'bg-amber-50',
      text: 'text-amber-700',
      darkBg: 'dark:bg-amber-950/60',
      darkText: 'dark:text-amber-300',
    },
    card: {
      label: 'Card',
      icon: <CreditCard className="w-3 h-3" />,
      bg: 'bg-indigo-50',
      text: 'text-indigo-700',
      darkBg: 'dark:bg-indigo-950/60',
      darkText: 'dark:text-indigo-300',
    },
    bank_transfer: {
      label: 'Net Banking',
      icon: <Landmark className="w-3 h-3" />,
      bg: 'bg-blue-50',
      text: 'text-blue-700',
      darkBg: 'dark:bg-blue-950/60',
      darkText: 'dark:text-blue-300',
    },
    other: {
      label: 'Other',
      icon: <CircleDot className="w-3 h-3" />,
      bg: 'bg-slate-100',
      text: 'text-slate-700',
      darkBg: 'dark:bg-slate-800',
      darkText: 'dark:text-slate-300',
    },
  };

  const item = config[method] || config.other;

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium tracking-wide transition-colors',
        item.bg,
        item.text,
        item.darkBg,
        item.darkText,
        className
      )}
    >
      {showIcon && item.icon}
      <span>{item.label}</span>
    </span>
  );
};
