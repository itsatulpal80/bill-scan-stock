import { ReactNode } from 'react';
import { ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ActionCardProps {
  title: string;
  description?: string;
  icon: ReactNode;
  onClick: () => void;
  variant?: 'default' | 'primary' | 'outlined';
  badge?: string | number;
  disabled?: boolean;
}

export function ActionCard({
  title,
  description,
  icon,
  onClick,
  variant = 'default',
  badge,
  disabled,
}: ActionCardProps) {
  const variantStyles = {
    default: 'bg-card border-border',
    primary: 'bg-primary text-primary-foreground border-primary',
    outlined: 'bg-transparent border-primary border-2',
  };

  const iconBgStyles = {
    default: 'bg-secondary',
    primary: 'bg-primary-foreground/20',
    outlined: 'bg-primary/10',
  };

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'w-full p-4 rounded-xl border card-elevated flex items-center gap-4 touch-feedback',
        'transition-all hover:scale-[1.01]',
        variantStyles[variant],
        disabled && 'opacity-50 cursor-not-allowed'
      )}
    >
      <div className={cn('p-3 rounded-xl shrink-0', iconBgStyles[variant])}>
        {icon}
      </div>
      
      <div className="flex-1 text-left">
        <p className={cn(
          'font-semibold text-base',
          variant === 'primary' ? 'text-primary-foreground' : 'text-foreground'
        )}>
          {title}
        </p>
        {description && (
          <p className={cn(
            'text-sm mt-0.5',
            variant === 'primary' ? 'text-primary-foreground/80' : 'text-muted-foreground'
          )}>
            {description}
          </p>
        )}
      </div>

      {badge !== undefined && (
        <span className="bg-destructive text-destructive-foreground text-xs font-bold px-2 py-1 rounded-full">
          {badge}
        </span>
      )}

      <ChevronRight className={cn(
        'w-5 h-5 shrink-0',
        variant === 'primary' ? 'text-primary-foreground/60' : 'text-muted-foreground'
      )} />
    </button>
  );
}
