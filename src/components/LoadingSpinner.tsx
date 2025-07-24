import React from 'react';

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  text?: string;
  className?: string;
  color?: 'black' | 'white' | 'green' | 'blue';
}

const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({ 
  size = 'md', 
  text, 
  className = '',
  color = 'black'
}) => {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-6 h-6',
    lg: 'w-8 h-8',
    xl: 'w-12 h-12'
  };

  const colorClasses = {
    black: 'border-black',
    white: 'border-white',
    green: 'border-green-600',
    blue: 'border-blue-600'
  };

  return (
    <div className={`flex flex-col items-center justify-center ${className}`}>
      <div 
        className={`animate-spin rounded-full border-b-2 ${sizeClasses[size]} ${colorClasses[color]} mb-4`}
      />
      {text && (
        <p className="text-gray-600 text-center text-sm">{text}</p>
      )}
    </div>
  );
};

export default LoadingSpinner; 