import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { HubConnectionBuilder, LogLevel } from '@microsoft/signalr';
import { MessagePackHubProtocol } from '@microsoft/signalr-protocol-msgpack';

const RECORDING_FILE_VERSION = 1;
const METRIC_HISTORY_SIZE = 120;
const DEFAULT_REPLAY_SPEED = 1;
const REPLAY_SPEED_OPTIONS = [0.5, 1, 2, 4];
let activeReplayRecording = null;
let activeReplayFileName = '';

const AllianceType = {
  None: 0,
  Red: 1,
  Blue: 2,
};

const StationType = {
  None: 0,
  Station1: 1,
  Station2: 2,
  Station3: 3,
};

const MonitorStatusType = {
  Unknown: 0,
  EStopped: 1,
  AStopped: 2,
  DisabledAuto: 3,
  DisabledTeleop: 4,
  EnabledAuto: 5,
  EnabledTeleop: 6,
};

const BWUtilizationType = {
  Low: 0,
  Medium: 1,
  High: 2,
  VeryHigh: 3,
};

const RadioConnectionQuality = {
  Warning: 0,
  Caution: 1,
  Good: 2,
  Excellent: 3,
};

const StationStatusType = {
  Good: 0,
  WrongStation: 1,
  WrongMatch: 2,
  Unknown: 3,
};

const MatchStateType = {
  NoCurrentlyActiveEvent: 0,
  NoCurrentlyActiveTournamentLevel: 1,
  WaitingForPrestart: 2,
  WaitingForPrestartTO: 3,
  Prestarting: 4,
  PrestartingTO: 5,
  WaitingForSetAudience: 6,
  WaitingForSetAudienceTO: 7,
  WaitingForMatchReady: 8,
  WaitingForMatchStart: 9,
  GameSpecificData: 10,
  MatchAuto: 11,
  MatchTransition: 12,
  MatchTeleop: 13,
  WaitingForCommit: 14,
  WaitingForPostResults: 15,
  TournamentLevelComplete: 16,
  MatchCancelled: 17,
  WaitingForMatchPreview: 18,
  WaitingForMatchPreviewTO: 19,
};

const ALL_STATION_SLOTS = [
  { alliance: AllianceType.Blue, station: StationType.Station1 },
  { alliance: AllianceType.Blue, station: StationType.Station2 },
  { alliance: AllianceType.Blue, station: StationType.Station3 },
  { alliance: AllianceType.Red, station: StationType.Station1 },
  { alliance: AllianceType.Red, station: StationType.Station2 },
  { alliance: AllianceType.Red, station: StationType.Station3 },
];

export const fieldMonitorTypes = {
  AllianceType,
  StationType,
  MonitorStatusType,
  BWUtilizationType,
  RadioConnectionQuality,
  StationStatusType,
  MatchStateType,
};

export function resetFieldMonitorLiveTestState() {
  activeReplayRecording = null;
  activeReplayFileName = '';
}

export function createHubConnection(url) {
  return new HubConnectionBuilder()
    .withUrl(url)
    .withAutomaticReconnect()
    .configureLogging(LogLevel.Error)
    .withHubProtocol(new MessagePackHubProtocol())
    .build();
}

function trimBaseUrl(baseUrl) {
  return baseUrl.replace(/\/+$/, '');
}

export function getBaseUrl({
  env = import.meta.env,
  location = typeof window === 'undefined' ? undefined : window.location,
} = {}) {
  const configuredBaseUrl = env?.VITE_FIELD_MONITOR_BASE_URL?.trim();
  if (configuredBaseUrl) {
    return trimBaseUrl(configuredBaseUrl);
  }

  if (location?.origin && location.origin !== 'null') {
    return trimBaseUrl(location.origin);
  }

  return '';
}

function buildFieldMonitorUrl(baseUrl, pathname) {
  return baseUrl ? `${baseUrl}${pathname}` : pathname;
}

function getValue(object, shortKey, longKey, fallback) {
  if (object == null) return fallback;
  if (object[longKey] != null) return object[longKey];
  if (object[shortKey] != null) return object[shortKey];
  return fallback;
}

function slotKey(alliance, station) {
  return `${alliance}-${station}`;
}

export function createEmptyStation(alliance, station) {
  return {
    alliance,
    station,
    teamNumber: 0,
    connection: false,
    linkActive: false,
    dsLinkActive: false,
    radioLink: false,
    rioLink: false,
    isEnabled: false,
    isAuto: false,
    isBypassed: false,
    isEStopped: false,
    isAStopped: false,
    battery: 0,
    minBattery: 0,
    monitorStatus: MonitorStatusType.Unknown,
    averageTripTime: 0,
    lostPackets: 0,
    signal: 0,
    noise: 0,
    snr: 0,
    inactivity: 0,
    macAddress: '',
    dataRateTotal: 0,
    dataRateToRobot: 0,
    dataRateFromRobot: 0,
    rxMcsBandwidth: 0,
    rxVht: false,
    rxVhtNss: 0,
    rxPackets: 0,
    bwUtilization: BWUtilizationType.Low,
    stationStatus: StationStatusType.Unknown,
    moveToStation: '',
    radioConnectionQuality: RadioConnectionQuality.Warning,
    radioConnectedToAp: false,
    brownout: false,
  };
}

function getDirectionalRate(raw, primaryShortKey, primaryLongKey, fallbackShortKey) {
  const primaryValue = Number(getValue(raw, primaryShortKey, primaryLongKey, 0)) || 0;
  if (primaryValue > 0) {
    return primaryValue;
  }

  const fallbackValue = Number(getValue(raw, fallbackShortKey, '', 0)) || 0;
  return fallbackValue > 0 ? fallbackValue : 0;
}

export function normalizeStation(raw, minBatteryMap) {
  const alliance = getValue(raw, 'p1', 'Alliance', AllianceType.None);
  const station = getValue(raw, 'p2', 'Station', StationType.None);
  const key = slotKey(alliance, station);
  const battery = Number(getValue(raw, 'pe', 'Battery', 0)) || 0;
  const brownout = Boolean(getValue(raw, 'pgg', 'Brownout', false));

  const previousMin = minBatteryMap.get(key) ?? 0;
  const nextMin = battery > 0 && (previousMin === 0 || battery < previousMin) ? battery : previousMin;
  minBatteryMap.set(key, nextMin);

  return {
    alliance,
    station,
    teamNumber: Number(getValue(raw, 'p3', 'TeamNumber', 0)) || 0,
    connection: Boolean(getValue(raw, 'p4', 'Connection', false)),
    linkActive: Boolean(getValue(raw, 'p5', 'LinkActive', false)),
    dsLinkActive: Boolean(getValue(raw, 'p6', 'DSLinkActive', false)),
    radioLink: Boolean(getValue(raw, 'p7', 'RadioLink', false)),
    rioLink: Boolean(getValue(raw, 'p8', 'RIOLink', false)),
    isEnabled: Boolean(getValue(raw, 'p9', 'IsEnabled', false)),
    isAuto: Boolean(getValue(raw, 'pa', 'IsAuto', false)),
    isBypassed: Boolean(getValue(raw, 'pb', 'IsBypassed', false)),
    isEStopped: Boolean(getValue(raw, 'pd', 'IsEStopped', false)),
    isAStopped: Boolean(getValue(raw, 'pjj', 'IsAStopped', false)),
    battery,
    minBattery: nextMin,
    monitorStatus: Number(getValue(raw, 'pf', 'MonitorStatus', MonitorStatusType.Unknown)) || 0,
    averageTripTime: Number(getValue(raw, 'pg', 'AverageTripTime', 0)) || 0,
    lostPackets: Number(getValue(raw, 'ph', 'LostPackets', 0)) || 0,
    signal: Number(getValue(raw, 'pi', 'Signal', 0)) || 0,
    noise: Number(getValue(raw, 'pj', 'Noise', 0)) || 0,
    snr: Number(getValue(raw, 'pk', 'SNR', 0)) || 0,
    inactivity: Number(getValue(raw, 'pl', 'Inactivity', 0)) || 0,
    macAddress: getValue(raw, 'pm', 'MACAddress', '') || '',
    dataRateTotal: Number(getValue(raw, 'pz', 'DataRateTotal', 0)) || 0,
    dataRateToRobot: getDirectionalRate(raw, 'paa', 'DataRateToRobot', 'pn'),
    dataRateFromRobot: getDirectionalRate(raw, 'pbb', 'DataRateFromRobot', 'pt'),
    rxMcsBandwidth: Number(getValue(raw, 'pv', 'RxMCSBandwidth', 0)) || 0,
    rxVht: Boolean(getValue(raw, 'pw', 'RxVHT', false)),
    rxVhtNss: Number(getValue(raw, 'px', 'RxVHTNSS', 0)) || 0,
    rxPackets: Number(getValue(raw, 'py', 'RxPackets', 0)) || 0,
    bwUtilization: Number(getValue(raw, 'pcc', 'BWUtilization', BWUtilizationType.Low)) || 0,
    stationStatus: Number(getValue(raw, 'pff', 'StationStatus', StationStatusType.Unknown)) || 0,
    brownout,
    moveToStation: getValue(raw, 'pjk', 'MoveToStation', '') || '',
    radioConnectionQuality:
      Number(getValue(raw, 'pll', 'RadioConnectionQuality', RadioConnectionQuality.Warning)) || 0,
    radioConnectedToAp: Boolean(getValue(raw, 'pmm', 'RadioConnectedToAp', false)),
  };
}

