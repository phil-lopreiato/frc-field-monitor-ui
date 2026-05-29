import { MemoryRouter } from 'react-router-dom';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import Diagnostics from './Diagnostics';
import { useFieldMonitorLiveData } from '../lib/fieldMonitorLive';

vi.mock('../lib/fieldMonitorLive', () => ({
  useFieldMonitorLiveData: vi.fn(),
  fieldMonitorTypes: {
    MatchStateType: {
      WaitingForMatchStart: 9,
    },
  },
}));

const mockUseFieldMonitorLiveData = vi.mocked(useFieldMonitorLiveData);

function createDiagnosticsRow(overrides = {}) {
  return {
    team: '254',
    station: 'Stn 1',
    mode: 'normal',
    status: { shortLabel: 'TELEOP', tone: 'tele' },
    isPostMatchMuted: false,
    blockingText: '',
    robotState: {
      enabled: true,
      enabledLabel: 'Enabled',
      phase: 'Teleop',
      phaseLabel: 'Teleop',
      stopKind: '',
      stopLabel: 'Normal',
    },
    control: {
      ds: { state: 'good', detail: 'Connected' },
      radio: { state: 'warn', detail: '2 bars', bars: 2 },
      rio: { state: 'good', detail: 'Connected' },
      flags: [
        { label: 'Conn', value: 'Up', tone: 'good' },
        { label: 'Live Link', value: 'Down', tone: 'bad' },
        { label: 'AP', value: 'On AP', tone: 'good' },
      ],
    },
    network: {
      quality: { value: '2 bars', label: 'Caution', tone: 'warn' },
      bandwidth: '4.8 Mbps',
      tx: '1.9',
      rx: '2.9',
      trip: '7 ms',
      loss: '1',
      signal: '-58',
      noise: '-94',
      snr: '36',
      inactivity: '0 ms',
      rxPackets: '128',
      rxMcsBandwidth: '80',
      rxVht: 'Yes',
      rxVhtNss: '2',
      history: { trip: [], snr: [], bandwidth: [] },
    },
    health: {
      battery: { value: '12.4V', min: '12.1', action: '', tone: 'normal' },
      brownout: false,
      flags: [
        { label: 'Brownout', value: 'No', tone: 'good' },
      ],
    },
    evidence: {
      monitorStatus: 'Teleop Enabled',
      stationStatus: 'OK',
      moveToStation: '--',
      macAddress: '00:80:2f:37:31:01',
      flags: [
        { label: 'Enabled', value: 'Yes', tone: 'good' },
        { label: 'Auto', value: 'No', tone: 'bad' },
      ],
    },
    ...overrides,
  };
}

function createHookState(overrides = {}) {
  return {
    diagnosticsPanels: [
      { alliance: 'blue', title: 'Blue Alliance', rows: [createDiagnosticsRow({ team: '1114' })] },
      { alliance: 'red', title: 'Red Alliance', rows: [createDiagnosticsRow()] },
    ],
    matchStatus: {
      matchState: 13,
      matchNumber: 42,
      matchStateMessage: 'Teleop',
    },
    scheduleStatus: 'On schedule',
    cycleCadence: {
      summary: 'Waiting for next start',
    },
    aheadBehind: '',
    isAheadBehindKnown: false,
    sourceMode: 'live',
    replay: {
      isReplayMode: false,
      isPlaying: false,
      currentTimeMs: 0,
      durationMs: 0,
      eventCount: 0,
      speed: 1,
      speedOptions: [0.5, 1, 2, 4],
      fileName: '',
      error: '',
      loadReplayFile: vi.fn().mockResolvedValue(true),
      pauseReplay: vi.fn(),
      resumeReplay: vi.fn(),
      restartReplay: vi.fn(),
      clearReplay: vi.fn(),
      setReplaySpeed: vi.fn(),
    },
    error: '',
    ...overrides,
  };
}

function renderDiagnostics(initialEntry = '/diagnostics') {
  return render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <Diagnostics />
    </MemoryRouter>
  );
}

describe('Diagnostics', () => {
  beforeEach(() => {
    mockUseFieldMonitorLiveData.mockReturnValue(createHookState());
  });

  it('sets the document title for the diagnostics page', () => {
    renderDiagnostics();

    expect(document.title).toBe('Diagnostics - FIRST Field Monitor');
  });

  it('renders the simplified diagnostics top bar and forwards layout params from the query string', () => {
    renderDiagnostics('/diagnostics?mirror=true&reverseBlueTeams=true');
    const topbar = screen.getByTestId('diagnostics-topbar');

    expect(topbar).toBeInTheDocument();
    expect(within(topbar).getByText('Match State')).toBeInTheDocument();
    expect(within(topbar).getByText('Schedule')).toBeInTheDocument();
    expect(within(topbar).getByText('Cycle')).toBeInTheDocument();
    expect(within(topbar).getByText('M42')).toBeInTheDocument();
    expect(within(topbar).getByText('Teleop')).toBeInTheDocument();
    expect(within(topbar).getByText('On schedule')).toBeInTheDocument();
    expect(within(topbar).getByText('Waiting for next start')).toBeInTheDocument();
    expect(screen.getAllByTestId('diagnostics-card')).toHaveLength(2);
    expect(screen.getAllByTestId('diagnostics-team-number')).toHaveLength(2);
    expect(screen.getByText('1114')).toBeInTheDocument();
    expect(screen.getByText('254')).toBeInTheDocument();
    expect(mockUseFieldMonitorLiveData).toHaveBeenCalledWith({ mirrorLayout: true, reverseBlueTeams: true });
  });

  it('renders readable one-column team cards with grouped diagnostics sections', () => {
    renderDiagnostics();
    fireEvent.click(screen.getByTestId('diagnostics-collapse-toggle'));

    expect(screen.getAllByText('Robot State').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Status').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Network').length).toBeGreaterThan(0);
    expect(screen.getAllByTestId('diagnostics-ds-tile')[0]).toHaveTextContent('Connected');
    expect(screen.getAllByTestId('diagnostics-radio-tile')[0]).toHaveTextContent('2 BARS');
    expect(screen.queryByTestId('diagnostics-bandwidth-tile')).not.toBeInTheDocument();
    expect(screen.getAllByTestId('diagnostics-battery-tile')[0]).toHaveTextContent('Min 12.1');
    expect(screen.getAllByText('Signal').length).toBeGreaterThan(0);
    expect(screen.getAllByText('00:80:2f:37:31:01').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Conn').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Monitor').length).toBeGreaterThan(0);
  });

  it('shows placeholder copy when no team is assigned', () => {
    mockUseFieldMonitorLiveData.mockReturnValue(
      createHookState({
        diagnosticsPanels: [
          { alliance: 'blue', title: 'Blue Alliance', rows: [createDiagnosticsRow({ team: '----' })] },
          { alliance: 'red', title: 'Red Alliance', rows: [createDiagnosticsRow()] },
        ],
      })
    );
    renderDiagnostics();

    expect(screen.getByText('No team assigned for this station yet.')).toBeInTheDocument();
    expect(screen.getAllByTestId('diagnostics-team-number')[0]).toHaveTextContent('Unassigned');
  });
});
