import type { ReactNode } from 'react';

// Normalizes a Brazilian phone to E.164 digits (no '+') for wa.me.
// Accepts "(11) 91234-5678", "11912345678", "+55 11 91234-5678", etc.
export function normalizeBrazilPhone(input: string): string {
  const digits = input.replace(/\D/g, '');
  if (digits.startsWith('55') && (digits.length === 12 || digits.length === 13)) {
    return digits;
  }
  if (digits.length === 10 || digits.length === 11) {
    return `55${digits}`;
  }
  return digits;
}

export interface WhatsAppButtonProps {
  phone: string;
  message?: string;
  className?: string;
  children?: ReactNode;
}

export function WhatsAppButton({ phone, message, className, children }: WhatsAppButtonProps) {
  const normalized = normalizeBrazilPhone(phone);
  const query = message ? `?text=${encodeURIComponent(message)}` : '';
  const href = `https://wa.me/${normalized}${query}`;

  return (
    <a href={href} target="_blank" rel="noopener noreferrer" className={className}>
      {children ?? 'WhatsApp'}
    </a>
  );
}