export function normalizeMatchStatus(raw) {
  if (!raw) {
    return {
      matchState: MatchStateType.WaitingForPrestart,
      matchNumber: 0,
      playNumber: 0,
      tournamentLevel: 'Unknown',
      matchStateMessage: 'Waiting for live data',
    };
  }

  const matchState = Number(getValue(raw, 'p1', 'MatchState', MatchStateType.WaitingForPrestart)) || 0;
  const matchNumber = Number(getValue(raw, 'p2', 'MatchNumber', 0)) || 0;
  const playNumber = Number(getValue(raw, 'p3', 'PlayNumber', 0)) || 0;
  const tournamentLevel = getValue(raw, 'p4', 'TournamentLevel', 'Unknown');

  return {
    matchState,
    matchNumber,
    playNumber,
    tournamentLevel,
    matchStateMessage: getMatchStateMessage(matchState),
  };
}

function getMatchStateMessage(matchState) {
  switch (matchState) {
    case MatchStateType.NoCurrentlyActiveEvent:
      return 'NO ACTIVE EVENT';
    case MatchStateType.NoCurrentlyActiveTournamentLevel:
      return 'NO ACTIVE TOURNAMENT LEVEL';
    case MatchStateType.WaitingForPrestart:
    case MatchStateType.WaitingForPrestartTO:
      return 'READY TO PRESTART';
    case MatchStateType.Prestarting:
    case MatchStateType.PrestartingTO:
      return 'PRESTARTING';
    case MatchStateType.WaitingForSetAudience:
    case MatchStateType.WaitingForSetAudienceTO:
      return 'WAITING FOR MATCH READY';
    case MatchStateType.WaitingForMatchReady:
      return 'WAITING FOR MATCH READY';
    case MatchStateType.WaitingForMatchStart:
      return 'READY FOR MATCH START';
    case MatchStateType.GameSpecificData:
      return 'GAME SPECIFIC DATA';
    case MatchStateType.MatchAuto:
      return 'MATCH AUTO';
    case MatchStateType.MatchTransition:
      return 'MATCH TRANSITION';
    case MatchStateType.MatchTeleop:
      return 'MATCH TELEOP';
    case MatchStateType.WaitingForCommit:
      return 'WAITING FOR COMMIT';
    case MatchStateType.WaitingForPostResults:
      return 'WAITING FOR POST RESULTS';
    case MatchStateType.TournamentLevelComplete:
      return 'TOURNAMENT LEVEL COMPLETE';
    case MatchStateType.MatchCancelled:
      return 'MATCH CANCELLED';
    case MatchStateType.WaitingForMatchPreview:
    case MatchStateType.WaitingForMatchPreviewTO:
      return 'MATCH PREVIEW';
    default:
      return 'LIVE FIELD MONITOR';
  }
}

function formatNumber(value, digits = 1) {
  return Number(value || 0).toFixed(digits);
}

function formatBattery(value) {
  return value > 0 ? `${formatNumber(value)}V` : '--';
}

function formatRate(value) {
  return `${formatNumber(value)} Mbps`;
}

function formatStationLabel(station) {
  return `Stn ${station}`;
}

function cloneRecordingPayload(payload) {
  if (typeof structuredClone === 'function') {
    return structuredClone(payload);
  }

  return JSON.parse(JSON.stringify(payload));
}

function createUnknownAheadBehindState() {
  return {
    isKnown: false,
    text: '',
  };
}

function createKnownAheadBehindState(text = '') {
  return {
    isKnown: true,
    text: typeof text === 'string' ? text : '',
  };
}

function coerceAheadBehindSnapshot(rawValue, rawKnown) {
  if (typeof rawKnown === 'boolean') {
    return rawKnown ? createKnownAheadBehindState(rawValue || '') : createUnknownAheadBehindState();
  }

  if (typeof rawValue === 'string' && rawValue.length > 0) {
    return createKnownAheadBehindState(rawValue);
  }

  return createUnknownAheadBehindState();
}

function createUnknownCycleCadenceState() {
  return {
    lastCycleMs: null,
    currentCycleStartMs: null,
    currentMatchKey: '',
    currentMatchNumber: 0,
    currentPlayNumber: 0,
    currentCycleTrust: 'unknown',
  };
}

function createCycleMatchKey(matchStatus) {
  const matchNumber = Number(matchStatus?.matchNumber) || 0;

  if (matchNumber <= 0) {
    return '';
  }

  return `${matchNumber}:${Number(matchStatus?.playNumber) || 0}`;
}

function formatCompletedCycle(ms) {
  const totalMinutes = Math.round((Number(ms) || 0) / 60000);
  return totalMinutes > 0 ? `${totalMinutes}m` : '<1m';
}

