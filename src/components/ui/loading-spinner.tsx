import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import React from 'react';

interface LoadingSpinnerProps extends React.HTMLAttributes<SVGSVGElement> {}

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({ className, ...props }) => (
  <Loader2 className={cn('animate-spin', className)} {...props} />
);

export default LoadingSpinner;
