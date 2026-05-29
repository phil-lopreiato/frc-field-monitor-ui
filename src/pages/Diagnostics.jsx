import { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faChevronDown, faChevronRight } from '@fortawesome/free-solid-svg-icons';
import DetailedTeamStatusCard from '../components/DetailedTeamStatusCard';
import { useFieldMonitorLiveData } from '../lib/fieldMonitorLive';
import usePageTitle from '../lib/usePageTitle';

const panelTheme = (alliance) =>
  alliance === 'red'
    ? { frame: 'ring-red-300 shadow-red-950/10' }
    : { frame: 'ring-blue-300 shadow-blue-950/10' };

const formatReplayClock = (ms = 0) => {
  const totalTenths = Math.max(0, Math.round(ms / 100));
  const minutes = Math.floor(totalTenths / 600);
  const seconds = Math.floor((totalTenths % 600) / 10);
  const tenths = totalTenths % 10;
  return `${minutes}:${String(seconds).padStart(2, '0')}.${tenths}`;
};

const isEditableTarget = (target) => {
  if (!(target instanceof HTMLElement)) {
    return false;
  }

  if (target.isContentEditable) {
    return true;
  }

  const editableRoot = target.closest('input, textarea, select, [contenteditable="true"], [role="textbox"]');
  return Boolean(editableRoot);
};

const normalizeScheduleStatus = (value) => (typeof value === 'string' ? value.trim().toLowerCase() : '');

function TopBarStat({ label, value, className = '', valueClassName = '' }) {
  return (
    <div className={`min-w-0 rounded-2xl border border-zinc-200 bg-zinc-50 px-3 py-2 ${className}`}>
      <div className="text-[10px] font-black uppercase tracking-[0.14em] text-zinc-500">
        {label}
      </div>
      <div className={`mt-1 truncate text-sm font-bold text-zinc-900 sm:text-base ${valueClassName}`}>
        {value}
      </div>
    </div>
  );
}