function formatRunningCycle(ms) {
  const totalSeconds = Math.max(0, Math.floor((Number(ms) || 0) / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, '0')}`;
}

function buildCycleCadence(state, currentObservedMs) {
  const lastCycleMs = Number.isFinite(state?.lastCycleMs) && state.lastCycleMs >= 0 ? state.lastCycleMs : null;
  const currentCycleTrust = state?.currentCycleTrust || 'unknown';
  const currentCycleStartMs =
    Number.isFinite(state?.currentCycleStartMs) && state.currentCycleStartMs >= 0 ? state.currentCycleStartMs : null;
  const clockMs = Number.isFinite(currentObservedMs) ? currentObservedMs : null;
  const currentCycleMs =
    currentCycleTrust !== 'observed' || currentCycleStartMs == null || clockMs == null
      ? null
      : Math.max(0, clockMs - currentCycleStartMs);
  const lastCycleLabel = lastCycleMs == null ? '' : formatCompletedCycle(lastCycleMs);
  const currentCycleLabel = currentCycleMs == null ? '' : formatRunningCycle(currentCycleMs);
  const isCurrentCycleInProgress = currentCycleTrust === 'observed' || currentCycleTrust === 'inferred';

  let summary = 'Waiting for next start';
  if (lastCycleLabel && currentCycleTrust === 'observed' && currentCycleLabel) {
    summary = `${lastCycleLabel} last | ${currentCycleLabel} run`;
  } else if (lastCycleLabel && currentCycleTrust === 'inferred') {
    summary = `${lastCycleLabel} last | in progress`;
  } else if (currentCycleTrust === 'observed' && currentCycleLabel) {
    summary = `${currentCycleLabel} running`;
  } else if (currentCycleTrust === 'inferred') {
    summary = 'in progress';
  } else if (lastCycleLabel) {
    summary = `${lastCycleLabel} last`;
  }

  return {
    lastCycleMs,
    currentCycleMs,
    lastCycleLabel,
    currentCycleLabel,
    summary,
    isKnown: lastCycleMs != null,
    isCurrentCycleActive: isCurrentCycleInProgress,
    currentCycleTrust,
    isStartObserved: currentCycleTrust === 'observed',
    currentAnchorMatch: state?.currentMatchKey || '',
    currentAnchorMatchNumber: Number(state?.currentMatchNumber) || 0,
    currentAnchorPlayNumber: Number(state?.currentPlayNumber) || 0,
  };
}

function deriveNextCycleCadenceState(currentState, previousMatchStatus, nextMatchStatus, observedAtMs) {
  if (Number(nextMatchStatus?.matchState) !== MatchStateType.MatchAuto) {
    return currentState;
  }

  const nextMatchKey = createCycleMatchKey(nextMatchStatus);
  if (!nextMatchKey) {
    return currentState;
  }

  const previousMatchKey = createCycleMatchKey(previousMatchStatus);
  const wasAlreadyInThisAuto =
    currentState?.currentCycleTrust === 'observed' &&
    Number(previousMatchStatus?.matchState) === MatchStateType.MatchAuto && previousMatchKey === nextMatchKey;

  if (wasAlreadyInThisAuto) {
    return currentState;
  }

  const nextObservedAtMs = Number.isFinite(observedAtMs) ? observedAtMs : 0;
  const hasPreviousCycleAnchor =
    Number.isFinite(currentState?.currentCycleStartMs) &&
    currentState.currentCycleStartMs >= 0 &&
    currentState.currentMatchKey &&
    currentState.currentMatchKey !== nextMatchKey;

  return {
    lastCycleMs: hasPreviousCycleAnchor ? Math.max(0, nextObservedAtMs - currentState.currentCycleStartMs) : currentState.lastCycleMs,
    currentCycleStartMs: nextObservedAtMs,
    currentMatchKey: nextMatchKey,
    currentMatchNumber: Number(nextMatchStatus.matchNumber) || 0,
    currentPlayNumber: Number(nextMatchStatus.playNumber) || 0,
    currentCycleTrust: 'observed',
  };
}

function reconcileCycleCadenceState(currentState, fetchedMatchStatus) {
  const fetchedMatchKey = createCycleMatchKey(fetchedMatchStatus);

  if (!fetchedMatchKey || !currentState?.currentMatchKey || fetchedMatchKey === currentState.currentMatchKey) {
    return currentState;
  }

  return {
    ...currentState,
    currentCycleStartMs: null,
    currentMatchKey: fetchedMatchKey,
    currentMatchNumber: Number(fetchedMatchStatus?.matchNumber) || 0,
    currentPlayNumber: Number(fetchedMatchStatus?.playNumber) || 0,
    currentCycleTrust: 'inferred',
  };
}

function sanitizeFilenamePart(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function formatTimestampForFilename(date) {
  const pad = (value) => String(value).padStart(2, '0');

  return [
    date.getFullYear(),
    pad(date.getMonth() + 1),
    pad(date.getDate()),
    '-',
    pad(date.getHours()),
    pad(date.getMinutes()),
    pad(date.getSeconds()),
  ].join('');
}

export function createRecordingFilename(label, matchStatus, startedAt) {
  const safeLabel = sanitizeFilenamePart(label);
  const safeLevel = sanitizeFilenamePart(matchStatus?.tournamentLevel) || 'unknown';
  const matchNumber = Number(matchStatus?.matchNumber) || 0;
  const playNumber = Number(matchStatus?.playNumber) || 0;
  const parts = ['field-monitor'];

  if (safeLabel) {
    parts.push(safeLabel);
  } else if (matchNumber > 0) {
    parts.push(safeLevel);
    parts.push(`match-${matchNumber}`);
    if (playNumber > 0) {
      parts.push(`play-${playNumber}`);
    }
  } else {
    parts.push('capture');
  }

  parts.push(formatTimestampForFilename(startedAt));

  return `${parts.join('-')}.json`;
}

function downloadRecordingFile(filename, recording) {
  const blob = new Blob([JSON.stringify(recording, null, 2)], {
    type: 'application/json',
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

function createDefaultReplayState() {
  return {
    isReplayMode: false,
    isPlaying: false,
    currentTimeMs: 0,
    durationMs: 0,
    eventCount: 0,
    speed: DEFAULT_REPLAY_SPEED,
    fileName: '',
    error: '',
  };
}

export function getReplayDurationMs(recording) {
  if (!recording) {
    return 0;
  }

  const metaDuration = Number(recording?.meta?.durationMs) || 0;
  if (metaDuration > 0) {
    return metaDuration;
  }

  const lastEvent = recording.events?.[recording.events.length - 1];
  return Number(lastEvent?.t) || 0;
}

function coerceMatchStatusSnapshot(raw) {
  if (!raw) {
    return normalizeMatchStatus();
  }

  if ('matchState' in raw || 'matchStateMessage' in raw) {
    const matchState = Number(raw.matchState) || MatchStateType.WaitingForPrestart;

    return {
      matchState,
      matchNumber: Number(raw.matchNumber) || 0,
      playNumber: Number(raw.playNumber) || 0,
      tournamentLevel: raw.tournamentLevel || 'Unknown',
      matchStateMessage: raw.matchStateMessage || getMatchStateMessage(matchState),
    };
  }

  return normalizeMatchStatus(raw);
}

function coerceStationSnapshot(station) {
  if (!station) {
    return null;
  }

  if ('teamNumber' in station || 'alliance' in station || 'station' in station) {
    const alliance = Number(station.alliance) || AllianceType.None;
    const stationNumber = Number(station.station) || StationType.None;

    if (!alliance || !stationNumber) {
      return null;
    }

    return {
      ...createEmptyStation(alliance, stationNumber),
      ...station,
      alliance,
      station: stationNumber,
      teamNumber: Number(station.teamNumber) || 0,
      battery: Number(station.battery) || 0,
      minBattery: Number(station.minBattery) || 0,
      averageTripTime: Number(station.averageTripTime) || 0,
      lostPackets: Number(station.lostPackets) || 0,
      dataRateTotal: Number(station.dataRateTotal) || 0,
      dataRateToRobot: Number(station.dataRateToRobot) || 0,
      dataRateFromRobot: Number(station.dataRateFromRobot) || 0,
      bwUtilization: Number(station.bwUtilization) || BWUtilizationType.Low,
      stationStatus: Number(station.stationStatus) || StationStatusType.Unknown,
      radioConnectionQuality: Number(station.radioConnectionQuality) || RadioConnectionQuality.Warning,
    };
  }

  return null;
}

function buildStationsFromSnapshot(stationSnapshot) {
  const stationMap = new Map(
    ALL_STATION_SLOTS.map((slot) => [slotKey(slot.alliance, slot.station), createEmptyStation(slot.alliance, slot.station)])
  );

  (stationSnapshot || []).forEach((station) => {
    const nextStation = coerceStationSnapshot(station);
    if (!nextStation) {
      return;
    }

    stationMap.set(slotKey(nextStation.alliance, nextStation.station), nextStation);
  });

  return ALL_STATION_SLOTS.map((slot) => stationMap.get(slotKey(slot.alliance, slot.station)));
}

function createMinBatteryMap(stations) {
  const minBatteryMap = new Map();

  (stations || []).forEach((station) => {
    if (!station) {
      return;
    }

    const minBattery = Number(station.minBattery) || 0;
    if (minBattery > 0) {
      minBatteryMap.set(slotKey(station.alliance, station.station), minBattery);
    }
  });

  return minBatteryMap;
}

export function parseReplayRecording(text) {
  const parsed = JSON.parse(text);

  if (!parsed || typeof parsed !== 'object') {
    throw new Error('Replay file must contain a JSON object.');
  }

  if (!Array.isArray(parsed.events)) {
    throw new Error('Replay file is missing an events array.');
  }

  const events = parsed.events.map((event, index) => {
    if (!event || typeof event !== 'object') {
      throw new Error(`Replay event ${index + 1} is invalid.`);
    }

    return {
      t: Number(event.t) || 0,
      source: event.source || '',
      event: event.event || '',
      payload: event.payload,
    };
  });

  return {
    version: Number(parsed.version) || RECORDING_FILE_VERSION,
    meta: parsed.meta || {},
    initialState: parsed.initialState || {},
    events,
  };
}

function getStopKind(station) {
  if (station.isEStopped || station.monitorStatus === MonitorStatusType.EStopped) {
    return 'estopped';
  }

  if (station.isBypassed) {
    return 'bypassed';
  }

  if (station.isAStopped || station.monitorStatus === MonitorStatusType.AStopped) {
    return 'astopped';
  }

  return '';
}

function getStatusInfo(station) {
  const stopKind = getStopKind(station);

  if (stopKind === 'estopped') {
    return {
      kind: stopKind,
      label: 'E-STOPPED',
      shortLabel: 'E-STOP',
      tone: 'danger',
      headline: 'Robot cannot operate',
      detail: 'E-stopped by referee or team',
    };
  }

  if (stopKind === 'bypassed') {
    return {
      kind: stopKind,
      label: 'BYPASSED',
      shortLabel: 'BYPASS',
      tone: 'danger',
      headline: 'Robot will not run',
      detail: 'Bypassed before the match',
    };
  }

  if (stopKind === 'astopped') {
    return {
      kind: stopKind,
      label: 'A-STOPPED',
      shortLabel: 'A-STOP',
      tone: 'warn',
      headline: 'Robot intentionally disabled',
      detail: 'Usually expected during autonomous',
    };
  }

  if (
    station.monitorStatus === MonitorStatusType.EnabledAuto ||
    station.monitorStatus === MonitorStatusType.DisabledAuto
  ) {
    const isEnabled = station.monitorStatus === MonitorStatusType.EnabledAuto;
    return {
      kind: isEnabled ? 'auto-enabled' : 'auto-disabled',
      label: isEnabled ? 'Auto Enabled' : 'Auto Disabled',
      shortLabel: isEnabled ? 'AUTO' : 'AUTO DISABLED',
      tone: 'auto',
      headline: '',
      detail: '',
    };
  }

  if (
    station.monitorStatus === MonitorStatusType.EnabledTeleop ||
    station.monitorStatus === MonitorStatusType.DisabledTeleop
  ) {
    const isEnabled = station.monitorStatus === MonitorStatusType.EnabledTeleop;
    return {
      kind: isEnabled ? 'teleop-enabled' : 'teleop-disabled',
      label: isEnabled ? 'Teleop Enabled' : 'Teleop Disabled',
      shortLabel: isEnabled ? 'TELEOP' : 'TELEOP OFF',
      tone: 'tele',
      headline: '',
      detail: '',
    };
  }

  const isAuto = station.isAuto;
  const isEnabled = station.isEnabled;

  return {
    kind: isAuto ? (isEnabled ? 'auto-enabled' : 'auto-disabled') : isEnabled ? 'teleop-enabled' : 'teleop-disabled',
    label: `${isAuto ? 'Auto' : 'Teleop'} ${isEnabled ? 'Enabled' : 'Disabled'}`,
    shortLabel: isAuto ? (isEnabled ? 'AUTO' : 'AUTO DISABLED') : isEnabled ? 'TELEOP' : 'TELEOP OFF',
    tone: isAuto ? 'auto' : 'tele',
    headline: '',
    detail: '',
  };
}

function getBlockingText(station) {
  if (station.stationStatus === StationStatusType.WrongStation && station.moveToStation) {
    return `MOVE TO ${station.moveToStation.toUpperCase()}`;
  }

  if (station.stationStatus === StationStatusType.WrongMatch) {
    return 'TEAM MISMATCH';
  }

  return '';
}

function getDsSignal(station) {
  if (!station.connection) {
    return { label: 'DS', state: 'bad', detail: 'Missing' };
  }

  if (station.stationStatus === StationStatusType.Unknown || !station.dsLinkActive) {
    return { label: 'DS', state: 'warn', detail: 'Degraded' };
  }

  return { label: 'DS', state: 'good', detail: 'Connected' };
}

function getRadioBars(quality) {
  if (quality >= RadioConnectionQuality.Excellent) return 4;
  if (quality >= RadioConnectionQuality.Good) return 3;
  if (quality >= RadioConnectionQuality.Caution) return 2;
  return 1;
}

function formatRadioBarsDetail(bars) {
  return `${bars} bar${bars === 1 ? '' : 's'}`;
}

function getRadioSignal(station) {
  const connectedToAp = station.radioConnectedToAp;
  const linkActive = station.linkActive;
  const bars = connectedToAp ? getRadioBars(station.radioConnectionQuality) : 0;

  if (!station.radioConnectedToAp && !station.linkActive) {
    return { label: 'Radio', state: 'bad', detail: formatRadioBarsDetail(bars), bars, connectedToAp, linkActive };
  }

  if (!station.linkActive && station.radioConnectedToAp) {
    return { label: 'Radio', state: 'warn', detail: formatRadioBarsDetail(bars), bars, connectedToAp, linkActive };
  }

  if (!station.radioConnectedToAp) {
    return { label: 'Radio', state: 'bad', detail: formatRadioBarsDetail(bars), bars, connectedToAp, linkActive };
  }

  const state = bars >= 3 ? 'good' : 'warn';
  return { label: 'Radio', state, detail: formatRadioBarsDetail(bars), bars, connectedToAp, linkActive };
}

function getRioSignal(station) {
  if (!station.rioLink) {
    return { label: 'RIO', state: 'bad', detail: 'Missing' };
  }

  if (!station.linkActive) {
    return { label: 'RIO', state: 'warn', detail: 'Degraded' };
  }

  return { label: 'RIO', state: 'good', detail: 'Connected' };
}

function isPostMatchMuteState(matchState) {
  return (
    matchState === MatchStateType.WaitingForCommit ||
    matchState === MatchStateType.WaitingForPostResults ||
    matchState === MatchStateType.TournamentLevelComplete ||
    matchState === MatchStateType.MatchCancelled
  );
}

function shouldMutePostMatchDisconnects(station, matchStatus) {
  if (!isPostMatchMuteState(matchStatus?.matchState)) {
    return false;
  }

  if (station.brownout || station.isEnabled || getStopKind(station) || getBlockingText(station)) {
    return false;
  }

  return (
    !station.dsLinkActive &&
    !station.linkActive &&
    !station.radioLink &&
    !station.rioLink &&
    station.battery <= 0
  );
}

function getBatteryInfo(station) {
  const currentBattery = station.battery;
  const minBattery = station.minBattery > 0 ? formatNumber(station.minBattery) : '--';

  if (station.brownout) {
    return {
      value: formatBattery(currentBattery),
      min: minBattery,
      tone: 'critical',
      action: 'BROWNOUT',
      detail: 'Robot is browning out now',
    };
  }

  if (currentBattery > 0 && currentBattery <= 7.0) {
    return {
      value: formatBattery(currentBattery),
      min: minBattery,
      tone: 'critical',
      action: 'LOW BATT',
      detail: 'Brownout risk',
    };
  }

  return {
    value: formatBattery(currentBattery),
    min: minBattery,
    tone: 'normal',
    action: '',
    detail: currentBattery > 0 ? 'Stable' : '',
  };
}

function formatDirectionalTraffic(value) {
  if (!(value > 0)) {
    return '--';
  }

  if (value >= 100) {
    return String(Math.round(value));
  }

  return formatNumber(value);
}

function isLiveMatchState(matchState) {
  return (
    matchState === MatchStateType.MatchAuto ||
    matchState === MatchStateType.MatchTransition ||
    matchState === MatchStateType.MatchTeleop
  );
}

function getRowMode(station, matchStatus) {
  const stopKind = getStopKind(station);
  if (stopKind === 'estopped' || stopKind === 'bypassed') {
    return stopKind;
  }

  if (getBlockingText(station)) {
    return 'blocking';
  }

  if (stopKind === 'astopped') {
    return stopKind;
  }

  if (shouldMutePostMatchDisconnects(station, matchStatus)) {
    return 'normal';
  }

  const isLiveMatch = isLiveMatchState(matchStatus?.matchState);
  const hasCriticalConnection =
    isLiveMatch &&
    (!station.connection || !station.rioLink || (!station.radioConnectedToAp && !station.linkActive));
  const hasCriticalPerformance =
    station.brownout ||
    (station.battery > 0 && station.battery <= 7.0);

  if (hasCriticalConnection || hasCriticalPerformance) {
    return 'critical';
  }

  const hasWarningConnection =
    isLiveMatch &&
    ((station.connection && !station.dsLinkActive) ||
      (!station.linkActive && station.radioConnectedToAp) ||
      (station.rioLink && !station.linkActive) ||
      (station.radioConnectedToAp && station.radioConnectionQuality <= RadioConnectionQuality.Caution));

  if (hasWarningConnection) {
    return 'degraded';
  }

  return 'normal';
}

function toRow(station, matchStatus, metricHistory) {
  const blockingText = getBlockingText(station);
  const status = getStatusInfo(station);
  const battery = getBatteryInfo(station);
  const mode = getRowMode(station, matchStatus);
  const isPostMatchMuted = shouldMutePostMatchDisconnects(station, matchStatus);
  const hist = metricHistory?.get(slotKey(station.alliance, station.station));

  return {
    team: station.teamNumber > 0 ? String(station.teamNumber) : '----',
    station: formatStationLabel(station.station),
    mode,
    status,
    isPostMatchMuted,
    ds: getDsSignal(station),
    radio: getRadioSignal(station),
    rio: getRioSignal(station),
    battery,
    bwu: {
      value: formatRate(station.dataRateTotal),
      tx: formatDirectionalTraffic(station.dataRateToRobot),
      rx: formatDirectionalTraffic(station.dataRateFromRobot),
    },
    trip: `${Math.round(station.averageTripTime)} ms`,
    pkts: String(Math.round(station.lostPackets)),
    blockingText: mode === 'blocking' ? blockingText : '',
    history: {
      battery: hist?.battery?.slice() ?? [],
      bandwidth: hist?.bandwidth?.slice() ?? [],
      trip: hist?.trip?.slice() ?? [],
    },
  };
}

function orderAlliancePanels(stations, mirrorLayout, reverseBlueTeams) {
  const grouped = {
    red: [],
    blue: [],
  };

  stations.forEach((station) => {
    const key = station.alliance === AllianceType.Red ? 'red' : 'blue';
    if (grouped[key]) {
      grouped[key].push(station);
    }
  });

  grouped.red.sort((a, b) => a.station - b.station);
  grouped.blue.sort((a, b) => a.station - b.station);

  if (!mirrorLayout) {
    grouped.red.reverse();
  }

  if (reverseBlueTeams) {
    grouped.blue.reverse();
  }

  return {
    grouped,
    orderedKeys: mirrorLayout ? ['red', 'blue'] : ['blue', 'red'],
  };
}

function getStationStatusLabel(stationStatus) {
  switch (stationStatus) {
    case StationStatusType.Good:
      return 'OK';
    case StationStatusType.WrongStation:
      return 'Wrong Station';
    case StationStatusType.WrongMatch:
      return 'Wrong Match';
    default:
      return 'Unknown';
  }
}

function getMonitorStatusLabel(monitorStatus) {
  switch (monitorStatus) {
    case MonitorStatusType.EStopped:
      return 'E-Stop';
    case MonitorStatusType.AStopped:
      return 'A-Stop';
    case MonitorStatusType.DisabledAuto:
      return 'Auto Disabled';
    case MonitorStatusType.DisabledTeleop:
      return 'Teleop Disabled';
    case MonitorStatusType.EnabledAuto:
      return 'Auto Enabled';
    case MonitorStatusType.EnabledTeleop:
      return 'Teleop Enabled';
    default:
      return 'Unknown';
  }
}

function boolTone(value) {
  return value ? 'good' : 'bad';
}

function flagEntry(label, value, trueLabel = 'On', falseLabel = 'Off') {
  return {
    label,
    value: value ? trueLabel : falseLabel,
    tone: boolTone(value),
  };
}

function toDiagnosticsRow(station, matchStatus, metricHistory) {
  const blockingText = getBlockingText(station);
  const status = getStatusInfo(station);
  const battery = getBatteryInfo(station);
  const mode = getRowMode(station, matchStatus);
  const isPostMatchMuted = shouldMutePostMatchDisconnects(station, matchStatus);
  const ds = getDsSignal(station);
  const radio = getRadioSignal(station);
  const rio = getRioSignal(station);
  const stopKind = getStopKind(station);

  return {
    team: station.teamNumber > 0 ? String(station.teamNumber) : '----',
    station: formatStationLabel(station.station),
    mode,
    status,
    isPostMatchMuted,
    blockingText: mode === 'blocking' ? blockingText : '',
    robotState: {
      enabled: station.isEnabled,
      enabledLabel: station.isEnabled ? 'Enabled' : 'Disabled',
      phase: station.isAuto ? 'Auto' : 'Teleop',
      phaseLabel: station.isAuto ? 'Auto' : 'Teleop',
      stopKind,
      stopLabel:
        stopKind === 'estopped'
          ? 'E-Stop'
          : stopKind === 'astopped'
            ? 'A-Stop'
            : stopKind === 'bypassed'
              ? 'Bypass'
              : 'Normal',
    },
    control: {
      ds,
      radio,
      rio,
      flags: [
        flagEntry('Conn', station.connection, 'Up', 'Down'),
        flagEntry('DS Link', station.dsLinkActive, 'Up', 'Down'),
        flagEntry('Live Link', station.linkActive, 'Up', 'Down'),
        flagEntry('Radio Link', station.radioLink, 'Up', 'Down'),
        flagEntry('RIO Link', station.rioLink, 'Up', 'Down'),
        flagEntry('AP', station.radioConnectedToAp, 'On AP', 'Off AP'),
      ],
    },
    network: {
      quality: {
        value: radio.detail,
        label:
          station.radioConnectionQuality >= RadioConnectionQuality.Excellent
            ? 'Excellent'
            : station.radioConnectionQuality >= RadioConnectionQuality.Good
              ? 'Good'
              : station.radioConnectionQuality >= RadioConnectionQuality.Caution
                ? 'Caution'
                : 'Warning',
        tone: radio.state,
      },
      bandwidth: formatRate(station.dataRateTotal),
      tx: formatDirectionalTraffic(station.dataRateToRobot),
      rx: formatDirectionalTraffic(station.dataRateFromRobot),
      trip: `${Math.round(station.averageTripTime)} ms`,
      loss: String(Math.round(station.lostPackets)),
      signal: String(Math.round(station.signal)),
      noise: String(Math.round(station.noise)),
      snr: String(Math.round(station.snr)),
      inactivity: `${Math.round(station.inactivity)} ms`,
      rxPackets: String(Math.round(station.rxPackets)),
      rxMcsBandwidth: String(Math.round(station.rxMcsBandwidth)),
      rxVht: station.rxVht ? 'Yes' : 'No',
      rxVhtNss: String(Math.round(station.rxVhtNss)),
      history: {
        trip: metricHistory?.get(slotKey(station.alliance, station.station))?.trip ?? [],
        snr: metricHistory?.get(slotKey(station.alliance, station.station))?.snr ?? [],
        bandwidth: metricHistory?.get(slotKey(station.alliance, station.station))?.bandwidth ?? [],
      },
    },
    health: {
      battery,
      brownout: station.brownout,
      flags: [
        flagEntry('Brownout', station.brownout, 'Now', 'No'),
      ],
    },
    evidence: {
      monitorStatus: getMonitorStatusLabel(station.monitorStatus),
      stationStatus: getStationStatusLabel(station.stationStatus),
      moveToStation: station.moveToStation || '--',
      macAddress: station.macAddress || '--',
      flags: [
        flagEntry('Enabled', station.isEnabled, 'Yes', 'No'),
        flagEntry('Auto', station.isAuto, 'Yes', 'No'),
        flagEntry('Bypass', station.isBypassed, 'Yes', 'No'),
        flagEntry('E-Stop', station.isEStopped, 'Yes', 'No'),
        flagEntry('A-Stop', station.isAStopped, 'Yes', 'No'),
      ],
    },
  };
}

export function buildPanels(stations, mirrorLayout, reverseBlueTeams, matchStatus, metricHistory) {
  const { grouped, orderedKeys } = orderAlliancePanels(stations, mirrorLayout, reverseBlueTeams);

  return orderedKeys.map((alliance) => ({
    alliance,
    title: alliance === 'red' ? 'Red Alliance' : 'Blue Alliance',
    rows: grouped[alliance].map((station) => toRow(station, matchStatus, metricHistory)),
  }));
}

export function buildDiagnosticsPanels(stations, mirrorLayout, reverseBlueTeams, matchStatus, metricHistory) {
  const { grouped, orderedKeys } = orderAlliancePanels(stations, mirrorLayout, reverseBlueTeams);

  return orderedKeys.map((alliance) => ({
    alliance,
    title: alliance === 'red' ? 'Red Alliance' : 'Blue Alliance',
    rows: grouped[alliance].map((station) => toDiagnosticsRow(station, matchStatus, metricHistory)),
  }));
}

function isPrestartMatchState(matchState) {
  return (
    matchState === MatchStateType.WaitingForPrestart ||
    matchState === MatchStateType.WaitingForPrestartTO ||
    matchState === MatchStateType.Prestarting ||
    matchState === MatchStateType.PrestartingTO
  );
}

function isStationFieldReady(station) {
  if (!station) {
    return false;
  }

  if (station.isBypassed) {
    return true;
  }

  return Boolean(station.connection && station.rioLink && (station.radioConnectedToAp || station.linkActive));
}

export function isFieldReadyState(stations, matchStatus) {
  if (!isPrestartMatchState(matchStatus?.matchState)) {
    return false;
  }

  return ALL_STATION_SLOTS.every(({ alliance, station }) => {
    const slotStation = stations.find((candidate) => candidate.alliance === alliance && candidate.station === station);
    return isStationFieldReady(slotStation);
  });
}

function buildInitialStations() {
  return ALL_STATION_SLOTS.map(({ alliance, station }) => createEmptyStation(alliance, station));
}

export function useFieldMonitorLiveData({
  mirrorLayout = false,
  reverseBlueTeams = false,
  hubConnectionFactory = createHubConnection,
} = {}) {
  const baseUrl = getBaseUrl();
  const minBatteryRef = useRef(new Map());
  const metricHistoryRef = useRef(new Map());
  const currentMatchRef = useRef(null);
  const isMountedRef = useRef(true);
  const matchStatusRef = useRef(normalizeMatchStatus());
  const recordingStateRef = useRef({
    isRecording: false,
    startedAtMs: 0,
    startedAtIso: '',
    label: '',
    initialState: null,
    events: [],
  });
  const replayRuntimeRef = useRef({
    timeoutId: null,
    basePositionMs: 0,
    wallStartMs: 0,
    nextEventIndex: 0,
    speed: DEFAULT_REPLAY_SPEED,
  });
  const [stations, setStations] = useState(buildInitialStations);
  const [matchStatus, setMatchStatus] = useState(normalizeMatchStatus());
  const [aheadBehind, setAheadBehind] = useState(createUnknownAheadBehindState);
  const cycleCadenceStateRef = useRef(createUnknownCycleCadenceState());
  const [cycleCadenceState, setCycleCadenceState] = useState(createUnknownCycleCadenceState);
  const [cycleClockMs, setCycleClockMs] = useState(null);
  const [error, setError] = useState('');
  const [isFieldHubConnected, setIsFieldHubConnected] = useState(false);
  const [isInfrastructureHubConnected, setIsInfrastructureHubConnected] = useState(false);
  const [sourceMode, setSourceMode] = useState(() => (activeReplayRecording ? 'replay' : 'live'));
  const sourceModeRef = useRef(sourceMode);
  const [replayRecording, setReplayRecording] = useState(() => activeReplayRecording);
  const [replayState, setReplayState] = useState(() => {
    if (!activeReplayRecording) {
      return createDefaultReplayState();
    }

    return {
      isReplayMode: true,
      isPlaying: true,
      currentTimeMs: 0,
      durationMs: getReplayDurationMs(activeReplayRecording),
      eventCount: activeReplayRecording.events.length,
      speed: DEFAULT_REPLAY_SPEED,
      fileName: activeReplayFileName,
      error: '',
    };
  });
  const [recorderState, setRecorderState] = useState({
    isRecording: false,
    eventCount: 0,
    startedAtIso: '',
    lastDownloadName: '',
    lastEventCount: 0,
  });

  useEffect(() => {
    sourceModeRef.current = sourceMode;
  }, [sourceMode]);

  useEffect(
    () => () => {
      isMountedRef.current = false;
    },
    []
  );

  const clearReplayTimer = useCallback(() => {
    if (replayRuntimeRef.current.timeoutId) {
      window.clearTimeout(replayRuntimeRef.current.timeoutId);
      replayRuntimeRef.current.timeoutId = null;
    }
  }, []);

  const getCurrentReplayPositionMs = useCallback(() => {
    const runtime = replayRuntimeRef.current;

    if (!replayState.isPlaying || runtime.wallStartMs === 0) {
      return runtime.basePositionMs;
    }

    return runtime.basePositionMs + (Date.now() - runtime.wallStartMs) * runtime.speed;
  }, [replayState.isPlaying]);

  const applyReplaySnapshot = useCallback((recording) => {
    const snapshotStations = buildStationsFromSnapshot(recording?.initialState?.stations);
    const snapshotMatchStatus = coerceMatchStatusSnapshot(recording?.initialState?.matchStatus);
    minBatteryRef.current = createMinBatteryMap(snapshotStations);
    metricHistoryRef.current.clear();
    currentMatchRef.current = recording?.initialState?.currentMatch ?? null;
    matchStatusRef.current = snapshotMatchStatus;
    cycleCadenceStateRef.current = createUnknownCycleCadenceState();
    setStations(snapshotStations);
    setMatchStatus(snapshotMatchStatus);
    setAheadBehind(
      coerceAheadBehindSnapshot(recording?.initialState?.aheadBehind, recording?.initialState?.aheadBehindKnown)
    );
    setCycleCadenceState(createUnknownCycleCadenceState());
    setCycleClockMs(null);
    setError('');
    setIsFieldHubConnected(false);
    setIsInfrastructureHubConnected(false);
  }, []);

  const recordIncomingEvent = useCallback((source, event, payload) => {
    if (!recordingStateRef.current.isRecording) {
      return;
    }

    recordingStateRef.current.events.push({
      t: Date.now() - recordingStateRef.current.startedAtMs,
      source,
      event,
      payload: cloneRecordingPayload(payload),
    });

    setRecorderState((current) => ({
      ...current,
      eventCount: recordingStateRef.current.events.length,
    }));
  }, []);

  const applyStationData = useCallback(
    (dataArray, { shouldRecord = false } = {}) => {
      if (shouldRecord) {
        recordIncomingEvent('fieldHub', 'fieldMonitorDataChanged', dataArray || []);
      }

      const stationMap = new Map(
        ALL_STATION_SLOTS.map((slot) => [slotKey(slot.alliance, slot.station), createEmptyStation(slot.alliance, slot.station)])
      );

      (dataArray || []).forEach((item) => {
        const station = normalizeStation(item, minBatteryRef.current);
        stationMap.set(slotKey(station.alliance, station.station), station);

        const key = slotKey(station.alliance, station.station);
        let hist = metricHistoryRef.current.get(key);
        if (!hist) {
          hist = { trip: [], snr: [], battery: [], bandwidth: [] };
          metricHistoryRef.current.set(key, hist);
        }
        hist.trip.push(station.averageTripTime);
        if (hist.trip.length > METRIC_HISTORY_SIZE) hist.trip.shift();
        hist.snr.push(station.snr);
        if (hist.snr.length > METRIC_HISTORY_SIZE) hist.snr.shift();
        hist.battery.push(station.battery);
        if (hist.battery.length > METRIC_HISTORY_SIZE) hist.battery.shift();
        hist.bandwidth.push(station.dataRateTotal);
        if (hist.bandwidth.length > METRIC_HISTORY_SIZE) hist.bandwidth.shift();
      });

      setStations(ALL_STATION_SLOTS.map((slot) => stationMap.get(slotKey(slot.alliance, slot.station))));
    },
    [recordIncomingEvent]
  );

  const applyMatchStatus = useCallback(
    (data, { shouldRecord = false, observedAtMs = null } = {}) => {
      if (shouldRecord) {
        recordIncomingEvent('infrastructureHub', 'matchStatusInfoChanged', data);
      }

      const previousStatus = matchStatusRef.current;
      const nextStatus = normalizeMatchStatus(data);
      const nextObservedAtMs = Number.isFinite(observedAtMs) ? observedAtMs : Date.now();
      if (nextStatus.matchState === MatchStateType.WaitingForPrestart) {
        minBatteryRef.current.clear();
        metricHistoryRef.current.clear();
      }

      matchStatusRef.current = nextStatus;
      const nextCycleState = deriveNextCycleCadenceState(
        cycleCadenceStateRef.current,
        previousStatus,
        nextStatus,
        nextObservedAtMs
      );
      cycleCadenceStateRef.current = nextCycleState;
      setCycleCadenceState(nextCycleState);
      setCycleClockMs(nextCycleState.currentCycleTrust === 'observed' ? nextObservedAtMs : null);
      setMatchStatus(nextStatus);
    },
    [recordIncomingEvent]
  );

  const applyCurrentMatchContext = useCallback(
    (data, { shouldRecord = false, shouldReconcileCycle = false, observedAtMs = null } = {}) => {
      if (shouldRecord) {
        recordIncomingEvent('infrastructureApi', 'currentMatchContextChanged', data);
      }

      currentMatchRef.current = data;
      const nextMatchStatus = {
        ...matchStatusRef.current,
        matchNumber: Number(data?.item2) || matchStatusRef.current.matchNumber,
        playNumber: Number(data?.item3) || matchStatusRef.current.playNumber,
        tournamentLevel: data?.item1 || matchStatusRef.current.tournamentLevel,
      };

      matchStatusRef.current = nextMatchStatus;
      setMatchStatus((current) => ({
        ...current,
        matchNumber: nextMatchStatus.matchNumber,
        playNumber: nextMatchStatus.playNumber,
        tournamentLevel: nextMatchStatus.tournamentLevel,
      }));

      const nextCycleState = shouldReconcileCycle
        ? reconcileCycleCadenceState(cycleCadenceStateRef.current, nextMatchStatus)
        : cycleCadenceStateRef.current;

      if (nextCycleState !== cycleCadenceStateRef.current) {
        cycleCadenceStateRef.current = nextCycleState;
        setCycleCadenceState(nextCycleState);
      }

      const nextObservedAtMs = Number.isFinite(observedAtMs) ? observedAtMs : Date.now();
      setCycleClockMs(nextCycleState.currentCycleTrust === 'observed' ? nextObservedAtMs : null);
      return data;
    },
    [recordIncomingEvent]
  );

  const refreshCurrentMatchContext = useCallback(
    async ({ shouldReconcileCycle = false, observedAtMs = null } = {}) => {
      try {
        const response = await fetch(
          buildFieldMonitorUrl(baseUrl, '/api/v1.0/fieldMonitor/get/GetCurrentMatchAndPlayNumber')
        );
        if (!response.ok) {
          throw new Error(`Current match request failed with ${response.status}`);
        }

        const data = await response.json();
        if (!isMountedRef.current || sourceModeRef.current !== 'live') {
          return null;
        }

        return applyCurrentMatchContext(data, {
          shouldRecord: true,
          shouldReconcileCycle,
          observedAtMs,
        });
      } catch (fetchError) {
        if (isMountedRef.current && sourceModeRef.current === 'live') {
          setError(fetchError instanceof Error ? fetchError.message : 'Unable to fetch current match');
        }
        return null;
      }
    },
    [applyCurrentMatchContext, baseUrl]
  );

  const applyAheadBehind = useCallback(
    (data, { shouldRecord = false } = {}) => {
      if (shouldRecord) {
        recordIncomingEvent('infrastructureHub', 'ScheduleAheadBehindChanged', data || '');
      }

      setAheadBehind(createKnownAheadBehindState(data || ''));
    },
    [recordIncomingEvent]
  );

  function startRecording(label = '') {
    const startedAt = new Date();

    recordingStateRef.current = {
      isRecording: true,
      startedAtMs: startedAt.getTime(),
      startedAtIso: startedAt.toISOString(),
      label: label.trim(),
      initialState: {
        currentMatch: cloneRecordingPayload(currentMatchRef.current),
        matchStatus: cloneRecordingPayload(matchStatus),
        stations: cloneRecordingPayload(stations),
        aheadBehind: aheadBehind.text,
        aheadBehindKnown: aheadBehind.isKnown,
      },
      events: [],
    };

    setRecorderState({
      isRecording: true,
      eventCount: 0,
      startedAtIso: startedAt.toISOString(),
      lastDownloadName: '',
      lastEventCount: 0,
    });
  }

  function stopRecordingAndDownload() {
    if (!recordingStateRef.current.isRecording) {
      return false;
    }

    const startedAt = new Date(recordingStateRef.current.startedAtIso);
    const stoppedAt = new Date();
    const recording = {
      version: RECORDING_FILE_VERSION,
      meta: {
        host: baseUrl,
        capturedAt: recordingStateRef.current.startedAtIso,
        stoppedAt: stoppedAt.toISOString(),
        durationMs: stoppedAt.getTime() - recordingStateRef.current.startedAtMs,
        mirrorLayout,
        label: recordingStateRef.current.label,
      },
      initialState: recordingStateRef.current.initialState,
      events: recordingStateRef.current.events,
    };
    const filename = createRecordingFilename(recordingStateRef.current.label, matchStatus, startedAt);

    downloadRecordingFile(filename, recording);

    setRecorderState({
      isRecording: false,
      eventCount: 0,
      startedAtIso: '',
      lastDownloadName: filename,
      lastEventCount: recordingStateRef.current.events.length,
    });
    recordingStateRef.current = {
      isRecording: false,
      startedAtMs: 0,
      startedAtIso: '',
      label: '',
      initialState: null,
      events: [],
    };

    return true;
  }

  const initializeReplay = useCallback(
    (recording, fileName, { autoPlay = true } = {}) => {
      clearReplayTimer();
      applyReplaySnapshot(recording);
      replayRuntimeRef.current = {
        timeoutId: null,
        basePositionMs: 0,
        wallStartMs: autoPlay ? Date.now() : 0,
        nextEventIndex: 0,
        speed: DEFAULT_REPLAY_SPEED,
      };
      setReplayRecording(recording);
      setSourceMode('replay');
      setReplayState({
        isReplayMode: true,
        isPlaying: autoPlay,
        currentTimeMs: 0,
        durationMs: getReplayDurationMs(recording),
        eventCount: recording.events.length,
        speed: DEFAULT_REPLAY_SPEED,
        fileName,
        error: '',
      });
      setError('');
    },
    [applyReplaySnapshot, clearReplayTimer]
  );

  const dispatchReplayEvent = useCallback(
    (entry) => {
      if (entry.source === 'fieldHub' && entry.event === 'fieldMonitorDataChanged') {
        applyStationData(entry.payload, { shouldRecord: false });
        return;
      }

      if (entry.source === 'infrastructureHub' && entry.event === 'matchStatusInfoChanged') {
        applyMatchStatus(entry.payload, { shouldRecord: false, observedAtMs: Number(entry.t) || 0 });
        return;
      }

      if (entry.source === 'infrastructureHub' && entry.event === 'ScheduleAheadBehindChanged') {
        applyAheadBehind(entry.payload, { shouldRecord: false });
        return;
      }

      if (entry.source === 'infrastructureApi' && entry.event === 'currentMatchContextChanged') {
        applyCurrentMatchContext(entry.payload, {
          shouldRecord: false,
          shouldReconcileCycle: true,
          observedAtMs: Number(entry.t) || 0,
        });
      }
    },
    [applyAheadBehind, applyCurrentMatchContext, applyMatchStatus, applyStationData]
  );

  const scheduleReplay = useCallback(() => {
    clearReplayTimer();

    if (sourceMode !== 'replay' || !replayRecording || !replayState.isPlaying) {
      return;
    }

    const runtime = replayRuntimeRef.current;
    const durationMs = getReplayDurationMs(replayRecording);
    const events = replayRecording.events || [];
    let positionMs = Math.min(getCurrentReplayPositionMs(), durationMs);

    while (runtime.nextEventIndex < events.length && events[runtime.nextEventIndex].t <= positionMs) {
      const nextEntry = events[runtime.nextEventIndex];
      dispatchReplayEvent(nextEntry);
      runtime.nextEventIndex += 1;
      positionMs = nextEntry.t;
    }

    setReplayState((current) => ({
      ...current,
      currentTimeMs: positionMs,
    }));

    if (runtime.nextEventIndex >= events.length) {
      runtime.basePositionMs = durationMs;
      runtime.wallStartMs = 0;
      setReplayState((current) => ({
        ...current,
        isPlaying: false,
        currentTimeMs: durationMs,
      }));
      return;
    }

    const nextEntry = events[runtime.nextEventIndex];
    runtime.basePositionMs = positionMs;
    runtime.wallStartMs = Date.now();
    runtime.speed = replayState.speed;
    runtime.timeoutId = window.setTimeout(() => {
      const currentRuntime = replayRuntimeRef.current;
      dispatchReplayEvent(nextEntry);
      currentRuntime.nextEventIndex += 1;
      currentRuntime.basePositionMs = nextEntry.t;
      currentRuntime.wallStartMs = Date.now();
      setReplayState((current) => ({
        ...current,
        currentTimeMs: nextEntry.t,
      }));
      scheduleReplay();
    }, Math.max(0, (nextEntry.t - positionMs) / replayState.speed));
  }, [
    clearReplayTimer,
    dispatchReplayEvent,
    getCurrentReplayPositionMs,
    replayRecording,
    replayState.isPlaying,
    replayState.speed,
    sourceMode,
  ]);

  const loadReplayFile = useCallback(
    async (file) => {
      if (!file) {
        return false;
      }

      try {
        const text = await file.text();
        const recording = parseReplayRecording(text);
        activeReplayRecording = recording;
        activeReplayFileName = file.name || 'field-monitor-recording.json';
        initializeReplay(recording, activeReplayFileName);
        return true;
      } catch (loadError) {
        const message = loadError instanceof Error ? loadError.message : 'Unable to load replay file';
        setReplayState((current) => ({
          ...current,
          error: message,
        }));
        setError(message);
        return false;
      }
    },
    [initializeReplay]
  );

  const pauseReplay = useCallback(() => {
    clearReplayTimer();
    const nextPosition = Math.min(getCurrentReplayPositionMs(), replayState.durationMs);
    replayRuntimeRef.current.basePositionMs = nextPosition;
    replayRuntimeRef.current.wallStartMs = 0;
    setReplayState((current) => ({
      ...current,
      isPlaying: false,
      currentTimeMs: nextPosition,
    }));
  }, [clearReplayTimer, getCurrentReplayPositionMs, replayState.durationMs]);

  const resumeReplay = useCallback(() => {
    if (!replayRecording) {
      return;
    }

    replayRuntimeRef.current.wallStartMs = Date.now();
    replayRuntimeRef.current.speed = replayState.speed;
    setReplayState((current) => ({
      ...current,
      isPlaying: true,
      error: '',
    }));
  }, [replayRecording, replayState.speed]);

  const restartReplay = useCallback(() => {
    if (!replayRecording) {
      return;
    }

    initializeReplay(replayRecording, replayState.fileName, { autoPlay: true });
  }, [initializeReplay, replayRecording, replayState.fileName]);

  const setReplaySpeed = useCallback(
    (nextSpeed) => {
      const speed = REPLAY_SPEED_OPTIONS.includes(nextSpeed) ? nextSpeed : DEFAULT_REPLAY_SPEED;
      const nextPosition = Math.min(getCurrentReplayPositionMs(), replayState.durationMs);
      replayRuntimeRef.current.basePositionMs = nextPosition;
      replayRuntimeRef.current.wallStartMs = replayState.isPlaying ? Date.now() : 0;
      replayRuntimeRef.current.speed = speed;
      setReplayState((current) => ({
        ...current,
        speed,
        currentTimeMs: nextPosition,
      }));
    },
    [getCurrentReplayPositionMs, replayState.durationMs, replayState.isPlaying]
  );

  const clearReplay = useCallback(() => {
    clearReplayTimer();
    activeReplayRecording = null;
    activeReplayFileName = '';
    replayRuntimeRef.current = {
      timeoutId: null,
      basePositionMs: 0,
      wallStartMs: 0,
      nextEventIndex: 0,
      speed: DEFAULT_REPLAY_SPEED,
    };
    minBatteryRef.current.clear();
    metricHistoryRef.current.clear();
    currentMatchRef.current = null;
    matchStatusRef.current = normalizeMatchStatus();
    cycleCadenceStateRef.current = createUnknownCycleCadenceState();
    setReplayRecording(null);
    setReplayState(createDefaultReplayState());
    setSourceMode('live');
    setStations(buildInitialStations());
    setMatchStatus(normalizeMatchStatus());
    setAheadBehind(createUnknownAheadBehindState());
    setCycleCadenceState(createUnknownCycleCadenceState());
    setCycleClockMs(null);
    setError('');
    setIsFieldHubConnected(false);
    setIsInfrastructureHubConnected(false);
  }, [clearReplayTimer]);

  useEffect(() => {
    if (sourceMode !== 'live') {
      return undefined;
    }

    void refreshCurrentMatchContext();

    return undefined;
  }, [refreshCurrentMatchContext, sourceMode]);

  useEffect(() => {
    if (sourceMode !== 'live') {
      return undefined;
    }

    const fieldHub = hubConnectionFactory(buildFieldMonitorUrl(baseUrl, '/fieldMonitorHub'));
    const infrastructureHub = hubConnectionFactory(buildFieldMonitorUrl(baseUrl, '/infrastructureHub'));

    let isMounted = true;

    function handleStationData(dataArray) {
      if (isMounted) {
        applyStationData(dataArray, { shouldRecord: true });
      }
    }

    function handleMatchStatus(data) {
      if (isMounted) {
        applyMatchStatus(data, { shouldRecord: true, observedAtMs: Date.now() });
      }
    }

    fieldHub.on('fieldMonitorDataChanged', handleStationData);
    infrastructureHub.on('matchStatusInfoChanged', handleMatchStatus);
    infrastructureHub.on('ScheduleAheadBehindChanged', (data) => {
      if (isMounted) {
        applyAheadBehind(data, { shouldRecord: true });
      }
    });

    fieldHub.onreconnected(() => {
      if (isMounted) {
        setIsFieldHubConnected(true);
      }
    });

    infrastructureHub.onreconnected(() => {
      if (isMounted) {
        setIsInfrastructureHubConnected(true);
        void refreshCurrentMatchContext({ shouldReconcileCycle: true, observedAtMs: Date.now() });
      }
    });

    fieldHub.onclose(() => {
      if (isMounted) {
        setIsFieldHubConnected(false);
      }
    });

    infrastructureHub.onclose(() => {
      if (isMounted) {
        setIsInfrastructureHubConnected(false);
      }
    });

    Promise.all([
      fieldHub
        .start()
        .then(() => {
          if (isMounted) {
            setIsFieldHubConnected(true);
          }
        })
        .catch((hubError) => {
          if (isMounted) {
            setError(hubError instanceof Error ? hubError.message : 'Unable to connect to field monitor hub');
          }
        }),
      infrastructureHub
        .start()
        .then(() => {
          if (isMounted) {
            setIsInfrastructureHubConnected(true);
          }
        })
        .catch((hubError) => {
          if (isMounted) {
            setError(hubError instanceof Error ? hubError.message : 'Unable to connect to infrastructure hub');
          }
        }),
    ]);

    return () => {
      isMounted = false;
      fieldHub.stop();
      infrastructureHub.stop();
    };
  }, [
    applyAheadBehind,
    applyMatchStatus,
    applyStationData,
    baseUrl,
    hubConnectionFactory,
    refreshCurrentMatchContext,
    sourceMode,
  ]);

  useEffect(() => {
    if (sourceMode !== 'live' || typeof document === 'undefined' || typeof window === 'undefined') {
      return undefined;
    }

    const refreshForResume = () => {
      void refreshCurrentMatchContext({ shouldReconcileCycle: true, observedAtMs: Date.now() });
    };

    const handleVisibilityChange = () => {
      if (!document.hidden) {
        refreshForResume();
      }
    };

    window.addEventListener('focus', refreshForResume);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.removeEventListener('focus', refreshForResume);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [refreshCurrentMatchContext, sourceMode]);

  useEffect(() => {
    if (
      sourceMode !== 'replay' ||
      !replayRecording ||
      replayRuntimeRef.current.nextEventIndex !== 0 ||
      replayRuntimeRef.current.wallStartMs !== 0 ||
      replayState.currentTimeMs !== 0
    ) {
      return;
    }

    initializeReplay(replayRecording, replayState.fileName || activeReplayFileName, { autoPlay: replayState.isPlaying });
  }, [initializeReplay, replayRecording, replayState.currentTimeMs, replayState.fileName, replayState.isPlaying, sourceMode]);

  useEffect(() => {
    if (sourceMode !== 'replay' || !replayRecording || !replayState.isPlaying) {
      clearReplayTimer();
      return undefined;
    }

    scheduleReplay();

    return () => {
      clearReplayTimer();
    };
  }, [clearReplayTimer, replayRecording, replayState.isPlaying, replayState.speed, scheduleReplay, sourceMode]);

  useEffect(() => {
    if (!Number.isFinite(cycleCadenceState.currentCycleStartMs) || cycleCadenceState.currentCycleStartMs < 0) {
      setCycleClockMs(null);
      return undefined;
    }

    const readClockMs = () => {
      if (sourceMode === 'replay') {
        if (!replayState.isPlaying) {
          return replayState.currentTimeMs;
        }

        return Math.min(getCurrentReplayPositionMs(), replayState.durationMs);
      }

      return Date.now();
    };

    const updateClock = () => {
      setCycleClockMs(readClockMs());
    };

    updateClock();

    if (sourceMode === 'replay' && !replayState.isPlaying) {
      return undefined;
    }

    const intervalId = window.setInterval(updateClock, 1000);
    return () => {
      window.clearInterval(intervalId);
    };
  }, [
    cycleCadenceState.currentCycleStartMs,
    getCurrentReplayPositionMs,
    replayState.currentTimeMs,
    replayState.durationMs,
    replayState.isPlaying,
    sourceMode,
  ]);

  const alliancePanels = useMemo(
    () => buildPanels(stations, mirrorLayout, reverseBlueTeams, matchStatus, metricHistoryRef.current),
    [matchStatus, mirrorLayout, reverseBlueTeams, stations]
  );
  const diagnosticsPanels = useMemo(
    () => buildDiagnosticsPanels(stations, mirrorLayout, reverseBlueTeams, matchStatus, metricHistoryRef.current),
    [matchStatus, mirrorLayout, reverseBlueTeams, stations]
  );
  const isFieldReady = useMemo(() => isFieldReadyState(stations, matchStatus), [matchStatus, stations]);
  const scheduleStatus = aheadBehind.isKnown ? aheadBehind.text || 'On schedule' : 'Unknown';
  const cycleCadence = useMemo(
    () =>
      buildCycleCadence(
        cycleCadenceState,
        Number.isFinite(cycleClockMs)
          ? cycleClockMs
          : sourceMode === 'replay'
            ? replayState.currentTimeMs
            : Date.now()
      ),
    [cycleCadenceState, cycleClockMs, replayState.currentTimeMs, sourceMode]
  );

  return {
    sourceMode,
    alliancePanels,
    diagnosticsPanels,
    matchStatus,
    aheadBehind: aheadBehind.text,
    isAheadBehindKnown: aheadBehind.isKnown,
    scheduleStatus,
    cycleCadence,
    error,
    isConnected: sourceMode === 'live' && isFieldHubConnected && isInfrastructureHubConnected,
    isFieldReady,
    hasLiveData: stations.some((station) => station.teamNumber > 0),
    recorder: {
      isRecording: sourceMode === 'live' && recorderState.isRecording,
      eventCount: recorderState.eventCount,
      startedAtIso: recorderState.startedAtIso,
      lastDownloadName: recorderState.lastDownloadName,
      lastEventCount: recorderState.lastEventCount,
      startRecording,
      stopRecordingAndDownload,
    },
    replay: {
      ...replayState,
      speedOptions: REPLAY_SPEED_OPTIONS,
      loadReplayFile,
      resumeReplay,
      pauseReplay,
      restartReplay,
      clearReplay,
      setReplaySpeed,
    },
  };
}
