import React from 'react';
import { cn } from '@utils';

// Card component
interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  hoverable?: boolean;
}

export const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ className, hoverable = false, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        'bg-white rounded-lg border border-gray-200 shadow-sm',
        hoverable && 'transition-all duration-200 hover:shadow-md hover:border-gray-300',
        className
      )}
      {...props}
    />
  )
);

Card.displayName = 'Card';

// Badge component
interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'primary' | 'secondary' | 'success' | 'warning' | 'danger' | 'info';
  size?: 'sm' | 'md';
}

export const Badge = React.forwardRef<HTMLSpanElement, BadgeProps>(
  ({ className, variant = 'primary', size = 'md', ...props }, ref) => {
    const variantStyles = {
      primary: 'bg-blue-100 text-blue-800',
      secondary: 'bg-gray-100 text-gray-800',
      success: 'bg-green-100 text-green-800',
      warning: 'bg-yellow-100 text-yellow-800',
      danger: 'bg-red-100 text-red-800',
      info: 'bg-indigo-100 text-indigo-800',
    };

    const sizeStyles = {
      sm: 'px-2 py-1 text-xs font-medium',
      md: 'px-3 py-1 text-sm font-medium',
    };

    return (
      <span
        ref={ref}
        className={cn('rounded-full inline-block', variantStyles[variant], sizeStyles[size], className)}
        {...props}
      />
    );
  }
);

Badge.displayName = 'Badge';

// Avatar component
interface AvatarProps {
  name: string;
  avatar?: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function Avatar({ name, avatar, size = 'md', className }: AvatarProps) {
  const sizeStyles = {
    sm: 'w-8 h-8 text-xs',
    md: 'w-10 h-10 text-sm',
    lg: 'w-12 h-12 text-base',
  };

  const initials = name
    .split(' ')
    .slice(0, 2)
    .map((n) => n.charAt(0).toUpperCase())
    .join('');

  // Generate color based on string
  const colors = ['bg-red-500', 'bg-blue-500', 'bg-green-500', 'bg-yellow-500', 'bg-purple-500', 'bg-pink-500', 'bg-indigo-500', 'bg-cyan-500'];
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  const colorClass = colors[Math.abs(hash) % colors.length];

  return (
    <div
      className={cn('rounded-full flex items-center justify-center text-white font-bold', sizeStyles[size], avatar ? 'overflow-hidden bg-gray-200' : colorClass, className)}
      title={name}
    >
      {avatar ? <img src={avatar} alt={name} className="w-full h-full object-cover" /> : initials}
    </div>
  );
}

// Divider component
interface DividerProps {
  className?: string;
}

export function Divider({ className }: DividerProps) {
  return <div className={cn('border-t border-gray-200', className)} />;
}

// Alert component
interface AlertProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'success' | 'warning' | 'danger' | 'info';
  icon?: React.ReactNode;
}

export const Alert = React.forwardRef<HTMLDivElement, AlertProps>(
  ({ className, variant = 'info', icon, children, ...props }, ref) => {
    const variantStyles = {
      success: 'bg-green-50 border border-green-200 text-green-800',
      warning: 'bg-yellow-50 border border-yellow-200 text-yellow-800',
      danger: 'bg-red-50 border border-red-200 text-red-800',
      info: 'bg-blue-50 border border-blue-200 text-blue-800',
    };

    return (
      <div ref={ref} className={cn('rounded-lg p-4 flex gap-3', variantStyles[variant], className)} {...props}>
        {icon && <div className="flex-shrink-0">{icon}</div>}
        <div className="flex-1">{children}</div>
      </div>
    );
  }
);

Alert.displayName = 'Alert';

// Empty State component
interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
}

export function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-4">
      {icon && <div className="text-gray-300 mb-4">{icon}</div>}
      <h3 className="text-lg font-semibold text-gray-900 mb-2">{title}</h3>
      {description && <p className="text-gray-500 text-center mb-6 max-w-sm">{description}</p>}
      {action && <div>{action}</div>}
    </div>
  );
}

// Skeleton component
interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  count?: number;
}

export function Skeleton({ className, count = 1, ...props }: SkeletonProps) {
  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className={cn('bg-gray-200 rounded animate-pulse', className)}
          {...props}
        />
      ))}
    </>
  );
}

// Progress Bar component
interface ProgressProps {
  value: number;
  max?: number;
  variant?: 'primary' | 'success' | 'warning' | 'danger';
  size?: 'sm' | 'md';
}

export function Progress({ value, max = 100, variant = 'primary', size = 'md' }: ProgressProps) {
  const percentage = (value / max) * 100;

  const variantStyles = {
    primary: 'bg-blue-500',
    success: 'bg-green-500',
    warning: 'bg-yellow-500',
    danger: 'bg-red-500',
  };

  const sizeStyles = {
    sm: 'h-1',
    md: 'h-2',
  };

  return (
    <div className={cn('w-full bg-gray-200 rounded-full overflow-hidden', sizeStyles[size])}>
      <div className={cn('h-full transition-all', variantStyles[variant])} style={{ width: `${Math.min(percentage, 100)}%` }} />
    </div>
  );
}
