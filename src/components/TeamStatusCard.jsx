import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTriangleExclamation, faGamepad, faTowerBroadcast, faMicrochip, faXmark } from '@fortawesome/free-solid-svg-icons';
import MiniSparkline from './MiniSparkline';

const panelTheme = (alliance) =>
  alliance === 'red'
    ? {
        defaultRowShell:
          'bg-gradient-to-b from-white to-zinc-50 ring-[2px] ring-zinc-300 shadow-[0_8px_18px_rgba(15,23,42,0.06)]',
        defaultRowInset: 'border-white/95',
        stationBadge: 'bg-red-50 text-red-800 ring-red-200',
        stateDanger: 'bg-rose-600 text-white ring-rose-800 shadow-sm',
        stateWarn: 'bg-amber-100 text-amber-950 ring-amber-300',
        stateAuto: 'bg-violet-50 text-violet-800 ring-violet-200',
        stateTele: 'bg-emerald-50 text-emerald-800 ring-emerald-200',
      }
    : {
        defaultRowShell:
          'bg-gradient-to-b from-white to-zinc-50 ring-[2px] ring-zinc-300 shadow-[0_8px_18px_rgba(15,23,42,0.06)]',
        defaultRowInset: 'border-white/95',
        stationBadge: 'bg-blue-50 text-blue-800 ring-blue-200',
        stateDanger: 'bg-rose-600 text-white ring-rose-800 shadow-sm',
        stateWarn: 'bg-amber-100 text-amber-950 ring-amber-300',
        stateAuto: 'bg-violet-50 text-violet-800 ring-violet-200',
        stateTele: 'bg-emerald-50 text-emerald-800 ring-emerald-200',
      };

const issueLabel = (mode) => {
  if (mode === 'estopped') return 'E-STOP';
  if (mode === 'bypassed') return 'BYPASS';
  if (mode === 'astopped') return 'A-STOP';
  if (mode === 'critical') return 'CRITICAL';
  if (mode === 'degraded') return 'WARN';
  return '';
};

const isEmergencyStopMode = (mode) => mode === 'estopped' || mode === 'bypassed';
const isAStopMode = (mode) => mode === 'astopped';

const stateTone = (status, theme) => {
  if (status?.tone === 'danger') return theme.stateDanger;
  if (status?.tone === 'warn') return theme.stateWarn;
  if (status?.tone === 'auto') return theme.stateAuto;
  return theme.stateTele;
};

const batteryToneClass = (battery) => {
  if (battery?.tone === 'critical') {
    return 'bg-amber-50 ring-2 ring-amber-400';
  }

  if (battery?.tone === 'warn') {
    return 'bg-amber-50 ring-2 ring-amber-300';
  }

  return 'bg-white/80';
};

const batteryActionClass = (battery) => {
  if (battery?.tone === 'critical') {
    return 'bg-amber-600 text-white ring-1 ring-amber-700';
  }

  if (battery?.tone === 'warn') {
    return 'bg-amber-100 text-amber-950 ring-1 ring-amber-400';
  }

  return 'bg-zinc-100 text-zinc-600 ring-1 ring-zinc-300';
};

