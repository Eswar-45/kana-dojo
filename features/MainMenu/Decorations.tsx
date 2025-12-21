'use client';
import {
  useEffect,
  useState,
  useMemo,
  useCallback,
  useRef,
  memo
} from 'react';
import themeSets from '@/features/Preferences/data/themes';
import { useClick } from '@/shared/hooks/useAudio';
import clsx from 'clsx';

// Animation keyframes - injected once when needed
const animationKeyframes = `
@keyframes explode {
  0% {
    transform: scale(1);
    opacity: 1;
  }
  50% {
    transform: scale(2.4);
    opacity: 0.5;
  }
  100% {
    transform: scale(4);
    opacity: 0;
  }
}

@keyframes fadeIn {
  0% {
    opacity: 0;
  }
  100% {
    opacity: 1;
  }
}

@keyframes breathe {
  0%, 100% {
    filter: brightness(1);
  }
  50% {
    filter: brightness(0.5);
  }
}
`;

type DecorationFont = {
  name: string;
  font: {
    className: string;
  };
};

type CharacterStyle = {
  char: string;
  color: string;
  fontClass: string;
};

type AnimState = 'idle' | 'exploding' | 'hidden' | 'fading-in';

// ============================================================================
// CONFIGURATION
// ============================================================================

// Grid configuration - matches Tailwind classes
const GRID_CONFIG = {
  desktop: { cols: 28, cellSize: 36, gap: 2 }, // grid-cols-28, text-4xl ~ 36px
  mobile: { cols: 10, cellSize: 36, gap: 2 } // grid-cols-10
};

// Gradual animation configuration - peaceful, zen-like continuous cycling
const ANIMATION_CONFIG = {
  baseCount: 100, // ~100 characters animating at any given time (~13% of desktop grid)
  turnoverFrequency: 2500, // Every 2.5 seconds, cycle some characters
  turnoverCount: 20, // Remove and add 20 characters each cycle (gradual change)
  pulseDuration: 4500, // 4.5s pulse for peaceful, breathing effect
  minOpacity: 0.3, // Noticeable but not harsh (0.3-1.0)
  transitionDuration: 1200 // 1.2s smooth fade in/out when starting/stopping
};

// Calculate how many characters to render based on viewport
const calculateVisibleCount = (interactive: boolean): number => {
  if (typeof window === 'undefined') {
    // SSR fallback - render enough for large screens
    return 784; // 28 cols × 28 rows
  }

  const config = interactive
    ? window.innerWidth >= 768
      ? GRID_CONFIG.desktop
      : GRID_CONFIG.mobile
    : GRID_CONFIG.desktop;

  const { cols, cellSize, gap } = config;
  const viewHeight = window.innerHeight;

  // Calculate rows that fit in viewport
  const effectiveHeight = viewHeight - 16; // padding
  const rowHeight = cellSize + gap;
  const visibleRows = Math.ceil(effectiveHeight / rowHeight);

  // Add buffer rows for scroll/resize
  const bufferRows = 2;
  const totalRows = visibleRows + bufferRows;

  // Calculate total visible characters
  const effectiveCols =
    interactive && window.innerWidth < 768 ? GRID_CONFIG.mobile.cols : cols;

  return effectiveCols * totalRows;
};

// ============================================================================
// MODULE-LEVEL CACHING - Load once, use forever within session
// ============================================================================

let decorationsCache: string[] | null = null;
let decorationsLoadingPromise: Promise<string[]> | null = null;
let fontsCache: DecorationFont[] | null = null;
let fontsLoadingPromise: Promise<DecorationFont[]> | null = null;
const precomputedStylesCache: Map<number, CharacterStyle[]> = new Map();

// Get all available main colors from themes (computed once at module load)
const allMainColors = (() => {
  const colors = new Set<string>();
  themeSets[2].themes.forEach(theme => {
    colors.add(theme.mainColor);
    if (theme.secondaryColor) colors.add(theme.secondaryColor);
  });
  return Array.from(colors);
})();

// Fisher-Yates shuffle (more efficient and unbiased)
const shuffle = <T,>(arr: T[]): T[] => {
  const result = arr.slice();
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
};