export default function Diagnostics() {
  usePageTitle('Diagnostics');

  const [searchParams] = useSearchParams();
  const mirrorLayout = searchParams.get('mirror') === 'true';
  const reverseBlueTeams = searchParams.get('reverseBlueTeams') === 'true';
  const replayFileInputRef = useRef(null);
  const [isReplayErrorDismissed, setIsReplayErrorDismissed] = useState(false);
  const [collapseSignal, setCollapseSignal] = useState({ target: true, version: 1 });
  const {
    diagnosticsPanels,
    matchStatus,
    scheduleStatus,
    cycleCadence,
    sourceMode,
    replay,
    error,
    aheadBehind,
    isAheadBehindKnown,
  } = useFieldMonitorLiveData({
    mirrorLayout,
    reverseBlueTeams,
  });

  const replayError = replay.error || (sourceMode === 'replay' ? error : '');
  const showReplayError = Boolean(replayError) && !isReplayErrorDismissed;
  const showReplayOverlay = sourceMode === 'replay' || showReplayError;
  const scheduleTrendText = isAheadBehindKnown ? aheadBehind : scheduleStatus;
  const scheduleTone = normalizeScheduleStatus(scheduleTrendText).includes('behind')
    ? 'text-amber-700'
    : normalizeScheduleStatus(scheduleTrendText).startsWith('ahead')
      ? 'text-emerald-700'
      : '';

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (!event.altKey || event.code !== 'KeyL' || event.defaultPrevented || isEditableTarget(event.target)) {
        return;
      }

      event.preventDefault();
      setIsReplayErrorDismissed(false);
      replayFileInputRef.current?.click();
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  return (
    <div className="relative flex min-h-screen flex-col bg-zinc-100 text-zinc-900" style={{ minHeight: '100dvh' }}>
      <input
        ref={replayFileInputRef}
        type="file"
        accept="application/json,.json"
        className="hidden"
        onChange={async (event) => {
          const file = event.target.files?.[0];
          setIsReplayErrorDismissed(false);
          if (file) {
            await replay.loadReplayFile(file);
          }
          event.target.value = '';
        }}
      />

      <div className="shrink-0 px-3 pb-1 pt-2 lg:px-4 lg:pb-1.5 lg:pt-2.5">
        <div
          data-testid="diagnostics-topbar"
          className="rounded-[22px] bg-white px-3 py-3 shadow-sm ring-1 ring-zinc-200 lg:px-4"
        >
          <div className="flex items-start gap-2">
            <div className="grid min-w-0 flex-1 gap-2 sm:grid-cols-2 xl:grid-cols-4">
              <TopBarStat label="Match Number" value={matchStatus.matchNumber > 0 ? `M${matchStatus.matchNumber}` : 'No match yet'} />
              <TopBarStat label="Match State" value={matchStatus.matchStateMessage || 'Waiting for data'} />
              <TopBarStat label="Schedule" value={scheduleTrendText || 'Unknown'} valueClassName={scheduleTone} />
              <TopBarStat label="Cycle" value={cycleCadence.summary || 'Waiting for data'} />
            </div>
            <button
              type="button"
              data-testid="diagnostics-collapse-toggle"
              className="flex shrink-0 items-center gap-1.5 self-center rounded-full border border-zinc-200 bg-zinc-50 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.1em] text-zinc-600 transition-colors hover:bg-zinc-100"
              onClick={() => setCollapseSignal((prev) => ({ target: !prev.target, version: prev.version + 1 }))}
              aria-label={collapseSignal.target ? 'Expand all sections' : 'Collapse all sections'}
            >
              <FontAwesomeIcon
                icon={collapseSignal.target ? faChevronRight : faChevronDown}
                className="h-2.5 w-2.5"
              />
              {collapseSignal.target ? 'Expand' : 'Collapse'}
            </button>
          </div>
        </div>
      </div>

      <div
        data-testid="diagnostics-content"
        className={`flex min-h-0 flex-1 flex-col overflow-y-auto lg:flex-row ${
          showReplayOverlay ? 'pb-[calc(8rem+env(safe-area-inset-bottom))] sm:pb-32' : ''
        }`}
      >
        {diagnosticsPanels.map((panel) => {
          const theme = panelTheme(panel.alliance);
          return (
            <div
              key={`diagnostics-${panel.alliance}`}
              className="relative flex w-full min-w-0 flex-none p-[3px] lg:flex-1"
            >
              <section className={`relative flex min-h-0 flex-1 flex-col rounded-[24px] bg-white p-3 shadow-sm ring-2 ${theme.frame}`}>
                <div
                  className="grid min-h-0 flex-1 auto-rows-min gap-3 content-start"
                  data-testid="diagnostics-panel-grid"
                >
                  {panel.rows.map((row) => (
                    <DetailedTeamStatusCard
                      key={`diagnostics-${panel.alliance}-${row.team}-${row.station}`}
                      alliance={panel.alliance}
                      row={row}
                      collapseSignal={collapseSignal}
                    />
                  ))}
                </div>
              </section>
            </div>
          );
        })}
      </div>

      {showReplayOverlay ? (
        <div className="pointer-events-none fixed inset-x-0 bottom-0 z-50 flex justify-center px-4 pb-[calc(1rem+env(safe-area-inset-bottom))]">
          <div
            className="pointer-events-auto max-h-[45vh] w-full max-w-3xl overflow-y-auto rounded-[28px] border border-white/20 bg-zinc-950/72 px-3 py-2.5 text-white shadow-2xl backdrop-blur-md sm:px-4 sm:py-3 md:max-h-none md:overflow-visible"
            style={{ backgroundColor: 'rgba(24, 24, 27, 0.92)' }}
          >
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-black uppercase tracking-[0.18em] ${
                      sourceMode === 'replay'
                        ? 'bg-blue-500/20 text-blue-100 ring-1 ring-blue-300/30'
                        : 'bg-amber-500/20 text-amber-50 ring-1 ring-amber-300/30'
                    }`}
                  >
                    {sourceMode === 'replay' ? 'Replay active' : 'Replay load failed'}
                  </span>
                  {replay.fileName ? (
                    <span className="truncate text-sm font-semibold text-white/90">{replay.fileName}</span>
                  ) : (
                    <span className="text-sm text-white/70">Press Alt+L to load replay JSON</span>
                  )}
                </div>
                <div className="mt-1 text-sm text-white/75">
                  {showReplayError ? (
                    <span aria-live="polite">{replayError}</span>
                  ) : (
                    <>
                      Replay time {formatReplayClock(replay.currentTimeMs)} / {formatReplayClock(replay.durationMs)} with{' '}
                      {replay.eventCount} events
                    </>
                  )}
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {sourceMode === 'replay' ? (
                  <>
                    <button
                      type="button"
                      onClick={() => (replay.isPlaying ? replay.pauseReplay() : replay.resumeReplay())}
                      className="rounded-xl bg-white/14 px-3 py-2 text-sm font-semibold text-white transition hover:bg-white/22"
                    >
                      {replay.isPlaying ? 'Pause' : 'Resume'}
                    </button>
                    <button
                      type="button"
                      onClick={() => replay.restartReplay()}
                      className="rounded-xl bg-white/14 px-3 py-2 text-sm font-semibold text-white transition hover:bg-white/22"
                    >
                      Restart
                    </button>
                    <label className="flex items-center gap-2 rounded-xl bg-white/10 px-3 py-2 text-sm text-white/85">
                      <span className="font-semibold">Speed</span>
                      <select
                        value={String(replay.speed)}
                        onChange={(event) => replay.setReplaySpeed(Number(event.target.value))}
                        className="rounded-lg border border-white/15 bg-zinc-900/70 px-2 py-1 text-sm text-white outline-none"
                      >
                        {replay.speedOptions.map((speed) => (
                          <option key={speed} value={speed}>
                            {speed}x
                          </option>
                        ))}
                      </select>
                    </label>
                    <button
                      type="button"
                      onClick={() => replay.clearReplay()}
                      className="rounded-xl bg-blue-500/85 px-3 py-2 text-sm font-semibold text-white transition hover:bg-blue-400"
                    >
                      Return to live
                    </button>
                  </>
                ) : null}

                {showReplayError ? (
                  <button
                    type="button"
                    onClick={() => setIsReplayErrorDismissed(true)}
                    className="rounded-xl bg-white/14 px-3 py-2 text-sm font-semibold text-white transition hover:bg-white/22"
                  >
                    Dismiss
                  </button>
                ) : null}
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
