import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, renderHook, waitFor } from '@testing-library/react';
import {
  fieldMonitorTypes,
  getBaseUrl,
  resetFieldMonitorLiveTestState,
  useFieldMonitorLiveData,
} from './fieldMonitorLive';
import { createFakeHubFactory } from '../test/fakeSignalR';

const { AllianceType, MatchStateType, MonitorStatusType, RadioConnectionQuality, StationType } = fieldMonitorTypes;
const originalBaseUrl = import.meta.env.VITE_FIELD_MONITOR_BASE_URL;

function createStationPayload(overrides = {}) {
  return {
    Alliance: AllianceType.Red,
    Station: StationType.Station1,
    TeamNumber: 254,
    Connection: true,
    LinkActive: true,
    DSLinkActive: true,
    RadioLink: true,
    RIOLink: true,
    IsEnabled: true,
    IsAuto: false,
    Battery: 12.4,
    AverageTripTime: 7,
    LostPackets: 1,
    DataRateTotal: 4.8,
    DataRateToRobot: 1.9,
    DataRateFromRobot: 2.9,
    MonitorStatus: MonitorStatusType.EnabledTeleop,
    RadioConnectionQuality: RadioConnectionQuality.Excellent,
    RadioConnectedToAp: true,
    ...overrides,
  };
}

function createReplayFile(recording, name = 'recording.json') {
  return {
    name,
    text: vi.fn().mockResolvedValue(JSON.stringify(recording)),
  };
}

function createCurrentMatchResponse({ tournamentLevel = 'Qualification', matchNumber = 42, playNumber = 1 } = {}) {
  return {
    ok: true,
    json: async () => ({
      item1: tournamentLevel,
      item2: matchNumber,
      item3: playNumber,
    }),
  };
}

async function flushPromises() {
  await Promise.resolve();
}

