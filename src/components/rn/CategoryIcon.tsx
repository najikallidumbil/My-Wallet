import React from 'react';
import {
  Briefcase,
  TrendingUp,
  Coins,
  Gift,
  Home,
  Wallet,
  Utensils,
  ShoppingCart,
  Building,
  Zap,
  Car,
  ShoppingBag,
  HeartPulse,
  Film,
  GraduationCap,
  MoreHorizontal,
  Tag,
  Banknote,
  Building2,
  Smartphone,
  CreditCard,
  User,
  ArrowUpRight,
  ArrowDownLeft,
} from 'lucide-react-native';

interface CategoryIconProps {
  name?: string;
  size?: number;
  color?: string;
}

export const CategoryIcon: React.FC<CategoryIconProps> = ({
  name = 'Tag',
  size = 18,
  color = '#64748b',
}) => {
  const iconProps = { size, color };

  switch (name?.toLowerCase()) {
    case 'briefcase':
      return <Briefcase {...iconProps} />;
    case 'trendingup':
      return <TrendingUp {...iconProps} />;
    case 'coins':
      return <Coins {...iconProps} />;
    case 'gift':
      return <Gift {...iconProps} />;
    case 'home':
      return <Home {...iconProps} />;
    case 'wallet':
      return <Wallet {...iconProps} />;
    case 'utensils':
      return <Utensils {...iconProps} />;
    case 'shoppingcart':
      return <ShoppingCart {...iconProps} />;
    case 'building':
      return <Building {...iconProps} />;
    case 'zap':
      return <Zap {...iconProps} />;
    case 'car':
      return <Car {...iconProps} />;
    case 'shoppingbag':
      return <ShoppingBag {...iconProps} />;
    case 'heartpulse':
      return <HeartPulse {...iconProps} />;
    case 'film':
      return <Film {...iconProps} />;
    case 'graduationcap':
      return <GraduationCap {...iconProps} />;
    case 'morehorizontal':
      return <MoreHorizontal {...iconProps} />;
    case 'banknote':
      return <Banknote {...iconProps} />;
    case 'building2':
      return <Building2 {...iconProps} />;
    case 'smartphone':
      return <Smartphone {...iconProps} />;
    case 'creditcard':
      return <CreditCard {...iconProps} />;
    case 'user':
      return <User {...iconProps} />;
    case 'arrowupright':
      return <ArrowUpRight {...iconProps} />;
    case 'arrowdownleft':
      return <ArrowDownLeft {...iconProps} />;
    default:
      return <Tag {...iconProps} />;
  }
};
