import { useEffect, useRef, useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faBolt, faRocket, faStar, faThumbsUp } from '@fortawesome/free-solid-svg-icons';
import { useSearchParams } from 'react-router-dom';
import chefBoyardeeWalkGif from '../assets/chef-boyardee-walk.gif';
import TeamStatusCard from '../components/TeamStatusCard';
import { fieldMonitorTypes, useFieldMonitorLiveData } from '../lib/fieldMonitorLive';
import usePageTitle from '../lib/usePageTitle';

const CONFETTI_COLORS = ['#f97316', '#ef4444', '#facc15', '#22c55e', '#3b82f6', '#a855f7', '#ec4899', '#14b8a6'];
const CONFETTI_PIECES = Array.from({ length: 120 }, (_, index) => ({
  id: index,
  color: CONFETTI_COLORS[index % CONFETTI_COLORS.length],
  left: `${2 + ((index * 9) % 96)}%`,
  delay: `${(index % 12) * 0.05}s`,
  duration: `${2.8 + (index % 6) * 0.22}s`,
  drift: `${(index % 2 === 0 ? 1 : -1) * (28 + ((index * 7) % 42))}px`,
  rotation: `${(index % 2 === 0 ? 1 : -1) * (280 + index * 18)}deg`,
}));

const CONFETTI_DURATION_MS = 2400;
const CHEF_WALK_DURATION_MS = 3600;
const { MatchStateType } = fieldMonitorTypes;
const READY_STATUS_ICON_TRAIL = [
  { icon: faThumbsUp, className: 'text-emerald-600' },
  { icon: faThumbsUp, className: 'text-lime-500' },
  { icon: faBolt, className: 'text-yellow-400' },
  { icon: faThumbsUp, className: 'text-green-500' },
  { icon: faStar, className: 'text-fuchsia-500' },
  { icon: faRocket, className: 'text-orange-500' },
  { icon: faThumbsUp, className: 'text-emerald-500' },
  { icon: faBolt, className: 'text-amber-400' },
  { icon: faThumbsUp, className: 'text-lime-600' },
];
const READY_STATUS_ICON_LEAD = [
  { icon: faThumbsUp, className: 'text-green-600' },
  { icon: faBolt, className: 'text-yellow-500' },
  { icon: faThumbsUp, className: 'text-lime-500' },
  { icon: faRocket, className: 'text-orange-500' },
  { icon: faStar, className: 'text-fuchsia-500' },
  { icon: faThumbsUp, className: 'text-emerald-500' },
  { icon: faBolt, className: 'text-amber-400' },
  { icon: faThumbsUp, className: 'text-lime-600' },
  { icon: faThumbsUp, className: 'text-green-500' },
];

const panelTheme = (alliance) =>
  alliance === 'red'
    ? {
        backplate: 'bg-white',
        panelGlow: 'ring-[4px] ring-red-500 shadow-[0_0_0_1px_rgba(255,255,255,0.7),0_0_32px_rgba(239,68,68,0.18)]',
      }
    : {
        backplate: 'bg-white',
        panelGlow: 'ring-[4px] ring-blue-500 shadow-[0_0_0_1px_rgba(255,255,255,0.7),0_0_32px_rgba(59,130,246,0.18)]',
      };

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

const isAheadScheduleStatus = (value) => normalizeScheduleStatus(value).startsWith('ahead');
const isLiveMatchState = (matchState) =>
  matchState === MatchStateType.MatchAuto ||
  matchState === MatchStateType.MatchTransition ||
  matchState === MatchStateType.MatchTeleop;

function TopBarStat({ label, value, align = 'left', className = '', valueClassName = '', wrapValue = false }) {
  const textAlignmentClass =
    align === 'center' ? 'text-center' : align === 'right' ? 'text-right items-end' : 'text-left items-start';

  return (
    <div className={`flex min-w-0 flex-col gap-0.5 ${textAlignmentClass} ${className}`}>
      <div className="min-w-0 text-[8px] font-semibold uppercase leading-none tracking-[0.12em] text-zinc-500 [@media(max-width:380px)]:text-[7px] sm:text-[9px] [@media(min-width:1024px)_and_(max-height:860px)]:text-[8px] [@media(min-width:1024px)_and_(max-height:720px)]:text-[7px]">
        {label}
      </div>
      <div
        className={`min-w-0 ${wrapValue ? 'whitespace-normal leading-tight' : 'truncate'} text-[12px] font-bold tracking-[-0.02em] text-zinc-900 [@media(max-width:380px)]:text-[11px] sm:text-[15px] sm:leading-none [@media(min-width:1024px)_and_(max-height:860px)]:text-[13px] [@media(min-width:1024px)_and_(max-height:720px)]:text-[11px] ${valueClassName}`}
      >
        {value}
      </div>
    </div>
  );
}