describe('useFieldMonitorLiveData', () => {
  beforeEach(() => {
    resetFieldMonitorLiveTestState();
    delete import.meta.env.VITE_FIELD_MONITOR_BASE_URL;
    globalThis.fetch = vi.fn().mockResolvedValue(createCurrentMatchResponse());
  });

  afterEach(() => {
    resetFieldMonitorLiveTestState();
    vi.useRealTimers();
    if (originalBaseUrl === undefined) {
      delete import.meta.env.VITE_FIELD_MONITOR_BASE_URL;
      return;
    }

    import.meta.env.VITE_FIELD_MONITOR_BASE_URL = originalBaseUrl;
  });

  it('bootstraps live data in direct mode, handles hub events, and cleans up both SignalR connections', async () => {
    import.meta.env.VITE_FIELD_MONITOR_BASE_URL = 'http://10.0.100.5/';
    const hubFactory = createFakeHubFactory();
    const { result, unmount } = renderHook(() =>
      useFieldMonitorLiveData({
        hubConnectionFactory: hubFactory.factory,
      })
    );

    await waitFor(() => {
      expect(result.current.isConnected).toBe(true);
    });

    expect(globalThis.fetch).toHaveBeenCalledWith(
      'http://10.0.100.5/api/v1.0/fieldMonitor/get/GetCurrentMatchAndPlayNumber'
    );

    const fieldHub = hubFactory.getHubByName('fieldMonitorHub');
    const infrastructureHub = hubFactory.getHubByName('infrastructureHub');

    expect(fieldHub).toBeTruthy();
    expect(infrastructureHub).toBeTruthy();

    act(() => {
      fieldHub.emit('fieldMonitorDataChanged', [createStationPayload()]);
      infrastructureHub.emit('matchStatusInfoChanged', {
        MatchState: MatchStateType.MatchTeleop,
        MatchNumber: 42,
        PlayNumber: 1,
        TournamentLevel: 'Qualification',
      });
      infrastructureHub.emit('ScheduleAheadBehindChanged', 'Ahead by 1');
    });

    await waitFor(() => {
      expect(result.current.hasLiveData).toBe(true);
    });

    expect(result.current.scheduleStatus).toBe('Ahead by 1');
    expect(result.current.matchStatus.matchNumber).toBe(42);
    expect(result.current.alliancePanels.map((panel) => panel.alliance)).toEqual(['blue', 'red']);
    expect(result.current.alliancePanels[1].rows.map((row) => row.station)).toEqual(['Stn 3', 'Stn 2', 'Stn 1']);
    expect(result.current.alliancePanels[1].rows[2]).toMatchObject({
      team: '254',
      station: 'Stn 1',
    });

    act(() => {
      fieldHub.emitClose();
      infrastructureHub.emitClose();
    });

    await waitFor(() => {
      expect(result.current.isConnected).toBe(false);
    });

    unmount();

    expect(fieldHub.stop).toHaveBeenCalledTimes(1);
    expect(infrastructureHub.stop).toHaveBeenCalledTimes(1);
  });

  it('reverses blue station order when requested', async () => {
    const hubFactory = createFakeHubFactory();
    const { result } = renderHook(() =>
      useFieldMonitorLiveData({
        reverseBlueTeams: true,
        hubConnectionFactory: hubFactory.factory,
      })
    );

    await waitFor(() => {
      expect(result.current.isConnected).toBe(true);
    });

    const fieldHub = hubFactory.getHubByName('fieldMonitorHub');
    const infrastructureHub = hubFactory.getHubByName('infrastructureHub');

    act(() => {
      fieldHub.emit('fieldMonitorDataChanged', [
        createStationPayload({ Alliance: AllianceType.Blue, Station: StationType.Station1, TeamNumber: 111 }),
        createStationPayload({ Alliance: AllianceType.Blue, Station: StationType.Station2, TeamNumber: 222 }),
        createStationPayload({ Alliance: AllianceType.Blue, Station: StationType.Station3, TeamNumber: 333 }),
      ]);
      infrastructureHub.emit('matchStatusInfoChanged', {
        MatchState: MatchStateType.MatchTeleop,
        MatchNumber: 42,
        PlayNumber: 1,
        TournamentLevel: 'Qualification',
      });
    });

    await waitFor(() => {
      expect(result.current.alliancePanels[0].rows.map((row) => row.station)).toEqual(['Stn 3', 'Stn 2', 'Stn 1']);
    });
  });

  it('defaults live requests to same-origin when no browser base URL is configured', async () => {
    const hubFactory = createFakeHubFactory();

    renderHook(() =>
      useFieldMonitorLiveData({
        hubConnectionFactory: hubFactory.factory,
      })
    );

    await waitFor(() => {
      expect(globalThis.fetch).toHaveBeenCalledWith(
        `${window.location.origin}/api/v1.0/fieldMonitor/get/GetCurrentMatchAndPlayNumber`
      );
    });

    expect(hubFactory.hubs.map((hub) => hub.url)).toEqual(
      expect.arrayContaining([
        `${window.location.origin}/fieldMonitorHub`,
        `${window.location.origin}/infrastructureHub`,
      ])
    );
  });

  it('resolves the browser base URL from env first and falls back to same-origin', () => {
    expect(
      getBaseUrl({
        env: {
          VITE_FIELD_MONITOR_BASE_URL: 'http://10.0.100.5/',
        },
        location: {
          origin: 'http://proxy.local:3000',
        },
      })
    ).toBe('http://10.0.100.5');

    expect(
      getBaseUrl({
        env: {},
        location: {
          origin: 'http://proxy.local:3000',
        },
      })
    ).toBe('http://proxy.local:3000');

    expect(
      getBaseUrl({
        env: {},
        location: null,
      })
    ).toBe('');
  });

  it('records live hub traffic and downloads a JSON capture', async () => {
    const hubFactory = createFakeHubFactory();
    const createObjectURLSpy = vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:recording');
    const revokeObjectURLSpy = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
    const anchorClickSpy = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
    const { result } = renderHook(() =>
      useFieldMonitorLiveData({
        hubConnectionFactory: hubFactory.factory,
      })
    );

    await waitFor(() => {
      expect(result.current.isConnected).toBe(true);
    });

    const fieldHub = hubFactory.getHubByName('fieldMonitorHub');
    const infrastructureHub = hubFactory.getHubByName('infrastructureHub');

    act(() => {
      result.current.recorder.startRecording('qm-42');
    });

    act(() => {
      fieldHub.emit('fieldMonitorDataChanged', [createStationPayload()]);
      infrastructureHub.emit('matchStatusInfoChanged', {
        MatchState: MatchStateType.MatchTeleop,
        MatchNumber: 42,
        PlayNumber: 1,
        TournamentLevel: 'Qualification',
      });
    });

    await waitFor(() => {
      expect(result.current.recorder.eventCount).toBe(2);
    });

    act(() => {
      result.current.recorder.stopRecordingAndDownload();
    });

    await waitFor(() => {
      expect(result.current.recorder.isRecording).toBe(false);
    });

    expect(createObjectURLSpy).toHaveBeenCalledTimes(1);
    expect(anchorClickSpy).toHaveBeenCalledTimes(1);
    expect(revokeObjectURLSpy).toHaveBeenCalledWith('blob:recording');
    expect(result.current.recorder.lastDownloadName).toContain('field-monitor-qm-42-');
    expect(result.current.recorder.lastEventCount).toBe(2);

    const blob = createObjectURLSpy.mock.calls[0][0];
    const recording = JSON.parse(await blob.text());

    expect(recording.meta.label).toBe('qm-42');
    expect(recording.events).toHaveLength(2);
    expect(recording.events[0].event).toBe('fieldMonitorDataChanged');
  });

  it('records fetched current-match context changes so replay keeps match metadata in sync', async () => {
    const hubFactory = createFakeHubFactory();
    const createObjectURLSpy = vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:recording');
    const revokeObjectURLSpy = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
    const anchorClickSpy = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
    const { result } = renderHook(() =>
      useFieldMonitorLiveData({
        hubConnectionFactory: hubFactory.factory,
      })
    );

    await waitFor(() => {
      expect(result.current.isConnected).toBe(true);
    });

    vi.useFakeTimers();
    vi.setSystemTime(new Date(2024, 0, 2, 3, 4, 5));

    act(() => {
      result.current.recorder.startRecording('qm-43');
    });

    globalThis.fetch.mockResolvedValueOnce(
      createCurrentMatchResponse({
        tournamentLevel: 'Quarterfinal',
        matchNumber: 43,
        playNumber: 2,
      })
    );

    vi.setSystemTime(new Date(2024, 0, 2, 3, 4, 6));
    await act(async () => {
      window.dispatchEvent(new Event('focus'));
      await flushPromises();
      await flushPromises();
    });

    expect(result.current.matchStatus).toMatchObject({
      matchNumber: 43,
      playNumber: 2,
      tournamentLevel: 'Quarterfinal',
    });

    act(() => {
      result.current.recorder.stopRecordingAndDownload();
    });

    const blob = createObjectURLSpy.mock.calls[0][0];
    const recording = JSON.parse(await blob.text());

    expect(recording.events).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          source: 'infrastructureApi',
          event: 'currentMatchContextChanged',
          payload: {
            item1: 'Quarterfinal',
            item2: 43,
            item3: 2,
          },
        }),
      ])
    );

    await act(async () => {
      await result.current.replay.loadReplayFile(createReplayFile(recording));
      await flushPromises();
    });

    expect(result.current.sourceMode).toBe('replay');
    expect(result.current.matchStatus).toMatchObject({
      matchNumber: 42,
      playNumber: 1,
      tournamentLevel: 'Qualification',
    });

    await act(async () => {
      await vi.advanceTimersByTimeAsync(1000);
      await flushPromises();
    });

    expect(result.current.matchStatus).toMatchObject({
      matchNumber: 43,
      playNumber: 2,
      tournamentLevel: 'Quarterfinal',
    });
    expect(anchorClickSpy).toHaveBeenCalledTimes(1);
    expect(revokeObjectURLSpy).toHaveBeenCalledWith('blob:recording');
  });

  it('tracks completed and running cycle cadence from distinct match auto starts', async () => {
    const hubFactory = createFakeHubFactory();
    const { result } = renderHook(() =>
      useFieldMonitorLiveData({
        hubConnectionFactory: hubFactory.factory,
      })
    );

    await waitFor(() => {
      expect(result.current.isConnected).toBe(true);
    });

    vi.useFakeTimers();
    vi.setSystemTime(new Date(2024, 0, 2, 3, 4, 5));

    const infrastructureHub = hubFactory.getHubByName('infrastructureHub');

    act(() => {
      infrastructureHub.emit('matchStatusInfoChanged', {
        MatchState: MatchStateType.MatchAuto,
        MatchNumber: 42,
        PlayNumber: 1,
        TournamentLevel: 'Qualification',
      });
    });

    expect(result.current.cycleCadence.currentCycleLabel).toBe('0:00');
    expect(result.current.cycleCadence.summary).toBe('0:00 running');

    await act(async () => {
      await vi.advanceTimersByTimeAsync(4000);
    });

    expect(result.current.cycleCadence.currentCycleLabel).toBe('0:04');

    act(() => {
      infrastructureHub.emit('matchStatusInfoChanged', {
        MatchState: MatchStateType.MatchAuto,
        MatchNumber: 42,
        PlayNumber: 1,
        TournamentLevel: 'Qualification',
      });
    });

    expect(result.current.cycleCadence.lastCycleMs).toBeNull();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(61 * 1000);
    });

    act(() => {
      infrastructureHub.emit('matchStatusInfoChanged', {
        MatchState: MatchStateType.MatchAuto,
        MatchNumber: 43,
        PlayNumber: 1,
        TournamentLevel: 'Qualification',
      });
    });

    expect(result.current.cycleCadence.lastCycleMs).toBe(65 * 1000);
    expect(result.current.cycleCadence.lastCycleLabel).toBe('1m');
    expect(result.current.cycleCadence.currentCycleLabel).toBe('0:00');
    expect(result.current.cycleCadence.summary).toBe('1m last | 0:00 run');

    await act(async () => {
      await vi.advanceTimersByTimeAsync(5000);
    });

    expect(result.current.cycleCadence.currentCycleLabel).toBe('0:05');
  });

  it('downgrades the running cycle to in-progress after a visibility refresh reveals a newer match', async () => {
    globalThis.fetch = vi
      .fn()
      .mockResolvedValueOnce(createCurrentMatchResponse({ matchNumber: 42, playNumber: 1 }))
      .mockResolvedValueOnce(createCurrentMatchResponse({ matchNumber: 44, playNumber: 1 }));

    const hubFactory = createFakeHubFactory();
    const { result } = renderHook(() =>
      useFieldMonitorLiveData({
        hubConnectionFactory: hubFactory.factory,
      })
    );

    await waitFor(() => {
      expect(result.current.isConnected).toBe(true);
    });

    vi.useFakeTimers();
    vi.setSystemTime(new Date(2024, 0, 2, 3, 4, 5));

    const infrastructureHub = hubFactory.getHubByName('infrastructureHub');

    act(() => {
      infrastructureHub.emit('matchStatusInfoChanged', {
        MatchState: MatchStateType.MatchAuto,
        MatchNumber: 42,
        PlayNumber: 1,
        TournamentLevel: 'Qualification',
      });
    });

    await act(async () => {
      await vi.advanceTimersByTimeAsync(61 * 1000);
    });

    act(() => {
      infrastructureHub.emit('matchStatusInfoChanged', {
        MatchState: MatchStateType.MatchAuto,
        MatchNumber: 43,
        PlayNumber: 1,
        TournamentLevel: 'Qualification',
      });
    });

    await act(async () => {
      await vi.advanceTimersByTimeAsync(5000);
    });

    expect(result.current.cycleCadence.summary).toBe('1m last | 0:05 run');
    expect(result.current.cycleCadence.currentCycleTrust).toBe('observed');

    Object.defineProperty(document, 'hidden', {
      configurable: true,
      value: false,
    });

    await act(async () => {
      document.dispatchEvent(new Event('visibilitychange'));
      await flushPromises();
      await flushPromises();
    });

    expect(globalThis.fetch).toHaveBeenCalledTimes(2);
    expect(result.current.cycleCadence.summary).toBe('1m last | in progress');
    expect(result.current.cycleCadence.currentCycleTrust).toBe('inferred');
    expect(result.current.cycleCadence.currentCycleLabel).toBe('');

    act(() => {
      infrastructureHub.emit('matchStatusInfoChanged', {
        MatchState: MatchStateType.MatchAuto,
        MatchNumber: 44,
        PlayNumber: 1,
        TournamentLevel: 'Qualification',
      });
    });

    expect(result.current.cycleCadence.summary).toBe('1m last | 0:00 run');
    expect(result.current.cycleCadence.currentCycleTrust).toBe('observed');
  });

  it('reconciles a missed start after infrastructure reconnect without losing the last completed cycle', async () => {
    globalThis.fetch = vi
      .fn()
      .mockResolvedValueOnce(createCurrentMatchResponse({ matchNumber: 42, playNumber: 1 }))
      .mockResolvedValueOnce(createCurrentMatchResponse({ matchNumber: 44, playNumber: 1 }));

    const hubFactory = createFakeHubFactory();
    const { result } = renderHook(() =>
      useFieldMonitorLiveData({
        hubConnectionFactory: hubFactory.factory,
      })
    );

    await waitFor(() => {
      expect(result.current.isConnected).toBe(true);
    });

    vi.useFakeTimers();
    vi.setSystemTime(new Date(2024, 0, 2, 3, 4, 5));

    const infrastructureHub = hubFactory.getHubByName('infrastructureHub');

    act(() => {
      infrastructureHub.emit('matchStatusInfoChanged', {
        MatchState: MatchStateType.MatchAuto,
        MatchNumber: 42,
        PlayNumber: 1,
        TournamentLevel: 'Qualification',
      });
    });

    await act(async () => {
      await vi.advanceTimersByTimeAsync(61 * 1000);
    });

    act(() => {
      infrastructureHub.emit('matchStatusInfoChanged', {
        MatchState: MatchStateType.MatchAuto,
        MatchNumber: 43,
        PlayNumber: 1,
        TournamentLevel: 'Qualification',
      });
    });

    await act(async () => {
      await vi.advanceTimersByTimeAsync(5000);
    });

    act(() => {
      infrastructureHub.emitReconnected();
    });

    await act(async () => {
      await flushPromises();
      await flushPromises();
    });

    expect(globalThis.fetch).toHaveBeenCalledTimes(2);
    expect(result.current.cycleCadence.lastCycleLabel).toBe('1m');
    expect(result.current.cycleCadence.summary).toBe('1m last | in progress');
    expect(result.current.cycleCadence.isCurrentCycleActive).toBe(true);
    expect(result.current.cycleCadence.isStartObserved).toBe(false);
  });

  it('loads replay files, advances through events with fake timers, and returns to live mode', async () => {
    const hubFactory = createFakeHubFactory();
    const { result } = renderHook(() =>
      useFieldMonitorLiveData({
        hubConnectionFactory: hubFactory.factory,
      })
    );

    await waitFor(() => {
      expect(result.current.isConnected).toBe(true);
    });

    vi.useFakeTimers();
    vi.setSystemTime(new Date(2024, 0, 2, 3, 4, 5));

    const file = createReplayFile({
      version: 1,
      meta: { durationMs: 1000 },
      initialState: {
        stations: [],
        matchStatus: {
          matchState: MatchStateType.WaitingForPrestart,
          matchNumber: 0,
          playNumber: 0,
          tournamentLevel: 'Unknown',
          matchStateMessage: 'Waiting for live data',
        },
        aheadBehind: '',
        aheadBehindKnown: false,
      },
      events: [
        {
          t: 250,
          source: 'fieldHub',
          event: 'fieldMonitorDataChanged',
          payload: [createStationPayload()],
        },
        {
          t: 500,
          source: 'infrastructureHub',
          event: 'ScheduleAheadBehindChanged',
          payload: 'Behind by 1',
        },
      ],
    });

    await act(async () => {
      await result.current.replay.loadReplayFile(file);
      await flushPromises();
    });

    expect(result.current.sourceMode).toBe('replay');
    expect(result.current.replay.fileName).toBe('recording.json');
    expect(result.current.replay.isPlaying).toBe(true);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(250);
      await flushPromises();
    });

    expect(result.current.hasLiveData).toBe(true);

    act(() => {
      result.current.replay.pauseReplay();
    });

    expect(result.current.replay.isPlaying).toBe(false);
    expect(result.current.replay.currentTimeMs).toBeGreaterThanOrEqual(250);

    act(() => {
      result.current.replay.setReplaySpeed(2);
      result.current.replay.resumeReplay();
    });

    expect(result.current.replay.speed).toBe(2);
    expect(result.current.replay.isPlaying).toBe(true);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(200);
      await flushPromises();
    });

    expect(result.current.scheduleStatus).toBe('Behind by 1');
    expect(result.current.replay.isPlaying).toBe(false);

    expect(result.current.replay.currentTimeMs).toBe(1000);

    act(() => {
      result.current.replay.restartReplay();
    });

    expect(result.current.replay.currentTimeMs).toBe(0);
    expect(result.current.replay.isPlaying).toBe(true);

    act(() => {
      result.current.replay.clearReplay();
    });

    expect(result.current.sourceMode).toBe('live');
    expect(result.current.replay.isReplayMode).toBe(false);
    expect(result.current.scheduleStatus).toBe('Unknown');
  });

  it('surfaces replay file parsing errors without leaving live mode', async () => {
    const hubFactory = createFakeHubFactory();
    const { result } = renderHook(() =>
      useFieldMonitorLiveData({
        hubConnectionFactory: hubFactory.factory,
      })
    );

    await waitFor(() => {
      expect(result.current.isConnected).toBe(true);
    });

    const badFile = {
      name: 'broken.json',
      text: vi.fn().mockResolvedValue('{}'),
    };

    let didLoad = true;
    await act(async () => {
      didLoad = await result.current.replay.loadReplayFile(badFile);
    });

    expect(didLoad).toBe(false);
    expect(result.current.sourceMode).toBe('live');
    expect(result.current.replay.error).toBe('Replay file is missing an events array.');
    expect(result.current.error).toBe('Replay file is missing an events array.');
  });
});
