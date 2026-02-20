'use client';
import clsx from 'clsx';
import usePreferencesStore from '@/features/Preferences/store/usePreferencesStore';
import { buttonBorderStyles } from '@/shared/lib/styles';
import { useHasFinePointer } from '@/shared/hooks/useHasFinePointer';
import { CURSOR_TRAIL_EFFECTS, CLICK_EFFECTS } from '../data/effectsData';
import CollapsibleSection from './CollapsibleSection';
import { MousePointer2, Zap } from 'lucide-react';

const CLICK_EFFECT_MANUAL_ORDER = [
  'none',
  'moon',
  'festival',
  'ramen',
  'fish',
  'senbei',
  'bamboo',
  'sakura',
  'hina',
  'lantern',
  'chopsticks',
  'snowflake',
  'fuji',
  'lotus',
  'castle',
  'sparkle',
  'carp',
  'maple',
  'tea',
  'torii',
  'star',
  'butterfly',
  'wave',
  'fan',
  'sushi',
  'firework',
  'rice',
  'wind',
  'blossom',
  'dango',
  'kitsune',
] as const;

const clickEffectById = new Map(CLICK_EFFECTS.map(effect => [effect.id, effect]));
const ORDERED_CLICK_EFFECTS = CLICK_EFFECT_MANUAL_ORDER.map(
  id => clickEffectById.get(id)!,
);

function EffectCard({
  name,
  emoji,
  isSelected,
  onSelect,
  group,
}: {
  name: string;
  emoji: string;
  isSelected: boolean;
  onSelect: () => void;
  group: 'cursor-trail' | 'click';
}) {
  return (
    <label
      className={clsx(
        'flex h-20 flex-col items-center justify-center gap-1',
        buttonBorderStyles,
        'border-1 border-(--card-color)',
        'cursor-pointer px-2 py-2.5',
      )}
      style={{
        outline: isSelected ? '3px solid var(--main-color)' : 'none',
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
      {emoji ? (
        <span className='text-3xl leading-none'>{emoji}</span>
      ) : (
        <span className='text-lg leading-none text-(--secondary-color)'>-</span>
      )}
      {/* TEMP: hide effect names in cards */}
      {/* <span className='text-center text-xs leading-tight'>{name}</span> */}
    </label>
  );
}

const Effects = () => {
  const hasFinePointer = useHasFinePointer();
  const cursorTrailEffect = usePreferencesStore(s => s.cursorTrailEffect);
  const setCursorTrailEffect = usePreferencesStore(s => s.setCursorTrailEffect);
  const clickEffect = usePreferencesStore(s => s.clickEffect);
  const setClickEffect = usePreferencesStore(s => s.setClickEffect);

  return (
    <div className='flex flex-col gap-6'>
      {hasFinePointer && (
        <CollapsibleSection
          title='Cursor Trail'
          icon={<MousePointer2 size={18} />}
          level='subsubsection'
          defaultOpen={true}
          storageKey='prefs-effects-cursor'
        >
          <fieldset className='grid grid-cols-5 gap-3 p-1 sm:grid-cols-6 md:grid-cols-7 lg:grid-cols-8'>
            {CURSOR_TRAIL_EFFECTS.map(effect => (
              <EffectCard
                key={effect.id}
                name={effect.name}
                emoji={effect.emoji}
                isSelected={cursorTrailEffect === effect.id}
                onSelect={() => setCursorTrailEffect(effect.id)}
                group='cursor-trail'
              />
            ))}
          </fieldset>
        </CollapsibleSection>
      )}

      <CollapsibleSection
        title='Click Effects'
        icon={<Zap size={18} />}
        level='subsubsection'
        defaultOpen={true}
        storageKey='prefs-effects-click'
      >
        <fieldset className='grid grid-cols-5 gap-3 p-1 sm:grid-cols-6 md:grid-cols-7 lg:grid-cols-8'>
          {ORDERED_CLICK_EFFECTS.map(effect => (
            <EffectCard
              key={effect.id}
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
