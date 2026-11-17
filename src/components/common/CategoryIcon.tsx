import React from 'react';
import {
  Briefcase,
  TrendingUp,
  Coins,
  Gift,
  Wallet,
  Utensils,
  ShoppingCart,
  Home,
  Zap,
  Car,
  ShoppingBag,
  HeartPulse,
  Film,
  MoreHorizontal,
  Tag,
  Coffee,
  Smartphone,
  Plane,
  GraduationCap,
  CreditCard,
  Building,
  User,
  ArrowUpRight,
  ArrowDownLeft,
  LucideIcon,
} from 'lucide-react';

const ICON_MAP: Record<string, LucideIcon> = {
  Briefcase,
  TrendingUp,
  Coins,
  Gift,
  Wallet,
  Utensils,
  ShoppingCart,
  Home,
  Zap,
  Car,
  ShoppingBag,
  HeartPulse,
  Film,
  MoreHorizontal,
  Tag,
  Coffee,
  Smartphone,
  Plane,
  GraduationCap,
  CreditCard,
  Building,
  User,
  ArrowUpRight,
  ArrowDownLeft,
};

interface CategoryIconProps {
  name?: string;
  className?: string;
  color?: string;
  size?: number;
}

export const CategoryIcon: React.FC<CategoryIconProps> = ({
  name = 'Tag',
  className = 'w-5 h-5',
  color,
  size,
}) => {
  const IconComponent = (name && ICON_MAP[name]) ? ICON_MAP[name] : Tag;
  return <IconComponent className={className} style={{ color }} size={size} />;
};