// Load decorations JSON (minimal file with just characters)
const loadDecorations = async (): Promise<string[]> => {
  if (decorationsCache) return decorationsCache;
  if (decorationsLoadingPromise) return decorationsLoadingPromise;

  decorationsLoadingPromise = fetch('/kanji/decorations.json')
    .then(res => res.json())
    .then((chars: string[]) => {
      decorationsCache = shuffle(chars);
      decorationsLoadingPromise = null;
      return decorationsCache;
    });

  return decorationsLoadingPromise;
};

// Load decoration fonts (lazy, only in production)
const loadDecorationFonts = async (
  forceLoad = false
): Promise<DecorationFont[]> => {
  if (process.env.NODE_ENV !== 'production' && !forceLoad) {
    return [];
  }

  if (fontsCache) return fontsCache;
  if (fontsLoadingPromise) return fontsLoadingPromise;

  fontsLoadingPromise = import('./decorationFonts').then(module => {
    fontsCache = module.decorationFonts;
    fontsLoadingPromise = null;
    return module.decorationFonts;
  });

  return fontsLoadingPromise;
};

// Pre-compute styles for a specific count of characters
const precomputeStyles = async (
  count: number,
  forceShow = false
): Promise<CharacterStyle[]> => {
  // Check cache for this count
  const cached = precomputedStylesCache.get(count);
  if (cached) return cached;

  const [allChars, fonts] = await Promise.all([
    loadDecorations(),
    loadDecorationFonts(forceShow)
  ]);

  // If we need more chars than available, repeat them
  let chars: string[];
  if (count <= allChars.length) {
    chars = allChars.slice(0, count);
  } else {
    // Repeat characters to fill the needed count
    chars = [];
    while (chars.length < count) {
      chars.push(
        ...allChars.slice(0, Math.min(allChars.length, count - chars.length))
      );
    }
  }

  const styles = chars.map(char => ({
    char,
    color: allMainColors[Math.floor(Math.random() * allMainColors.length)],
    fontClass:
      fonts.length > 0
        ? fonts[Math.floor(Math.random() * fonts.length)].font.className
        : ''
  }));

  precomputedStylesCache.set(count, styles);
  return styles;
};

// ============================================================================
// INTERACTIVE CHARACTER COMPONENT
// Each manages its own animation state - prevents parent re-renders
// ============================================================================

interface InteractiveCharProps {
  style: CharacterStyle;
  onExplode: () => void;
}

const InteractiveChar = memo(({ style, onExplode }: InteractiveCharProps) => {
  const [animState, setAnimState] = useState<AnimState>('idle');
  const isAnimating = useRef(false);

  const handleClick = useCallback(() => {
    if (isAnimating.current) return;
    isAnimating.current = true;
    onExplode();

    setAnimState('exploding');

    // Animation state transitions - all self-contained
    setTimeout(() => {
      setAnimState('hidden');
      setTimeout(() => {
        setAnimState('fading-in');
        setTimeout(() => {
          setAnimState('idle');
          isAnimating.current = false;
        }, 500);
      }, 1500);
    }, 300);
  }, [onExplode]);

  const getAnimationStyle = (): React.CSSProperties => {
    switch (animState) {
      case 'exploding':
        return { animation: 'explode 300ms ease-out forwards' };
      case 'hidden':
        return { opacity: 0 };
      case 'fading-in':
        return { animation: 'fadeIn 500ms ease-in forwards' };
      default:
        return {};
    }
  };

  return (
    <span
      className={clsx(
        'inline-flex items-center justify-center text-4xl',
        style.fontClass,
        animState === 'idle' && 'cursor-pointer'
      )}
      aria-hidden='true'
      style={{
        color: style.color,
        transformOrigin: 'center center',
        pointerEvents: animState !== 'idle' ? 'none' : undefined,
        contentVisibility: 'auto',
        containIntrinsicSize: '36px',
        ...getAnimationStyle()
      }}
      onClick={animState === 'idle' ? handleClick : undefined}
    >
      {style.char}
    </span>
  );
});

InteractiveChar.displayName = 'InteractiveChar';

