import React from 'react';

interface GlassCardProps {
  children: React.ReactNode;
  className?: string;
  interactive?: boolean;
  variant?: 'default' | 'elevated' | 'subtle';
}

/**
 * Reusable glassmorphism card component
 * Provides consistent glass styling across the application
 */
export default function GlassCard({
  children,
  className = '',
  interactive = false,
  variant = 'default',
}: GlassCardProps) {
  const baseClasses = 'glass-card rounded-2xl';

  const variantClasses = {
    default: 'backdrop-blur-xl border border-glass bg-glass',
    elevated: 'backdrop-blur-xl border border-glass bg-glass shadow-glass',
    subtle: 'backdrop-blur-md border border-glass/50 bg-glass/30',
  };

  const interactiveClasses = interactive
    ? 'cursor-pointer transition-all duration-200 hover:shadow-lg hover:bg-glass/60'
    : '';

  return (
    <div
      className={`${baseClasses} ${variantClasses[variant]} ${interactiveClasses} ${className}`}
    >
      {children}
    </div>
  );
}
