import React from 'react';
import { MessageCircle } from 'lucide-react';
import { getWhatsAppLink } from '../../lib/utils';

interface WhatsAppButtonProps {
  phone?: string | null;
  message?: string;
  size?: 'sm' | 'md' | 'lg';
  label?: string;
  variant?: 'solid' | 'outline' | 'ghost' | 'icon';
  className?: string;
}

export const WhatsAppButton: React.FC<WhatsAppButtonProps> = ({
  phone,
  message,
  size = 'md',
  label = 'WhatsApp',
  variant = 'solid',
  className = '',
}) => {
  const safePhone = phone ? String(phone) : '';
  const url = getWhatsAppLink(safePhone, message);
  const cleanId = safePhone ? safePhone.replace(/\D/g, '') : 'empty';

  const sizeClasses = {
    sm: 'text-xs px-2.5 py-1.5 gap-1.5 rounded-lg',
    md: 'text-sm px-3 py-2 gap-2 rounded-xl',
    lg: 'text-base px-4 py-2.5 gap-2.5 rounded-xl',
  };

  const variantClasses = {
    solid: 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm hover:shadow active:scale-95 transition-all font-medium',
    outline: 'border border-emerald-600/40 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 transition-all font-medium',
    ghost: 'text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 transition-all font-medium',
    icon: 'p-2 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 rounded-xl transition-all',
  };

  if (!safePhone || url === '#') {
    return (
      <span
        id={`wa-btn-${cleanId}`}
        className={`inline-flex items-center justify-center opacity-40 cursor-not-allowed select-none ${
          variant === 'icon' ? variantClasses.icon : `${sizeClasses[size]} ${variantClasses[variant]}`
        } ${className}`}
        title="Telefone não informado"
      >
        <MessageCircle className={size === 'sm' ? 'w-3.5 h-3.5' : 'w-4 h-4'} />
        {variant !== 'icon' && <span>{label}</span>}
      </span>
    );
  }

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const opened = window.open(url, '_blank', 'noopener,noreferrer');
      if (!opened) {
        window.location.assign(url);
      }
    } catch {
      window.location.href = url;
    }
  };

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      id={`wa-btn-${cleanId}`}
      onClick={handleClick}
      className={`inline-flex items-center justify-center select-none cursor-pointer ${
        variant === 'icon' ? variantClasses.icon : `${sizeClasses[size]} ${variantClasses[variant]}`
      } ${className}`}
      title={message ? `WhatsApp: ${message}` : 'Abrir conversa no WhatsApp'}
    >
      <MessageCircle className={size === 'sm' ? 'w-3.5 h-3.5' : 'w-4 h-4'} />
      {variant !== 'icon' && <span>{label}</span>}
    </a>
  );
};
