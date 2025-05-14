import React from 'react';
import PropTypes from 'prop-types';

const variants = {
  primary: 'bg-primary/10 text-primary',
  secondary: 'bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200',
  success: 'bg-green-100 text-green-800',
  warning: 'bg-yellow-100 text-yellow-800',
  danger: 'bg-red-100 text-red-800',
  dark: 'bg-[#23242a] text-gray-400'
};

const sizes = {
  sm: 'text-[10px] px-2 py-0.5',
  md: 'text-xs px-2 py-0.5',
  lg: 'text-sm px-3 py-1'
};

export default function Badge({ 
  children, 
  variant = 'primary', 
  size = 'md',
  className = '',
  uppercase = false
}) {
  return (
    <span 
      className={`
        rounded-full font-semibold
        ${variants[variant]}
        ${sizes[size]}
        ${uppercase ? 'tracking-wide uppercase' : ''}
        ${className}
      `}
    >
      {children}
    </span>
  );
}

Badge.propTypes = {
  children: PropTypes.node.isRequired,
  variant: PropTypes.oneOf(['primary', 'secondary', 'success', 'warning', 'danger', 'dark']),
  size: PropTypes.oneOf(['sm', 'md', 'lg']),
  className: PropTypes.string,
  uppercase: PropTypes.bool
}; 