function renderReadyStatusIcon({ icon, className }, key) {
  return (
    <FontAwesomeIcon
      key={key}
      icon={icon}
      data-testid="feral-ready-icon"
      aria-hidden="true"
      className={`h-[1.08em] w-[1.08em] shrink-0 drop-shadow-[0_0_6px_rgba(250,204,21,0.7)] ${className}`}
    />
  );
}

function getMatchStatusValue(matchStatus) {
  if (matchStatus.matchState !== MatchStateType.WaitingForMatchStart) {
    return matchStatus.matchStateMessage;
  }

  return (
    <span data-testid="feral-ready-status" className="inline-flex max-w-full flex-nowrap items-center justify-center gap-x-1 overflow-hidden">
      {READY_STATUS_ICON_TRAIL.map((Icon, index) => renderReadyStatusIcon(Icon, `lead-${index}`))}
      <span className="whitespace-nowrap">{matchStatus.matchStateMessage}</span>
      {READY_STATUS_ICON_LEAD.map((Icon, index) => renderReadyStatusIcon(Icon, `trail-${index}`))}
    </span>
  );
}

function FunOverlayLayer({ showConfetti, showChefDisconnect }) {
  return (
    <>
      {showConfetti ? (
        <div
          data-testid="fun-confetti-overlay"
          className="pointer-events-none fixed inset-0 z-[60] overflow-hidden"
          aria-hidden="true"
        >
          {CONFETTI_PIECES.map((piece) => (
            <span
              key={piece.id}
              className="fun-confetti-piece absolute top-[-14vh] block rounded-[3px]"
              style={{
                left: piece.left,
                width: `${16 + (piece.id % 4) * 4}px`,
                height: `${28 + (piece.id % 3) * 6}px`,
                backgroundColor: piece.color,
                animationDelay: piece.delay,
                animationDuration: piece.duration,
                '--fun-confetti-drift': piece.drift,
                '--fun-confetti-rotation': piece.rotation,
              }}
            />
          ))}
        </div>
      ) : null}

      {showChefDisconnect ? (
        <div
          data-testid="fun-disconnect-overlay"
          className="pointer-events-none fixed inset-0 z-[65] overflow-hidden"
          aria-hidden="true"
        >
          <div className="absolute inset-x-0 bottom-0 h-28 bg-gradient-to-t from-zinc-900/20 via-zinc-900/10 to-transparent" />
          <img
            src={chefBoyardeeWalkGif}
            alt=""
            className="fun-chef-walk absolute bottom-[max(0.75rem,env(safe-area-inset-bottom))] left-[-18rem] w-56 max-w-none sm:w-64 lg:w-72"
          />
        </div>
      ) : null}
    </>
  );
}