// ============================================================================
// STATIC CHARACTER COMPONENT
// Simple span with no state - maximum performance for non-interactive mode
// ============================================================================

interface StaticCharProps {
  style: CharacterStyle;
  isAnimating?: boolean;
  isFading?: boolean;
}

const StaticChar = memo(
  ({ style, isAnimating = false, isFading = false }: StaticCharProps) => {
    return (
      <span
        className={clsx(
          'inline-flex items-center justify-center text-4xl',
          style.fontClass
        )}
        aria-hidden='true'
        style={{
          color: style.color,
          contentVisibility: 'auto',
          containIntrinsicSize: '36px',
          // Animation uses filter:brightness (not opacity), so no conflict with opacity fade
          // Only animate when not fading
          animation:
            isAnimating && !isFading
              ? `breathe ${ANIMATION_CONFIG.pulseDuration}ms ease-in-out infinite`
              : undefined,
          // When fading, smoothly transition opacity to fade out the pulsing
          // Opacity and brightness are independent, so they don't conflict
          ...(isFading && {
            opacity: 1,
            transition: `opacity ${ANIMATION_CONFIG.transitionDuration}ms ease-in-out`
          })
        }}
      >
        {style.char}
      </span>
    );
  }
);

StaticChar.displayName = 'StaticChar';

// ============================================================================
// MAIN COMPONENT
// ============================================================================

