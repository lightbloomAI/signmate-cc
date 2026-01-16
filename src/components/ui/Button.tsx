'use client';

import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react';

type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'ghost';
type ButtonSize = 'small' | 'medium' | 'large';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  icon?: ReactNode;
  iconPosition?: 'left' | 'right';
  fullWidth?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      children,
      variant = 'primary',
      size = 'medium',
      loading = false,
      icon,
      iconPosition = 'left',
      fullWidth = false,
      disabled,
      className = '',
      ...props
    },
    ref
  ) => {
    const getVariantStyles = (v: ButtonVariant) => {
      switch (v) {
        case 'primary':
          return {
            background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)',
            color: '#ffffff',
            border: 'none',
            hoverBackground: 'linear-gradient(135deg, #1d4ed8 0%, #1e40af 100%)',
          };
        case 'secondary':
          return {
            background: '#374151',
            color: '#ffffff',
            border: 'none',
            hoverBackground: '#4b5563',
          };
        case 'danger':
          return {
            background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
            color: '#ffffff',
            border: 'none',
            hoverBackground: 'linear-gradient(135deg, #dc2626 0%, #b91c1c 100%)',
          };
        case 'ghost':
          return {
            background: 'transparent',
            color: '#9ca3af',
            border: '1px solid #374151',
            hoverBackground: 'rgba(255, 255, 255, 0.05)',
          };
      }
    };

    const getSizeStyles = (s: ButtonSize) => {
      switch (s) {
        case 'small':
          return { padding: '6px 12px', fontSize: '12px', gap: '4px' };
        case 'large':
          return { padding: '14px 28px', fontSize: '16px', gap: '10px' };
        case 'medium':
        default:
          return { padding: '10px 20px', fontSize: '14px', gap: '8px' };
      }
    };

    const variantStyles = getVariantStyles(variant);
    const sizeStyles = getSizeStyles(size);

    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        className={`custom-button ${className}`}
        {...props}
      >
        <style jsx>{`
          .custom-button {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            gap: ${sizeStyles.gap};
            padding: ${sizeStyles.padding};
            font-size: ${sizeStyles.fontSize};
            font-weight: 600;
            border-radius: 8px;
            cursor: pointer;
            transition: all 0.2s ease;
            background: ${variantStyles.background};
            color: ${variantStyles.color};
            border: ${variantStyles.border};
            width: ${fullWidth ? '100%' : 'auto'};
            position: relative;
            overflow: hidden;
          }
          .custom-button:hover:not(:disabled) {
            background: ${variantStyles.hoverBackground};
            transform: translateY(-1px);
          }
          .custom-button:active:not(:disabled) {
            transform: translateY(0);
          }
          .custom-button:disabled {
            opacity: 0.5;
            cursor: not-allowed;
            transform: none;
          }
          .custom-button:focus-visible {
            outline: 2px solid #2563eb;
            outline-offset: 2px;
          }
          .button-content {
            display: flex;
            align-items: center;
            gap: ${sizeStyles.gap};
            opacity: ${loading ? 0 : 1};
          }
          .spinner {
            position: absolute;
            width: 16px;
            height: 16px;
            border: 2px solid transparent;
            border-top-color: currentColor;
            border-radius: 50%;
            animation: spin 0.8s linear infinite;
          }
          @keyframes spin {
            to {
              transform: rotate(360deg);
            }
          }
        `}</style>
        {loading && <div className="spinner" />}
        <span className="button-content">
          {icon && iconPosition === 'left' && icon}
          {children}
          {icon && iconPosition === 'right' && icon}
        </span>
      </button>
    );
  }
);

Button.displayName = 'Button';