export default function FieldMonitor() {
  usePageTitle('Live Monitor');

  const [searchParams] = useSearchParams();
  const mirrorLayout = searchParams.get('mirror') === 'true';
  const reverseBlueTeams = searchParams.get('reverseBlueTeams') === 'true';
  const replayFileInputRef = useRef(null);
  const [isReplayErrorDismissed, setIsReplayErrorDismissed] = useState(false);
  const [viewportHeight, setViewportHeight] = useState(() =>
    typeof window === 'undefined' ? null : window.visualViewport?.height ?? window.innerHeight
  );
  const [showConfetti, setShowConfetti] = useState(false);
  const [showChefDisconnect, setShowChefDisconnect] = useState(false);
  const overlayTimeoutsRef = useRef({
    confetti: 0,
    chefDisconnect: 0,
  });
  const previousMatchStateRef = useRef(null);
  const previousConnectionRef = useRef(null);
  const {
    alliancePanels: distancePanels,
    matchStatus,
    scheduleStatus,
    cycleCadence,
    sourceMode,
    replay,
    error,
    aheadBehind,
    isAheadBehindKnown,
    isConnected,
  } = useFieldMonitorLiveData({
    mirrorLayout,
    reverseBlueTeams,
  });
  const replayError = replay.error || (sourceMode === 'replay' ? error : '');
  const showReplayError = Boolean(replayError) && !isReplayErrorDismissed;
  const showReplayOverlay = sourceMode === 'replay' || showReplayError;
  const scheduleTrendText = isAheadBehindKnown ? aheadBehind : scheduleStatus;
  const isAhead = isAheadScheduleStatus(scheduleTrendText);

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

  useEffect(() => {
    if (typeof window === 'undefined') {
      return undefined;
    }

    const updateViewportHeight = () => {
      setViewportHeight(window.visualViewport?.height ?? window.innerHeight);
    };

    updateViewportHeight();

    window.addEventListener('resize', updateViewportHeight);
    window.visualViewport?.addEventListener('resize', updateViewportHeight);

    return () => {
      window.removeEventListener('resize', updateViewportHeight);
      window.visualViewport?.removeEventListener('resize', updateViewportHeight);
    };
  }, []);

  useEffect(() => {
    const overlayTimeouts = overlayTimeoutsRef.current;

    return () => {
      Object.values(overlayTimeouts).forEach((timeoutId) => {
        if (timeoutId) {
          window.clearTimeout(timeoutId);
        }
      });
    };
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const overlayTimeouts = overlayTimeoutsRef.current;
    const setOverlayVisibility = (key, setter, durationMs) => {
      if (overlayTimeouts[key]) {
        window.clearTimeout(overlayTimeouts[key]);
      }

      setter(true);
      overlayTimeouts[key] = window.setTimeout(() => {
        setter(false);
        overlayTimeouts[key] = 0;
      }, durationMs);
    };

    const previousMatchState = previousMatchStateRef.current;
    if (previousMatchState !== null && !isLiveMatchState(previousMatchState) && isLiveMatchState(matchStatus.matchState) && isAhead) {
      setOverlayVisibility('confetti', setShowConfetti, CONFETTI_DURATION_MS);
    }

    previousMatchStateRef.current = matchStatus.matchState;
  }, [isAhead, matchStatus.matchState]);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const overlayTimeouts = overlayTimeoutsRef.current;
    const previousConnection = previousConnectionRef.current;

    if (sourceMode !== 'live') {
      if (overlayTimeouts.chefDisconnect) {
        window.clearTimeout(overlayTimeouts.chefDisconnect);
        overlayTimeouts.chefDisconnect = 0;
      }
      setShowChefDisconnect(false);
      previousConnectionRef.current = sourceMode === 'live' ? isConnected : null;
      return;
    }

    if (previousConnection === true && !isConnected) {
      if (overlayTimeouts.chefDisconnect) {
        window.clearTimeout(overlayTimeouts.chefDisconnect);
      }
      setShowChefDisconnect(true);
      overlayTimeouts.chefDisconnect = window.setTimeout(() => {
        setShowChefDisconnect(false);
        overlayTimeouts.chefDisconnect = 0;
      }, CHEF_WALK_DURATION_MS);
    }

    previousConnectionRef.current = isConnected;
  }, [isConnected, sourceMode]);

  return (
    <div
      className="relative flex min-h-screen flex-col bg-zinc-100 text-zinc-900"
      style={
        viewportHeight === null
          ? undefined
          : {
              minHeight: `${viewportHeight}px`,
              height: `${viewportHeight}px`,
            }
      }
    >
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

      <div className="shrink-0 px-3 pb-1 pt-2 lg:px-4 lg:pb-1.5 lg:pt-2.5 [@media(min-width:1024px)_and_(max-height:860px)]:px-2.5 [@media(min-width:1024px)_and_(max-height:860px)]:pt-1.5 [@media(min-width:1024px)_and_(max-height:720px)]:px-2 [@media(min-width:1024px)_and_(max-height:720px)]:pt-1">
        <div
          data-testid="field-monitor-topbar"
          className="relative overflow-hidden rounded-[22px] bg-white px-3 py-1.5 shadow-sm ring-1 ring-zinc-200 [@media(max-width:380px)]:px-2 [@media(max-width:380px)]:py-1.5 lg:px-4 lg:py-2 [@media(min-width:1024px)_and_(max-height:860px)]:px-2.5 [@media(min-width:1024px)_and_(max-height:860px)]:py-1 [@media(min-width:1024px)_and_(max-height:720px)]:px-2 [@media(min-width:1024px)_and_(max-height:720px)]:py-0.5"
        >
          <div className="relative z-10">
            <div className="flex items-start justify-between gap-2.5 [@media(max-width:380px)]:gap-2 sm:grid sm:grid-cols-[minmax(0,0.9fr)_minmax(0,1.25fr)_minmax(0,0.85fr)] sm:items-end sm:gap-3">
              <div className="flex-1 sm:flex-none">
                <TopBarStat
                  label="Match Number"
                  value={matchStatus.matchNumber > 0 ? `M${matchStatus.matchNumber}` : 'No match yet'}
                  className="flex-1 sm:flex-none"
                />
              </div>
              <div className="relative max-w-[56%] min-w-0 flex-1 sm:max-w-none sm:flex-none">
                <TopBarStat
                  label="Match Status"
                  value={getMatchStatusValue(matchStatus)}
                  align="right"
                  className="relative z-10 min-w-0 sm:items-center sm:text-center"
                  valueClassName="self-stretch overflow-hidden text-[11px] [@media(max-width:380px)]:text-[10px] sm:text-[14px] [@media(min-width:1024px)_and_(max-height:860px)]:text-[12px] [@media(min-width:1024px)_and_(max-height:720px)]:text-[10px]"
                  wrapValue
                />
              </div>
              <div className="hidden min-w-0 sm:flex sm:min-w-0 sm:items-start sm:justify-end sm:gap-3">
                <TopBarStat
                  label="Schedule Status"
                  value={scheduleStatus}
                  align="right"
                  className="min-w-0 flex-1"
                  valueClassName="text-[10px] [@media(max-width:380px)]:text-[9px] sm:text-[13px] [@media(min-width:1024px)_and_(max-height:860px)]:text-[11px] [@media(min-width:1024px)_and_(max-height:720px)]:text-[10px]"
                />
                <TopBarStat
                  label="Cycle"
                  value={cycleCadence.summary}
                  align="right"
                  className="min-w-0 flex-1"
                  valueClassName="text-[9px] [@media(max-width:380px)]:text-[8px] sm:text-[12px] [@media(min-width:1024px)_and_(max-height:860px)]:text-[11px] [@media(min-width:1024px)_and_(max-height:720px)]:text-[9px]"
                />
              </div>
            </div>
            <div className="mt-1.5 border-t border-zinc-100 pt-1.5 sm:hidden">
              <TopBarStat
                label="Schedule Status"
                value={scheduleStatus}
                className="min-w-0"
                valueClassName="text-[11px] [@media(max-width:380px)]:text-[10px] sm:text-[14px] [@media(min-width:1024px)_and_(max-height:860px)]:text-[12px] [@media(min-width:1024px)_and_(max-height:720px)]:text-[10px]"
                wrapValue
              />
            </div>
          </div>
        </div>
      </div>

      <div
        data-testid="field-monitor-content"
        className={`flex min-h-0 flex-1 flex-col overflow-y-auto lg:flex-row ${
          showReplayOverlay ? 'pb-[calc(8rem+env(safe-area-inset-bottom))] sm:pb-32' : ''
        }`}
      >
        {distancePanels.map((panel) => {
          const theme = panelTheme(panel.alliance);
          return (
            <div
              key={`distance-${panel.alliance}`}
              className="relative flex w-full min-w-0 flex-none p-[3px] [@media(max-width:380px)]:p-[2px] lg:flex-1 [@media(min-width:1024px)_and_(max-height:860px)]:p-1 [@media(min-width:1024px)_and_(max-height:720px)]:p-0.5"
            >
              <div
                className={`pointer-events-none absolute inset-[3px] rounded-[20px] [@media(max-width:380px)]:inset-[2px] [@media(max-width:380px)]:rounded-[18px] sm:inset-1.5 sm:rounded-[28px] ${theme.backplate} ${theme.panelGlow}`}
              />
              <div
                data-testid="alliance-panel-grid"
                className="grid min-h-0 flex-1 auto-rows-max gap-1 p-1 [@media(max-width:380px)]:gap-0.5 [@media(max-width:380px)]:p-0.5 sm:gap-2 sm:p-2.5 lg:h-full lg:grid-rows-3 [@media(min-width:1024px)_and_(max-height:860px)]:gap-2 [@media(min-width:1024px)_and_(max-height:860px)]:p-2 [@media(min-width:1024px)_and_(max-height:720px)]:gap-1.5 [@media(min-width:1024px)_and_(max-height:720px)]:p-1.5"
              >
                {panel.rows.map((row) => (
                  <TeamStatusCard
                    key={`distance-${panel.alliance}-${row.team}-${row.station}`}
                    alliance={panel.alliance}
                    row={row}
                  />
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {showReplayOverlay ? (
        <div className="pointer-events-none fixed inset-x-0 bottom-0 z-50 flex justify-center px-4 pb-[calc(1rem+env(safe-area-inset-bottom))]">
          <div
            data-testid="replay-overlay-panel"
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
                      Replay time {formatReplayClock(replay.currentTimeMs)} /{' '}
                      {formatReplayClock(replay.durationMs)} with {replay.eventCount} events
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

      <FunOverlayLayer
        showConfetti={showConfetti}
        showChefDisconnect={showChefDisconnect}
      />
    </div>
  );
}