const Decorations = ({
  expandDecorations,
  forceShow = false,
  interactive = false
}: {
  expandDecorations: boolean;
  forceShow?: boolean;
  interactive?: boolean;
}) => {
  const [styles, setStyles] = useState<CharacterStyle[]>([]);
  const [visibleCount, setVisibleCount] = useState<number>(() =>
    calculateVisibleCount(interactive)
  );
  const [animatingIndices, setAnimatingIndices] = useState<Set<number>>(
    new Set()
  );
  const [fadingIndices, setFadingIndices] = useState<Set<number>>(new Set());
  const { playClick } = useClick();

  // Store latest playClick in ref to keep handleExplode stable
  const playClickRef = useRef(playClick);
  useEffect(() => {
    playClickRef.current = playClick;
  }, [playClick]);

  // Stable callback for explosion sound - truly stable, no recreations
  const handleExplode = useCallback(() => {
    playClickRef.current();
  }, []);

  // Handle viewport resize with debounce
  const resizeTimeoutRef = useRef<NodeJS.Timeout | undefined>(undefined);

  useEffect(() => {
    const handleResize = () => {
      if (resizeTimeoutRef.current) clearTimeout(resizeTimeoutRef.current);
      resizeTimeoutRef.current = setTimeout(() => {
        const newCount = calculateVisibleCount(interactive);
        if (newCount !== visibleCount) {
          setVisibleCount(newCount);
        }
      }, 100); // Debounce 100ms
    };

    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
      if (resizeTimeoutRef.current) clearTimeout(resizeTimeoutRef.current);
    };
  }, [interactive, visibleCount]);

  // Load styles when visible count changes
  useEffect(() => {
    let isMounted = true;

    precomputeStyles(visibleCount, forceShow).then(computedStyles => {
      if (isMounted) {
        setStyles(computedStyles);
      }
    });

    return () => {
      isMounted = false;
    };
  }, [visibleCount, forceShow]);

  // Inject animation keyframes once when component mounts
  useEffect(() => {
    const styleId = 'decorations-animation-keyframes';
    // Only inject if not already present
    if (document.getElementById(styleId)) return;

    const styleElement = document.createElement('style');
    styleElement.id = styleId;
    styleElement.textContent = animationKeyframes;
    document.head.appendChild(styleElement);

    return () => {
      // Cleanup when component unmounts
      const existingStyle = document.getElementById(styleId);
      if (existingStyle) {
        existingStyle.remove();
      }
    };
  }, []);

  // Gradual continuous animation cycling - peaceful zen-like effect
  useEffect(() => {
    // Only run in static mode
    if (interactive || styles.length === 0) return;

    // Helper: Select random unique indices
    const selectRandomIndices = (count: number, max: number): Set<number> => {
      const indices = new Set<number>();
      while (indices.size < Math.min(count, max)) {
        indices.add(Math.floor(Math.random() * max));
      }
      return indices;
    };

    // Helper: Remove N random items from a set and return them
    const removeRandomFromSet = (
      set: Set<number>,
      count: number
    ): { remaining: Set<number>; removed: Set<number> } => {
      const array = Array.from(set);
      const removedItems = new Set<number>();
      while (removedItems.size < Math.min(count, array.length)) {
        const randomIndex = Math.floor(Math.random() * array.length);
        removedItems.add(array[randomIndex]);
      }
      const remaining = new Set(array.filter(item => !removedItems.has(item)));
      return { remaining, removed: removedItems };
    };

    // Helper: Add N random indices to a set (avoiding existing ones)
    const addRandomToSet = (
      set: Set<number>,
      count: number,
      max: number,
      exclude: Set<number>
    ): Set<number> => {
      const newSet = new Set(set);
      const combined = new Set([...set, ...exclude]);
      let attempts = 0;
      while (newSet.size < Math.min(set.size + count, max) && attempts < count * 10) {
        const randomIndex = Math.floor(Math.random() * max);
        if (!combined.has(randomIndex)) {
          newSet.add(randomIndex);
          combined.add(randomIndex);
        }
        attempts++;
      }
      return newSet;
    };

    // Initialize with base count
    const initialIndices = selectRandomIndices(
      ANIMATION_CONFIG.baseCount,
      styles.length
    );
    setAnimatingIndices(initialIndices);

    // Gradual turnover: every 2.5s, move some to fading, add new ones
    const turnoverInterval = setInterval(() => {
      setAnimatingIndices(currentIndices => {
        // Remove random subset and get what was removed
        const { remaining, removed } = removeRandomFromSet(
          currentIndices,
          ANIMATION_CONFIG.turnoverCount
        );

        // Move removed items to fading set
        setFadingIndices(currentFading => {
          const newFading = new Set([...currentFading, ...removed]);
          // Clean up old fading items after transition duration
          setTimeout(() => {
            setFadingIndices(f => {
              const cleaned = new Set(f);
              removed.forEach(idx => cleaned.delete(idx));
              return cleaned;
            });
          }, ANIMATION_CONFIG.transitionDuration);
          return newFading;
        });

        // Add new random subset (excluding fading ones)
        return addRandomToSet(
          remaining,
          ANIMATION_CONFIG.turnoverCount,
          styles.length,
          removed
        );
      });
    }, ANIMATION_CONFIG.turnoverFrequency);

    return () => {
      clearInterval(turnoverInterval);
      setAnimatingIndices(new Set());
      setFadingIndices(new Set());
    };
  }, [interactive, styles.length]);

  // Memoize grid content - using separate components for interactive vs static
  const gridContent = useMemo(() => {
    if (styles.length === 0) return null;

    if (interactive) {
      // Interactive mode: each char manages its own animation state
      // Note: Using index as key is acceptable here since styles array is stable after precomputation
      return styles.map((style, index) => (
        <InteractiveChar key={index} style={style} onExplode={handleExplode} />
      ));
    } else {
      // Static mode: gradual cycling animation - peaceful, zen-like breathing
      return styles.map((style, index) => (
        <StaticChar
          key={index}
          style={style}
          isAnimating={animatingIndices.has(index)}
          isFading={fadingIndices.has(index)}
        />
      ));
    }
  }, [styles, interactive, handleExplode, animatingIndices, fadingIndices]);

  if (styles.length === 0) return null;

  return (
    <>
      <div
        className={clsx(
          'fixed inset-0 overflow-hidden',
          expandDecorations ? 'opacity-100' : 'opacity-30',
          interactive ? 'pointer-events-auto' : 'pointer-events-none'
        )}
      >
        <div
          className={clsx(
            'grid h-full w-full gap-0.5 p-2',
            interactive ? 'grid-cols-10 md:grid-cols-28' : 'grid-cols-28'
          )}
        >
          {gridContent}
        </div>
      </div>
    </>
  );
};

export default Decorations;
