import { MOODS } from '@/lib/constants';

interface MoodSelectorProps {
  selectedMood: string | null;
  onSelect: (mood: string | null) => void;
}

export function MoodSelector({ selectedMood, onSelect }: MoodSelectorProps) {
  return (
    <div className="flex gap-2 overflow-x-auto pb-2 -mx-4 px-4 scrollbar-hide">
      <button
        onClick={() => onSelect(null)}
        className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
          selectedMood === null
            ? 'bg-white/15 text-white border border-white/20'
            : 'bg-white/5 text-white/40 border border-transparent hover:bg-white/10'
        }`}
      >
        No mood
      </button>
      {MOODS.map((mood) => {
        const isActive = selectedMood === mood.id;
        return (
          <button
            key={mood.id}
            onClick={() => onSelect(isActive ? null : mood.id)}
            className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
              isActive
                ? 'bg-amber-400/20 text-amber-300 border border-amber-400/40'
                : 'bg-white/5 text-white/50 border border-transparent hover:bg-white/10'
            }`}
          >
            <span className="text-sm">{mood.emoji}</span>
            {mood.label}
          </button>
        );
      })}
    </div>
  );
}