const stateLabel = (status) => status?.shortLabel || status?.label || '';
const clampRadioBars = (bars) => {
  if (!Number.isFinite(bars)) return 0;
  return Math.max(0, Math.min(4, bars));
};
const radioVisualState = (radio) => {
  if (radio?.state !== 'warn') return radio?.state || 'good';
  return radio?.connectedToAp && radio?.linkActive ? 'good' : 'warn';
};
const formatDisconnectTimer = (elapsedMs) => {
  const totalSeconds = Math.max(0, Math.floor(elapsedMs / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  }

  return `${minutes}:${String(seconds).padStart(2, '0')}`;
};

const connectionTheme = (state) => {
  if (state === 'bad') {
    return {
      tile: 'border-2 border-amber-700 bg-zinc-900 text-white shadow-[inset_0_0_0_1px_rgba(255,255,255,0.08)]',
      label: 'text-white/70',
      accent: 'text-white',
      iconShell: 'border-white/40 bg-white/10',
      boardShell: 'border-white/30 bg-white/10',
      chevron: 'text-amber-300',
      emptyBar: 'bg-white/20',
      filledBar: 'bg-white',
    };
  }

  if (state === 'warn') {
    return {
      tile: 'border-2 border-amber-500 bg-amber-200 text-zinc-950 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.2)]',
      label: 'text-amber-950/80',
      accent: 'text-zinc-950',
      iconShell: 'border-amber-700 bg-amber-50',
      boardShell: 'border-amber-700 bg-amber-50',
      chevron: 'text-amber-700',
      emptyBar: 'bg-amber-300',
      filledBar: 'bg-zinc-900',
    };
  }

  return {
    tile: 'border-2 border-zinc-300 bg-white text-zinc-900',
    label: 'text-zinc-500',
    accent: 'text-zinc-900',
    iconShell: 'border-zinc-300 bg-zinc-50',
    boardShell: 'border-zinc-300 bg-zinc-50',
    chevron: 'text-zinc-300',
    emptyBar: 'bg-zinc-200',
    filledBar: 'bg-zinc-900',
  };
};

const deviceStatusIcon = (state) => {
  if (state === 'bad') return faXmark;
  if (state === 'warn') return faTriangleExclamation;
  return null;
};

const mobileChipTone = (state) => {
  if (state === 'bad') {
    return {
      shell: 'border-amber-700 bg-zinc-900 text-white',
      label: 'text-white/70',
      value: 'text-white',
      accent: 'text-amber-300',
    };
  }

  if (state === 'warn') {
    return {
      shell: 'border-amber-500 bg-amber-100 text-amber-950',
      label: 'text-amber-950/75',
      value: 'text-amber-950',
      accent: 'text-amber-700',
    };
  }

  return {
    shell: 'border-zinc-300 bg-white text-zinc-900',
    label: 'text-zinc-500',
    value: 'text-zinc-900',
    accent: 'text-zinc-400',
  };
};

function SignalBars({ bars = 0, state = 'good', hero = false }) {
  const count = clampRadioBars(bars);
  const theme = connectionTheme(state);
  const heights = hero ? ['32%', '54%', '76%', '100%'] : ['25%', '50%', '75%', '100%'];
  return (
    <span
      className={`inline-flex items-end justify-center ${
        hero
          ? 'h-7 gap-0.5 sm:h-10 sm:gap-1.5 [@media(min-width:1024px)]:h-11 [@media(min-width:1024px)_and_(max-height:860px)]:h-[34px] [@media(min-width:1024px)_and_(max-height:720px)]:h-[28px]'
          : 'h-6 gap-0.5 sm:h-9 sm:gap-1.5 [@media(min-width:1024px)]:h-10 [@media(min-width:1024px)_and_(max-height:860px)]:h-[30px] [@media(min-width:1024px)_and_(max-height:720px)]:h-[24px]'
      }`}
    >
      {heights.map((h, i) => (
        <span
          key={i}
          className={`rounded-sm ${
            hero ? 'w-2 sm:w-3.5 [@media(min-width:1024px)]:w-4' : 'w-1.5 sm:w-3'
          } ${
            i < count ? theme.filledBar : theme.emptyBar
          }`}
          style={{ height: h }}
        />
      ))}
    </span>
  );
}

function DsDeviceGlyph({ theme }) {
  return (
    <div className="relative flex h-[46px] w-[46px] origin-center items-center justify-center sm:h-[70px] sm:w-[70px] [@media(min-width:1024px)_and_(max-height:860px)]:scale-[0.76] [@media(min-width:1024px)_and_(max-height:720px)]:scale-[0.64]">
      <div className={`absolute inset-0 rounded-full border-[4px] shadow-sm ${theme.iconShell}`} />
      <div className={`absolute left-1/2 top-1/2 h-8 w-8 -translate-x-1/2 -translate-y-1/2 rounded-full sm:h-12 sm:w-12 ${theme.accent === 'text-white' ? 'bg-white/10' : 'bg-zinc-900/5'}`} />
      <FontAwesomeIcon icon={faGamepad} className="relative h-5 w-5 sm:h-9 sm:w-9" />
    </div>
  );
}

function RioDeviceGlyph({ theme }) {
  const pinClass = theme.accent === 'text-white' ? 'bg-white/45' : 'bg-zinc-400';

  return (
    <div className="relative flex h-[46px] w-[46px] origin-center items-center justify-center sm:h-[70px] sm:w-[70px] [@media(min-width:1024px)_and_(max-height:860px)]:scale-[0.76] [@media(min-width:1024px)_and_(max-height:720px)]:scale-[0.64]">
      <span className={`absolute left-1 top-3.5 h-1.5 w-1 rounded-full ${pinClass}`} />
      <span className={`absolute left-1 top-7.5 h-1.5 w-1 rounded-full ${pinClass}`} />
      <span className={`absolute left-1 top-11.5 h-1.5 w-1 rounded-full ${pinClass}`} />
      <span className={`absolute right-1 top-3.5 h-1.5 w-1 rounded-full ${pinClass}`} />
      <span className={`absolute right-1 top-7.5 h-1.5 w-1 rounded-full ${pinClass}`} />
      <span className={`absolute right-1 top-11.5 h-1.5 w-1 rounded-full ${pinClass}`} />
      <span className={`absolute top-1 left-3.5 h-1 w-1.5 rounded-full ${pinClass}`} />
      <span className={`absolute top-1 left-7.5 h-1 w-1.5 rounded-full ${pinClass}`} />
      <span className={`absolute top-1 left-11.5 h-1 w-1.5 rounded-full ${pinClass}`} />
      <span className={`absolute bottom-1 left-3.5 h-1 w-1.5 rounded-full ${pinClass}`} />
      <span className={`absolute bottom-1 left-7.5 h-1 w-1.5 rounded-full ${pinClass}`} />
      <span className={`absolute bottom-1 left-11.5 h-1 w-1.5 rounded-full ${pinClass}`} />

      <div className={`absolute inset-[4px] rounded-xl border-[4px] shadow-sm sm:inset-[5px] ${theme.boardShell}`} />
      <div className={`absolute inset-[10px] rounded-md sm:inset-[15px] ${theme.accent === 'text-white' ? 'bg-white/10' : 'bg-zinc-900/5'}`} />
      <FontAwesomeIcon icon={faMicrochip} className="relative h-5 w-5 sm:h-9 sm:w-9" />
    </div>
  );
}

function IssueBadge({ mode }) {
  if (mode === 'normal') return null;
  const isEmergencyStop = isEmergencyStopMode(mode);
  const isCritical = mode === 'critical';
  return (
    <div
      className={`rounded-md px-1.5 py-0.5 text-[10px] font-extrabold uppercase leading-[1.1] tracking-[0.03em] sm:px-3 sm:py-1 sm:text-[12px] sm:tracking-wide [@media(min-width:1024px)]:text-[14px] [@media(min-width:1024px)_and_(max-height:860px)]:px-2 [@media(min-width:1024px)_and_(max-height:860px)]:py-0.5 [@media(min-width:1024px)_and_(max-height:860px)]:text-[11px] [@media(min-width:1024px)_and_(max-height:720px)]:px-1.5 [@media(min-width:1024px)_and_(max-height:720px)]:text-[10px] ${
        isEmergencyStop
          ? 'bg-rose-600 text-white ring-1 ring-rose-700'
          : isCritical
            ? 'bg-amber-600 text-white ring-1 ring-amber-700'
            : 'bg-amber-100 text-amber-950 ring-1 ring-amber-500'
      }`}
    >
      {issueLabel(mode)}
    </div>
  );
}

function DisconnectTimerBadge({ elapsedMs }) {
  return (
    <div
      data-testid="disconnect-timer-badge"
      className="rounded-md bg-amber-50 px-1.5 py-0.5 font-mono text-[13px] font-black leading-[1.1] text-amber-950 sm:px-2.5 sm:py-1 sm:text-[15px] [@media(min-width:1024px)]:text-[16px] [@media(min-width:1024px)_and_(max-height:860px)]:px-2 [@media(min-width:1024px)_and_(max-height:860px)]:py-0.5 [@media(min-width:1024px)_and_(max-height:860px)]:text-[13px] [@media(min-width:1024px)_and_(max-height:720px)]:px-1.5 [@media(min-width:1024px)_and_(max-height:720px)]:text-[12px]"
      aria-label={`Disconnected for ${formatDisconnectTimer(elapsedMs)}`}
    >
      {formatDisconnectTimer(elapsedMs)}
    </div>
  );
}

const issueBandClass = (mode) => {
  if (isEmergencyStopMode(mode)) return 'bg-rose-700';
  if (isAStopMode(mode)) return 'bg-amber-500';
  if (mode === 'blocking') return 'bg-amber-700';
  if (mode === 'critical') return 'bg-amber-600';
  if (mode === 'degraded') return 'bg-amber-400';
  return '';
};

const rowShellClass = (mode, theme) => {
  if (mode === 'estopped' || mode === 'bypassed') {
    return 'bg-gradient-to-b from-white to-rose-50/45 ring-[3px] ring-rose-700 shadow-[0_10px_24px_rgba(190,24,93,0.14)]';
  }

  if (mode === 'astopped') {
    return 'bg-gradient-to-b from-white to-amber-50/55 ring-[2px] ring-amber-500 shadow-[0_8px_20px_rgba(217,119,6,0.1)]';
  }

  if (mode === 'blocking') {
    return 'bg-gradient-to-b from-white to-amber-50/50 ring-[3px] ring-amber-700 shadow-[0_10px_24px_rgba(180,83,9,0.12)]';
  }

  if (mode === 'critical') {
    return 'bg-gradient-to-b from-white to-amber-50/40 ring-[3px] ring-amber-600 shadow-[0_10px_24px_rgba(217,119,6,0.12)]';
  }

  if (mode === 'degraded') {
    return 'bg-gradient-to-b from-white to-amber-50/25 ring-[2px] ring-amber-400 shadow-[0_8px_20px_rgba(245,158,11,0.08)]';
  }

  return theme.defaultRowShell;
};

const rowInsetClass = (mode, theme) => {
  if (mode === 'estopped' || mode === 'bypassed') {
    return 'border-white/45 shadow-none';
  }

  if (mode === 'astopped') {
    return 'border-white/55 shadow-none';
  }

  if (mode === 'blocking' || mode === 'critical' || mode === 'degraded') {
    return 'border-white/50 shadow-none';
  }

  return `${theme.defaultRowInset} shadow-[inset_0_1px_0_rgba(255,255,255,0.9)]`;
};

function ConnectionTile({ kind, state, label, bars = 0 }) {
  const theme = connectionTheme(state);
  const isRadio = kind === 'radio';
  const isDS = kind === 'ds';
  const footerClass =
    'mt-0.5 flex min-h-[14px] items-end justify-center sm:mt-1 sm:min-h-[20px] [@media(min-width:1024px)_and_(max-height:860px)]:mt-0 [@media(min-width:1024px)_and_(max-height:860px)]:min-h-[16px] [@media(min-width:1024px)_and_(max-height:720px)]:min-h-[14px]';

  return (
    <div
      className={`grid h-full min-h-0 grid-rows-[auto_minmax(0,1fr)_auto] rounded-lg px-1 py-1 text-center sm:rounded-xl sm:px-2.5 sm:py-2 [@media(min-width:1024px)_and_(max-height:860px)]:px-1.5 [@media(min-width:1024px)_and_(max-height:860px)]:py-1 [@media(min-width:1024px)_and_(max-height:720px)]:px-1 [@media(min-width:1024px)_and_(max-height:720px)]:py-0.5 ${theme.tile}`}
    >
      <div className={`text-[8px] font-black uppercase tracking-[0.1em] sm:text-[10px] sm:tracking-[0.24em] ${theme.label}`}>
        {label}
      </div>

      {isRadio ? (
        <div className="mt-0.5 flex min-h-0 flex-col items-center justify-center sm:mt-1 [@media(min-width:1024px)_and_(max-height:860px)]:mt-0 [@media(min-width:1024px)_and_(max-height:720px)]:mt-0">
          <div
            className={`mb-0.5 origin-center ${theme.accent} scale-[0.82] sm:scale-100 [@media(min-width:1024px)_and_(max-height:860px)]:scale-[0.78] [@media(min-width:1024px)_and_(max-height:720px)]:scale-[0.64]`}
          >
            <FontAwesomeIcon icon={faTowerBroadcast} className="h-4 w-4 sm:h-6 sm:w-6" />
          </div>
          <div
            className={`flex min-h-0 items-center justify-center ${theme.accent} [@media(min-width:1024px)_and_(max-height:860px)]:scale-[0.78] [@media(min-width:1024px)_and_(max-height:720px)]:scale-[0.64]`}
          >
            <SignalBars bars={bars} state={state} hero />
          </div>
        </div>
      ) : (
        <div className="mt-0.5 flex min-h-0 flex-col items-center justify-center sm:mt-1 [@media(min-width:1024px)_and_(max-height:860px)]:mt-0 [@media(min-width:1024px)_and_(max-height:720px)]:mt-0">
          <div className="flex h-[42px] items-center justify-center sm:h-[70px] [@media(min-width:1024px)_and_(max-height:860px)]:h-[48px] [@media(min-width:1024px)_and_(max-height:720px)]:h-[38px]">
            {isDS ? <DsDeviceGlyph theme={theme} /> : <RioDeviceGlyph theme={theme} />}
          </div>
        </div>
      )}

      <div className={footerClass}>
        <div aria-hidden="true" className="invisible h-0" />
      </div>
    </div>
  );
}

function ConnectionChevron({ state = 'good' }) {
  const theme = connectionTheme(state);
  return (
    <div className="flex items-center justify-center py-0.5 sm:py-0 [@media(min-width:1024px)_and_(max-height:860px)]:py-0">
      <div className={`flex w-full items-center justify-center gap-0.5 sm:gap-1 ${theme.chevron}`}>
        <span className={`h-1 w-3 rounded-full ${state === 'bad' ? 'bg-amber-300' : state === 'warn' ? 'bg-amber-700' : 'bg-zinc-300'}`} />
        <span className="text-[18px] font-black leading-none sm:text-[30px] [@media(min-width:1024px)_and_(max-height:860px)]:text-[20px] [@media(min-width:1024px)_and_(max-height:720px)]:text-[16px]">
          &gt;
        </span>
      </div>
    </div>
  );
}

function MobileSignalBars({ bars = 0, state = 'good' }) {
  const count = clampRadioBars(bars);
  const theme = connectionTheme(state);

  return (
    <span className="inline-flex h-2.5 items-end gap-px [@media(max-width:380px)]:h-2">
      {['33%', '58%', '82%', '100%'].map((height, index) => (
        <span
          key={index}
          className={`w-[3px] rounded-sm [@media(max-width:380px)]:w-0.5 ${index < count ? theme.filledBar : theme.emptyBar}`}
          style={{ height }}
        />
      ))}
    </span>
  );
}

function MobileConnectionChip({ kind, label, state, bars = 0 }) {
  const tone = mobileChipTone(state);
  const isRadio = kind === 'radio';
  const icon = deviceStatusIcon(state);

  return (
    <div
      className={`flex min-h-[24px] min-w-0 items-center gap-0.5 rounded-[7px] border px-1 py-0.5 [@media(max-width:380px)]:min-h-[21px] [@media(max-width:380px)]:rounded-md [@media(max-width:380px)]:px-0.5 [@media(max-width:380px)]:py-px ${tone.shell}`}
      data-testid="mobile-connection-chip"
    >
      <div className="min-w-0 leading-[1.05]">
        <div className={`text-[6px] font-black uppercase leading-[1.15] tracking-[0.04em] [@media(max-width:380px)]:text-[5px] ${tone.label}`}>
          {label}
        </div>
        <div className={`flex min-h-[10px] items-center gap-0.5 text-[9px] font-black leading-[1.08] [@media(max-width:380px)]:min-h-[8px] [@media(max-width:380px)]:text-[8px] ${tone.value}`}>
          {isRadio ? (
            <MobileSignalBars bars={bars} state={state} />
          ) : (
            icon ? <FontAwesomeIcon icon={icon} className="h-2.5 w-2.5 shrink-0" aria-hidden="true" /> : null
          )}
        </div>
      </div>
    </div>
  );
}

function MobileChainSeparator({ state = 'good' }) {
  const tone = mobileChipTone(state);

  return (
    <div
      aria-hidden="true"
      className={`flex min-h-[24px] items-center justify-center [@media(max-width:380px)]:min-h-[21px] ${tone.accent}`}
    >
      <span className="block -translate-y-px text-[8px] font-black leading-none [@media(max-width:380px)]:text-[7px]">
        &gt;
      </span>
    </div>
  );
}


const stationNumberText = (stationLabel) => stationLabel.match(/\d+/)?.[0] || '--';

function StationBadge({ station, theme }) {
  const stationNumber = stationNumberText(station);

  return (
    <div
      className={`inline-flex rounded-md px-1 py-0.5 text-[9px] font-bold uppercase leading-[1.1] tracking-[0.03em] ring-1 [@media(max-width:380px)]:px-0.5 [@media(max-width:380px)]:py-px [@media(max-width:380px)]:text-[8px] sm:px-2.5 sm:py-1 sm:text-[12px] sm:tracking-wide [@media(min-width:1024px)_and_(max-height:860px)]:px-1.5 [@media(min-width:1024px)_and_(max-height:860px)]:py-0.5 [@media(min-width:1024px)_and_(max-height:860px)]:text-[10px] [@media(min-width:1024px)_and_(max-height:720px)]:px-1 [@media(min-width:1024px)_and_(max-height:720px)]:text-[9px] ${theme.stationBadge}`}
    >
      STN {stationNumber}
    </div>
  );
}

export default function TeamStatusCard({ alliance, row, currentTimeMs = Date.now() }) {
  const theme = panelTheme(alliance);
  const radioState = radioVisualState(row.radio);
  const isBlocking = row.mode === 'blocking';
  const isBypassed = row.mode === 'bypassed';
  const isEmergencyStop = isEmergencyStopMode(row.mode);
  const isPostMatchMuted = Boolean(row.isPostMatchMuted);
  const isContentMuted = isPostMatchMuted || isEmergencyStop;
  const isStatusPillMuted = isPostMatchMuted;
  const isNormal = row.mode === 'normal';
  const disconnectElapsedMs =
    Number.isFinite(row.disconnectedSinceMs) && Number.isFinite(currentTimeMs)
      ? Math.max(0, currentTimeMs - row.disconnectedSinceMs)
      : null;

  return (
    <div
      className={`relative grid min-h-0 content-start overflow-hidden rounded-[16px] bg-white [@media(max-width:380px)]:rounded-[16px] sm:rounded-[18px] md:min-h-[180px] md:content-stretch lg:h-full lg:min-h-0 [@media(min-width:1024px)_and_(max-height:860px)]:min-h-[172px] [@media(min-width:1024px)_and_(max-height:720px)]:min-h-[148px] ${
        isBlocking
          ? 'grid-rows-[auto_minmax(0,1fr)]'
          : 'grid-rows-[auto_auto_auto] md:grid-rows-[auto_minmax(0,1fr)_auto] lg:grid-rows-[auto_minmax(0,1fr)_minmax(64px,auto)] [@media(min-width:1024px)_and_(max-height:860px)]:grid-rows-[auto_minmax(0,1fr)_minmax(52px,auto)] [@media(min-width:1024px)_and_(max-height:720px)]:grid-rows-[auto_minmax(0,1fr)_minmax(44px,auto)]'
      } ${rowShellClass(row.mode, theme)}`}
    >
      <div
        className={`pointer-events-none absolute inset-[2px] rounded-[14px] border [@media(max-width:380px)]:rounded-[12px] sm:inset-[3px] sm:rounded-[15px] ${rowInsetClass(row.mode, theme)}`}
      />
      {row.mode !== 'normal' && !isEmergencyStop && (
        <div
          data-testid="issue-band"
          className={`absolute inset-x-0 top-0 h-1 rounded-t-[16px] [@media(max-width:380px)]:rounded-t-[16px] sm:h-1.5 sm:rounded-t-[18px] ${issueBandClass(row.mode)}`}
        />
      )}
      <div
        data-testid="row-header"
        className={`flex min-h-0 flex-nowrap items-center justify-between gap-x-1.5 px-3 pb-0 pt-1 [@media(max-width:380px)]:gap-x-1 [@media(max-width:380px)]:px-2.5 [@media(max-width:380px)]:pt-0.5 sm:flex-wrap sm:items-start sm:gap-x-3 sm:gap-y-2 sm:px-5 sm:pb-1 sm:pt-2 [@media(min-width:1024px)_and_(max-height:860px)]:gap-x-2 [@media(min-width:1024px)_and_(max-height:860px)]:gap-y-1 [@media(min-width:1024px)_and_(max-height:860px)]:px-3 [@media(min-width:1024px)_and_(max-height:860px)]:pb-0 [@media(min-width:1024px)_and_(max-height:860px)]:pt-1 [@media(min-width:1024px)_and_(max-height:720px)]:gap-x-1.5 [@media(min-width:1024px)_and_(max-height:720px)]:gap-y-0.5 [@media(min-width:1024px)_and_(max-height:720px)]:px-2.5 [@media(min-width:1024px)_and_(max-height:720px)]:pt-0.5 ${
          isNormal ? 'min-[381px]:max-sm:pt-0.5 [@media(max-width:380px)]:pt-0.5' : ''
        }`}
      >
        <div
          data-testid="row-header-primary"
          className="flex min-w-0 flex-1 flex-nowrap items-center gap-x-1.5 [@media(max-width:380px)]:gap-x-1 sm:flex-wrap sm:gap-y-1 [@media(min-width:1024px)_and_(max-height:860px)]:gap-y-0.5 [@media(min-width:1024px)_and_(max-height:720px)]:gap-x-1.5 [@media(min-width:1024px)_and_(max-height:720px)]:gap-y-0.5"
        >
          <div className="shrink-0 text-[20px] font-bold leading-none tracking-tight [@media(max-width:380px)]:text-[18px] sm:text-[34px] lg:text-[40px] [@media(min-width:1024px)_and_(max-height:860px)]:text-[28px] [@media(min-width:1024px)_and_(max-height:720px)]:text-[24px]">
            {row.team}
          </div>
          <StationBadge station={row.station} theme={theme} />
          {row.mode !== 'blocking' && <IssueBadge mode={row.mode} />}
          {row.mode === 'critical' && row.hasCriticalConnection && disconnectElapsedMs !== null ? (
            <DisconnectTimerBadge elapsedMs={disconnectElapsedMs} />
          ) : null}
        </div>

        {!isBlocking && !isBypassed && (
          <div
            className={`inline-flex shrink-0 self-center items-center justify-center rounded-md px-1 py-0.5 text-[8px] font-extrabold uppercase leading-[1.1] tracking-[0.03em] ring-1 [@media(max-width:380px)]:px-0.5 [@media(max-width:380px)]:py-px [@media(max-width:380px)]:text-[7px] sm:px-3 sm:py-1 sm:text-[13px] sm:tracking-wide lg:text-[14px] [@media(min-width:1024px)_and_(max-height:860px)]:px-1.5 [@media(min-width:1024px)_and_(max-height:860px)]:py-0.5 [@media(min-width:1024px)_and_(max-height:860px)]:text-[10px] [@media(min-width:1024px)_and_(max-height:720px)]:px-1 [@media(min-width:1024px)_and_(max-height:720px)]:text-[9px] ${
              isStatusPillMuted ? 'opacity-70' : ''
            } ${stateTone(row.status, theme)}`}
          >
            {stateLabel(row.status)}
          </div>
        )}
      </div>

      <div
        className={`min-h-0 px-3 pt-0.5 [@media(max-width:380px)]:px-2.5 [@media(max-width:380px)]:pt-px sm:px-5 sm:pt-1 ${isBlocking ? 'pb-1.5' : 'pb-0'} ${
          isNormal && !isBlocking ? 'min-[381px]:max-sm:pb-0 [@media(max-width:380px)]:pb-0' : ''
        } ${
          isContentMuted ? 'opacity-60' : ''
        } [@media(min-width:1024px)_and_(max-height:860px)]:px-3 [@media(min-width:1024px)_and_(max-height:860px)]:pt-0.5 [@media(min-width:1024px)_and_(max-height:860px)]:pb-0 [@media(min-width:1024px)_and_(max-height:720px)]:px-2.5 [@media(min-width:1024px)_and_(max-height:720px)]:pt-px`}
      >
        {isBlocking ? (
          <div className="flex h-full min-h-0 items-center justify-center">
            <div className="flex min-h-[60px] w-full items-center justify-center rounded-xl border-[3px] border-dashed border-amber-700 bg-amber-50 px-2.5 py-2.5 text-center text-[14px] font-bold tracking-wide text-amber-950 sm:min-h-[92px] sm:px-6 sm:py-5 sm:text-[22px] lg:text-[26px] [@media(min-width:1024px)_and_(max-height:860px)]:min-h-[68px] [@media(min-width:1024px)_and_(max-height:860px)]:px-3 [@media(min-width:1024px)_and_(max-height:860px)]:py-3 [@media(min-width:1024px)_and_(max-height:860px)]:text-[18px] [@media(min-width:1024px)_and_(max-height:720px)]:min-h-[56px] [@media(min-width:1024px)_and_(max-height:720px)]:px-2.5 [@media(min-width:1024px)_and_(max-height:720px)]:py-2 [@media(min-width:1024px)_and_(max-height:720px)]:text-[15px]">
              <FontAwesomeIcon icon={faTriangleExclamation} className="mr-2 h-5 w-5 text-amber-700 sm:mr-3 sm:h-7 sm:w-7" />
              {row.blockingText}
            </div>
          </div>
        ) : (
          <>
            <div
              data-testid="mobile-connection-layout"
              className={`grid min-h-0 grid-cols-[minmax(0,1fr)_10px_minmax(0,1fr)_10px_minmax(0,1fr)] items-stretch gap-1 pb-px [@media(max-width:380px)]:grid-cols-[minmax(0,1fr)_8px_minmax(0,1fr)_8px_minmax(0,1fr)] [@media(max-width:380px)]:gap-0.5 lg:hidden ${
                isNormal ? 'min-[381px]:max-sm:gap-0.5 min-[381px]:max-sm:pb-0 [@media(max-width:380px)]:pb-0' : 'pb-0'
              }`}
            >
              <MobileConnectionChip
                kind="ds"
                label={row.ds?.label || 'DS'}
                state={row.ds?.state || 'good'}
              />
              <MobileChainSeparator state={row.ds?.state || 'good'} />
              <MobileConnectionChip
                kind="radio"
                label={row.radio?.label || 'RADIO'}
                state={radioState}
                bars={row.radio?.bars ?? 0}
              />
              <MobileChainSeparator state={radioState} />
              <MobileConnectionChip
                kind="rio"
                label={row.rio?.label || 'RIO'}
                state={row.rio?.state || 'good'}
              />
            </div>
            <div
              data-testid="connection-layout"
              className="hidden h-full min-h-0 grid-cols-[minmax(0,1fr)_22px_minmax(0,1fr)_22px_minmax(0,1fr)] items-stretch gap-2 pb-px lg:grid [@media(min-width:1024px)_and_(max-height:860px)]:gap-1.5 [@media(min-width:1024px)_and_(max-height:860px)]:pb-0 [@media(min-width:1024px)_and_(max-height:720px)]:gap-1"
            >
              <ConnectionTile
                kind="ds"
                label={row.ds?.label || 'DS'}
                state={row.ds?.state || 'good'}
              />
              <ConnectionChevron state={row.ds?.state || 'good'} />
              <ConnectionTile
                kind="radio"
                label={row.radio?.label || 'RADIO'}
                state={radioState}
                bars={row.radio?.bars ?? 0}
              />
              <ConnectionChevron state={radioState} />
              <ConnectionTile
                kind="rio"
                label={row.rio?.label || 'RIO'}
                state={row.rio?.state || 'good'}
              />
            </div>
          </>
        )}
      </div>

      {!isBlocking && (
        <div
          className={`px-3 pb-1.5 [@media(max-width:380px)]:px-2.5 [@media(max-width:380px)]:pb-1 sm:px-5 sm:pb-2.5 ${
            isNormal ? 'min-[381px]:max-sm:pb-0.5 [@media(max-width:380px)]:pb-0' : ''
          } ${isContentMuted ? 'opacity-70' : ''} [@media(min-width:1024px)_and_(max-height:860px)]:px-3 [@media(min-width:1024px)_and_(max-height:860px)]:pb-1 [@media(min-width:1024px)_and_(max-height:720px)]:px-2.5 [@media(min-width:1024px)_and_(max-height:720px)]:pb-0.5`}
        >
          <>
            <div
              data-testid="mobile-footer-summary"
              className={`grid grid-cols-3 gap-0.5 rounded-lg bg-zinc-50/70 px-0.5 py-0.5 [@media(max-width:380px)]:gap-px [@media(max-width:380px)]:px-px lg:hidden ${
                isNormal ? 'min-[381px]:max-sm:gap-px min-[381px]:max-sm:py-px' : 'py-px'
              }`}
            >
              <div className={`rounded-md px-1 py-0.5 [@media(max-width:380px)]:px-0.5 ${batteryToneClass(row.battery)}`}>
                {row.battery?.action ? (
                  <div className="flex justify-end">
                    <div className={`rounded-full px-0.5 py-px text-[5px] font-black uppercase leading-[1.1] tracking-[0.06em] ${batteryActionClass(row.battery)}`}>
                      {row.battery.action}
                    </div>
                  </div>
                ) : null}
                <MiniSparkline label="Battery" data={row.history?.battery ?? []} unit="V" color="#d97706" decimals={1} />
              </div>

              <div className="rounded-md bg-white/65 px-1 py-0.5 [@media(max-width:380px)]:px-0.5">
                <MiniSparkline label="BW" data={row.history?.bandwidth ?? []} unit="Mbps" color="#6366f1" decimals={1} />
              </div>

              <div className="rounded-md bg-white/65 px-1 py-0.5 [@media(max-width:380px)]:px-0.5">
                <MiniSparkline label="Trip" data={row.history?.trip ?? []} unit="ms" color="#8b5cf6" />
              </div>
            </div>

            <div className="hidden lg:grid lg:grid-cols-3 lg:gap-1.5 lg:rounded-xl lg:bg-zinc-50/70 lg:py-1 lg:px-1 [@media(min-width:1024px)_and_(max-height:860px)]:gap-1 [@media(min-width:1024px)_and_(max-height:860px)]:py-0.5 [@media(min-width:1024px)_and_(max-height:720px)]:gap-0.5">
              <div className={`rounded-xl px-2 py-1 [@media(min-width:1024px)_and_(max-height:860px)]:px-1.5 [@media(min-width:1024px)_and_(max-height:860px)]:py-0.5 [@media(min-width:1024px)_and_(max-height:720px)]:px-1 [@media(min-width:1024px)_and_(max-height:720px)]:py-0.5 ${batteryToneClass(row.battery)}`}>
                {row.battery?.action ? (
                  <div className="flex justify-end">
                    <div className={`rounded-full px-1.5 py-px text-[7px] font-black uppercase tracking-[0.1em] [@media(min-width:1024px)_and_(max-height:860px)]:text-[7px] [@media(min-width:1024px)_and_(max-height:720px)]:text-[6px] ${batteryActionClass(row.battery)}`}>
                      {row.battery.action}
                    </div>
                  </div>
                ) : null}
                <MiniSparkline label="Battery" data={row.history?.battery ?? []} unit="V" color="#d97706" decimals={1} />
              </div>

              <div className="rounded-xl bg-white/65 px-2 py-1 [@media(min-width:1024px)_and_(max-height:860px)]:px-1.5 [@media(min-width:1024px)_and_(max-height:860px)]:py-0.5 [@media(min-width:1024px)_and_(max-height:720px)]:px-1 [@media(min-width:1024px)_and_(max-height:720px)]:py-0.5">
                <MiniSparkline label="BW" data={row.history?.bandwidth ?? []} unit="Mbps" color="#6366f1" decimals={1} />
              </div>

              <div className="rounded-xl bg-white/65 px-2 py-1 [@media(min-width:1024px)_and_(max-height:860px)]:px-1.5 [@media(min-width:1024px)_and_(max-height:860px)]:py-0.5 [@media(min-width:1024px)_and_(max-height:720px)]:px-1 [@media(min-width:1024px)_and_(max-height:720px)]:py-0.5">
                <MiniSparkline label="Trip" data={row.history?.trip ?? []} unit="ms" color="#8b5cf6" />
              </div>
            </div>
          </>
        </div>
      )}
    </div>
  );
}
