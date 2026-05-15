import Image from 'next/image';

import type { ResolvedTheme } from '@/lib/theme/server';

interface BrandLogoProps {
  theme: Pick<ResolvedTheme, 'brandName' | 'logoUrl'>;
  size?: number;
}

export function BrandLogo({ theme, size = 32 }: BrandLogoProps) {
  if (theme.logoUrl) {
    return (
      <Image
        src={theme.logoUrl}
        alt={theme.brandName}
        width={size}
        height={size}
        className="object-contain"
      />
    );
  }
  return <BrandLetterFallback letter={theme.brandName[0] ?? 'C'} size={size} />;
}

function BrandLetterFallback({ letter, size }: { letter: string; size: number }) {
  return (
    <div
      style={{ width: size, height: size, fontSize: Math.round(size * 0.5) }}
      className="flex items-center justify-center rounded-md bg-primary text-primary-on font-semibold"
    >
      {letter.toUpperCase()}
    </div>
  );
}
