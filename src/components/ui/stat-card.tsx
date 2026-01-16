import { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon?: ReactNode;
  trend?: 'up' | 'down' | 'neutral';
  variant?: 'default' | 'success' | 'warning' | 'danger';
  onClick?: () => void;
}

export function StatCard({
  title,
  value,
  subtitle,
  icon,
  variant = 'default',
  onClick,
}: StatCardProps) {
  const variantStyles = {
    default: 'bg-card border-border',
    success: 'bg-success/10 border-success/20',
    warning: 'bg-warning/10 border-warning/20',
    danger: 'bg-destructive/10 border-destructive/20',
  };

  const iconStyles = {
    default: 'text-primary bg-primary/10',
    success: 'text-success bg-success/20',
    warning: 'text-warning bg-warning/20',
    danger: 'text-destructive bg-destructive/20',
  };

  return (
    <div
      onClick={onClick}
      className={cn(
        'p-4 rounded-xl border card-elevated transition-all',
        variantStyles[variant],
        onClick && 'cursor-pointer touch-feedback hover:scale-[1.02]'
      )}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-sm text-muted-foreground font-medium">{title}</p>
          <p className="text-2xl font-bold mt-1">{value}</p>
          {subtitle && (
            <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>
          )}
        </div>
        {icon && (
          <div className={cn('p-3 rounded-xl', iconStyles[variant])}>
            {icon}
          </div>
        )}
      </div>
    </div>
  );
}
