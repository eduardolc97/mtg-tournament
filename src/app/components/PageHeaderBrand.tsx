import { useMemo, type ReactNode } from 'react';
import { useLocation } from 'react-router';
import { cn } from './ui/utils';
import { publicAssetUrl } from '../lib/publicAssetUrl';
import {
  PAGE_HEADER_LOGO_FIXED_FILE,
  PAGE_HEADER_RANDOM_MEDIA_FILES,
} from '../constants/pageHeaderBranding';

type PageHeaderBrandVariant = 'dashboard' | 'create' | 'tournament' | 'league';

const LANDSCAPE_SHORT =
  '[@media(orientation:landscape)_and_(max-height:500px)]';

const FRAME_FIXED =
  'inline-flex shrink-0 items-center justify-center rounded-xl ring-2 ring-inset ring-purple-400/35 bg-black/50 shadow-lg shadow-purple-950/50 p-0.5';

const FRAME_RANDOM =
  'overflow-hidden rounded-xl ring-1 ring-inset ring-purple-500/30 bg-black/40 shadow-md shadow-black/30 shrink-0';

const VARIANT_SIZES: Record<
  PageHeaderBrandVariant,
  { random: string; fixedMaxH: string }
> = {
  dashboard: {
    fixedMaxH: cn(
      'max-h-[6.25rem] sm:max-h-36 md:max-h-40 lg:max-h-44',
      `${LANDSCAPE_SHORT}:max-h-24`,
    ),
    random: cn(
      'w-[5.5rem] h-[5.5rem] sm:w-32 sm:h-32 md:w-36 md:h-36 lg:w-40 lg:h-40',
      `${LANDSCAPE_SHORT}:w-24 ${LANDSCAPE_SHORT}:h-24`,
    ),
  },
  create: {
    fixedMaxH: 'max-h-32 sm:max-h-36 md:max-h-40',
    random: 'w-28 h-28 sm:w-32 sm:h-32 md:w-36 md:h-36',
  },
  tournament: {
    fixedMaxH: cn(
      'max-h-28 sm:max-h-32 md:max-h-36',
      `${LANDSCAPE_SHORT}:max-h-24`,
    ),
    random: cn(
      'w-[5.75rem] h-[5.75rem] sm:w-28 sm:h-28 md:w-32 md:h-32',
      `${LANDSCAPE_SHORT}:w-24 ${LANDSCAPE_SHORT}:h-24`,
    ),
  },
  league: {
    fixedMaxH: 'max-h-32 sm:max-h-36 md:max-h-40',
    random: 'w-28 h-28 sm:w-32 sm:h-32 md:w-36 md:h-36',
  },
};

function pickRandom<T>(items: T[]): T {
  if (items.length === 0) {
    throw new Error('Empty pool');
  }
  return items[Math.floor(Math.random() * items.length)];
}

function isVideoFile(name: string): boolean {
  return /\.mp4$/i.test(name);
}

interface PageHeaderBrandProps {
  variant: PageHeaderBrandVariant;
  justify?: 'center' | 'start';
  className?: string;
  children: ReactNode;
}

export default function PageHeaderBrand({
  variant,
  justify = 'start',
  className,
  children,
}: PageHeaderBrandProps) {
  const location = useLocation();
  const { random: randomSize, fixedMaxH: fixedMaxH } = VARIANT_SIZES[variant];

  const randomFile = useMemo(
    () => pickRandom(PAGE_HEADER_RANDOM_MEDIA_FILES),
    [location.pathname, location.key],
  );

  const randomSrc = publicAssetUrl(randomFile);
  const fixedSrc = publicAssetUrl(PAGE_HEADER_LOGO_FIXED_FILE);
  const randomIsVideo = isVideoFile(randomFile);

  return (
    <div
      className={cn(
        'flex flex-wrap items-center gap-3 sm:gap-4 md:gap-5 min-w-0',
        justify === 'center' && 'justify-center',
        justify === 'start' && 'justify-start',
        className,
      )}
    >
      <div className={cn(FRAME_FIXED)}>
        <img
          src={fixedSrc}
          alt=""
          className={cn(
            'block h-auto w-auto max-w-full object-contain',
            fixedMaxH,
          )}
          decoding="async"
        />
      </div>

      <div
        className={cn(
          'min-w-0 flex-1',
          justify === 'center' && 'text-center',
        )}
      >
        {children}
      </div>

      <div className={cn(FRAME_RANDOM, randomSize)}>
        {randomIsVideo ? (
          <video
            key={randomSrc}
            className="h-full w-full object-cover pointer-events-none"
            src={randomSrc}
            muted
            playsInline
            autoPlay
            loop
            preload="metadata"
            aria-hidden
          />
        ) : (
          <img
            key={randomSrc}
            src={randomSrc}
            alt=""
            className="h-full w-full object-cover"
            decoding="async"
          />
        )}
      </div>
    </div>
  );
}
