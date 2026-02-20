'use client';
import clsx from 'clsx';
import usePreferencesStore from '@/features/Preferences/store/usePreferencesStore';
import { buttonBorderStyles } from '@/shared/lib/styles';
import { CURSOR_TRAIL_EFFECTS, CLICK_EFFECTS } from '../data/effectsData';
import CollapsibleSection from './CollapsibleSection';
import { MousePointer2, Zap } from 'lucide-react';

const CLICK_EFFECT_MANUAL_ORDER = [
  'none',
  'firework',
  'sakura',
  'torii',
  'festival',
  'wave',
  'dango',
  'lantern',
  'fan',
  'fish',
  'sparkle',
  'lotus',
  'maple',
  'tea',
  'blossom',
  'wind',
  'star',
  'bamboo',
  'butterfly',
  'snowflake',
  'fuji',
  'rice',
] as const;

const clickEffectById = new Map(CLICK_EFFECTS.map(effect => [effect.id, effect]));
const ORDERED_CLICK_EFFECTS = CLICK_EFFECT_MANUAL_ORDER.map(
  id => clickEffectById.get(id)!,
);

const EMOJI_RAIN_POSITIONS = [
  // Staggered diagonal cascade: intentional rhythm, deterministic per card.
  { top: '-20%', left: '-12%', size: 'text-xl', opacity: 'opacity-55' },
  { top: '-8%', left: '14%', size: 'text-2xl', opacity: 'opacity-75' },
  { top: '-18%', left: '46%', size: 'text-xl', opacity: 'opacity-60' },
  { top: '-6%', left: '78%', size: 'text-2xl', opacity: 'opacity-72' },
  { top: '8%', left: '104%', size: 'text-xl', opacity: 'opacity-55' },

  { top: '20%', left: '-16%', size: 'text-2xl', opacity: 'opacity-68' },
  { top: '34%', left: '18%', size: 'text-xl', opacity: 'opacity-82' },
  { top: '24%', left: '50%', size: 'text-2xl', opacity: 'opacity-88' },
  { top: '36%', left: '82%', size: 'text-xl', opacity: 'opacity-76' },

  { top: '58%', left: '-10%', size: 'text-xl', opacity: 'opacity-62' },
  { top: '70%', left: '22%', size: 'text-2xl', opacity: 'opacity-84' },
  { top: '60%', left: '54%', size: 'text-xl', opacity: 'opacity-80' },
  { top: '72%', left: '88%', size: 'text-2xl', opacity: 'opacity-70' },

  { top: '92%', left: '2%', size: 'text-xl', opacity: 'opacity-58' },
  { top: '102%', left: '34%', size: 'text-2xl', opacity: 'opacity-72' },
  { top: '94%', left: '68%', size: 'text-xl', opacity: 'opacity-60' },
  { top: '108%', left: '98%', size: 'text-2xl', opacity: 'opacity-56' },
] as const;

// ─── Effect card ─────────────────────────────────────────────────────────────

function EffectCard({
  id,
  name,
  emoji,
  isSelected,
  onSelect,
  group,
}: {
  id: string;
  name: string;
  emoji: string;
  isSelected: boolean;
  onSelect: () => void;
  group: 'cursor-trail' | 'click';
}) {
  const rainEmoji = emoji || '•';
  const isNoneCard = id === 'none';

  return (
    <label
      className={clsx(
        isNoneCard
          ? 'flex h-20 flex-col items-center justify-center gap-1'
          : 'relative h-20 overflow-hidden',
        buttonBorderStyles,
        'border-1 border-(--card-color)',
        'cursor-pointer px-2 py-2.5',
      )}
      style={{
        outline: isSelected ? '3px solid var(--secondary-color)' : 'none',
        transition: 'background-color 275ms',
      }}
    >
      <input
        type='radio'
        name={`effect-${group}`}
        className='hidden'
        onChange={onSelect}
        checked={isSelected}
        aria-label={name}
      />
      {isNoneCard ? (
        <>
          <span className='text-base leading-none text-(--secondary-color)'>
            —
          </span>
          <span className='text-center text-xs leading-tight'>{name}</span>
        </>
      ) : (
        EMOJI_RAIN_POSITIONS.map((p, i) => (
          <span
            key={`${group}-${name}-${i}`}
            className={clsx(
              'pointer-events-none absolute leading-none select-none',
              p.size,
              p.opacity,
            )}
            style={{ top: p.top, left: p.left }}
            aria-hidden='true'
          >
            {rainEmoji}
          </span>
        ))
      )}
    </label>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

const Effects = () => {
  const cursorTrailEffect = usePreferencesStore(s => s.cursorTrailEffect);
  const setCursorTrailEffect = usePreferencesStore(s => s.setCursorTrailEffect);
  const clickEffect = usePreferencesStore(s => s.clickEffect);
  const setClickEffect = usePreferencesStore(s => s.setClickEffect);

  return (
    <div className='flex flex-col gap-6'>
      {/* Cursor Trail — desktop only */}
      <CollapsibleSection
        title={
          <span className='flex items-center gap-2'>
            Cursor Trail
            <span className='rounded-md bg-(--card-color) px-1.5 py-0.5 text-xs text-(--secondary-color)'>
              desktop only
            </span>
          </span>
        }
        icon={<MousePointer2 size={18} />}
        level='subsubsection'
        defaultOpen={true}
        storageKey='prefs-effects-cursor'
      >
        <fieldset className='grid grid-cols-3 gap-2 p-1 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6'>
          {CURSOR_TRAIL_EFFECTS.map(effect => (
            <EffectCard
              key={effect.id}
              id={effect.id}
              name={effect.name}
              emoji={effect.emoji}
              isSelected={cursorTrailEffect === effect.id}
              onSelect={() => setCursorTrailEffect(effect.id)}
              group='cursor-trail'
            />
          ))}
        </fieldset>
      </CollapsibleSection>

      {/* Click / Tap Effects — all devices */}
      <CollapsibleSection
        title='Click Effects'
        icon={<Zap size={18} />}
        level='subsubsection'
        defaultOpen={true}
        storageKey='prefs-effects-click'
      >
        <fieldset className='grid grid-cols-3 gap-2 p-1 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6'>
          {ORDERED_CLICK_EFFECTS.map(effect => (
            <EffectCard
              key={effect.id}
              id={effect.id}
              name={effect.name}
              emoji={effect.emoji}
              isSelected={clickEffect === effect.id}
              onSelect={() => setClickEffect(effect.id)}
              group='click'
            />
          ))}
        </fieldset>
      </CollapsibleSection>
    </div>
  );
};

export default Effects;
