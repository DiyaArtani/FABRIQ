import React from 'react';

interface FabriqLogoProps {
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  showText?: boolean;
  subtitle?: string;
}

export const FabriqLogo: React.FC<FabriqLogoProps> = ({
  size = 'md',
  className = '',
  showText = false,
  subtitle
}) => {
  const sizeMap = {
    xs: 'w-6 h-6 rounded-md',
    sm: 'w-8 h-8 rounded-lg',
    md: 'w-10 h-10 rounded-xl',
    lg: 'w-14 h-14 rounded-2xl',
    xl: 'w-20 h-20 rounded-3xl'
  };

  const imageSize = sizeMap[size] || sizeMap.md;

  return (
    <div className={`flex items-center gap-2.5 ${className}`}>
      <div className={`${imageSize} overflow-hidden shadow-sm flex items-center justify-center flex-shrink-0`}>
        <img
          src="/logo.png"
          alt="Fabriq Logo"
          className="w-full h-full object-cover rounded-inherit"
          loading="eager"
        />
      </div>

      {showText && (
        <div className="flex flex-col">
          <span className="font-hanken font-black tracking-tight text-zinc-900 dark:text-zinc-100 text-base leading-tight">
            Fabriq <span className="text-emerald-600 dark:text-emerald-400 font-bold text-xs uppercase">ERP</span>
          </span>
          {subtitle && (
            <span className="text-[10px] font-mono text-zinc-500 dark:text-zinc-400">
              {subtitle}
            </span>
          )}
        </div>
      )}
    </div>
  );
};

export default FabriqLogo;
