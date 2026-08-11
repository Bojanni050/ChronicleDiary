import { useState } from 'react';
import { Camera, Clock, BookOpen, Settings as SettingsIcon } from 'lucide-react';
import { RecordScreen } from '@/components/RecordScreen';
import { Timeline } from '@/components/Timeline';
import { EntryDetail } from '@/components/EntryDetail';
import { SettingsPanel } from '@/components/SettingsPanel';

type View = 'record' | 'timeline' | 'detail';

function App() {
  const [view, setView] = useState<View>('record');
  const [selectedEntryId, setSelectedEntryId] = useState<string | null>(null);
  const [timelineRefreshKey, setTimelineRefreshKey] = useState(0);
  const [settingsOpen, setSettingsOpen] = useState(false);

  const handleEntryClick = (entryId: string) => {
    setSelectedEntryId(entryId);
    setView('detail');
  };

  const handleSaved = () => {
    setTimelineRefreshKey((k) => k + 1);
    setView('timeline');
  };

  const handleBack = () => {
    setSelectedEntryId(null);
    setView('timeline');
  };

  return (
    <div className="min-h-screen bg-stone-950 text-white flex flex-col">
      {/* Top bar */}
      <header className="flex items-center justify-between px-5 py-4 border-b border-white/5">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-500/20 to-orange-500/10 border border-amber-500/20 flex items-center justify-center">
            <BookOpen className="w-4 h-4 text-amber-400" />
          </div>
          <span className="text-base font-light tracking-wide text-white/80">ChronicleDiary</span>
        </div>

        <div className="flex items-center gap-3">
          {/* Tab switcher */}
          <div className="flex items-center gap-1 bg-white/5 rounded-full p-1">
          <button
            onClick={() => setView('record')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
              view === 'record'
                ? 'bg-white/10 text-white'
                : 'text-white/40 hover:text-white/60'
            }`}
          >
            <Camera className="w-3.5 h-3.5" />
            Record
          </button>
          <button
            onClick={() => setView('timeline')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
              view === 'timeline' || view === 'detail'
                ? 'bg-white/10 text-white'
                : 'text-white/40 hover:text-white/60'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            Timeline
          </button>
          </div>

          <button
            onClick={() => setSettingsOpen(true)}
            className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center transition-all"
          >
            <SettingsIcon className="w-4 h-4 text-white/50" />
          </button>
        </div>
      </header>

      {/* Content */}
      <main className="flex-1 max-w-2xl w-full mx-auto">
        {view === 'record' && <RecordScreen onSaved={handleSaved} />}
        {view === 'timeline' && <Timeline onEntryClick={handleEntryClick} refreshKey={timelineRefreshKey} />}
        {view === 'detail' && selectedEntryId && (
          <EntryDetail entryId={selectedEntryId} onBack={handleBack} />
        )}
      </main>

      <SettingsPanel open={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </div>
  );
}

export default App;
