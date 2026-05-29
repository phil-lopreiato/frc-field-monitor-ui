import { MemoryRouter } from 'react-router-dom';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import Config from './config';
import { useFieldMonitorLiveData } from '../lib/fieldMonitorLive';

vi.mock('../lib/fieldMonitorLive', () => ({
  useFieldMonitorLiveData: vi.fn(),
}));

const mockUseFieldMonitorLiveData = vi.mocked(useFieldMonitorLiveData);

function createHookState(overrides = {}) {
  const recorder = {
    isRecording: false,
    eventCount: 0,
    startedAtIso: '',
    lastDownloadName: '',
    lastEventCount: 0,
    startRecording: vi.fn(),
    stopRecordingAndDownload: vi.fn(),
  };

  const replay = {
    isReplayMode: false,
    isPlaying: false,
    currentTimeMs: 0,
    durationMs: 0,
    eventCount: 0,
    speed: 1,
    speedOptions: [0.5, 1, 2],
    fileName: '',
    error: '',
    loadReplayFile: vi.fn().mockResolvedValue(true),
    pauseReplay: vi.fn(),
    resumeReplay: vi.fn(),
    restartReplay: vi.fn(),
    clearReplay: vi.fn(),
    setReplaySpeed: vi.fn(),
  };

  const nextRecorder = {
    ...recorder,
    ...(overrides.recorder || {}),
  };
  const nextReplay = {
    ...replay,
    ...(overrides.replay || {}),
  };

  return {
    sourceMode: 'live',
    alliancePanels: [
      { alliance: 'blue', title: 'Blue Alliance', rows: [] },
      { alliance: 'red', title: 'Red Alliance', rows: [] },
    ],
    matchStatus: {
      matchNumber: 42,
      matchStateMessage: 'Teleop',
    },
    scheduleStatus: 'On schedule',
    error: '',
    isConnected: true,
    hasLiveData: true,
    ...overrides,
    recorder: nextRecorder,
    replay: nextReplay,
  };
}

function renderConfig(initialEntry = '/config') {
  return render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <Config />
    </MemoryRouter>
  );
}

describe('Config', () => {
  beforeEach(() => {
    mockUseFieldMonitorLiveData.mockReturnValue(createHookState());
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('sets the document title for the config page', () => {
    renderConfig('/config');

    expect(document.title).toBe('Config - FIRST Field Monitor');
  });

  it('passes layout params to the hook and preserves them in the field monitor link', () => {
    renderConfig('/config?mirror=true&reverseBlueTeams=true');

    expect(mockUseFieldMonitorLiveData).toHaveBeenCalledWith({ mirrorLayout: true, reverseBlueTeams: true });
    expect(screen.getByRole('link', { name: /open default field monitor/i })).toHaveAttribute(
      'href',
      '/?mirror=true&reverseBlueTeams=true'
    );
  });

  it('starts a recording with the entered label in live mode', async () => {
    const user = userEvent.setup();
    const startRecording = vi.fn();

    mockUseFieldMonitorLiveData.mockReturnValue(
      createHookState({
        recorder: {
          startRecording,
        },
      })
    );

    renderConfig('/config');

    await user.type(screen.getByPlaceholderText(/optional label/i), 'qm-42');
    await user.click(screen.getByRole('button', { name: 'Start recording' }));

    expect(startRecording).toHaveBeenCalledWith('qm-42');
  });

  it('stops an active recording from the config controls', async () => {
    const user = userEvent.setup();
    const stopRecordingAndDownload = vi.fn();

    mockUseFieldMonitorLiveData.mockReturnValue(
      createHookState({
        recorder: {
          isRecording: true,
          eventCount: 3,
          startedAtIso: '2024-01-02T03:04:05.000Z',
          stopRecordingAndDownload,
        },
      })
    );

    renderConfig('/config');

    await user.click(screen.getByRole('button', { name: 'Stop and download' }));

    expect(stopRecordingAndDownload).toHaveBeenCalledTimes(1);
  });

  it('loads replay files and surfaces replay controls when replay mode is active', async () => {
    const user = userEvent.setup();
    const loadReplayFile = vi.fn().mockResolvedValue(true);
    const resumeReplay = vi.fn();
    const restartReplay = vi.fn();
    const clearReplay = vi.fn();
    const setReplaySpeed = vi.fn();

    mockUseFieldMonitorLiveData.mockReturnValue(
      createHookState({
        sourceMode: 'replay',
        isConnected: false,
        hasLiveData: false,
        replay: {
          isReplayMode: true,
          isPlaying: false,
          currentTimeMs: 1200,
          durationMs: 3500,
          eventCount: 7,
          speed: 1,
          fileName: 'match.json',
          loadReplayFile,
          resumeReplay,
          restartReplay,
          clearReplay,
          setReplaySpeed,
        },
      })
    );

    const { container } = renderConfig('/config');
    const fileInput = container.querySelector('input[type="file"]');
    const replayFile = new File(['{}'], 'match.json', { type: 'application/json' });

    fireEvent.change(fileInput, {
      target: { files: [replayFile] },
    });

    await waitFor(() => {
      expect(loadReplayFile).toHaveBeenCalledWith(replayFile);
    });

    await user.click(screen.getByRole('button', { name: 'Resume replay' }));
    await user.click(screen.getByRole('button', { name: 'Restart replay' }));
    await user.click(screen.getByRole('button', { name: 'Return to live' }));
    await user.selectOptions(screen.getByRole('combobox'), '2');

    expect(screen.getByText(/Live SignalR is disconnected while replay mode is active/i)).toBeInTheDocument();
    expect(resumeReplay).toHaveBeenCalledTimes(1);
    expect(restartReplay).toHaveBeenCalledTimes(1);
    expect(clearReplay).toHaveBeenCalledTimes(1);
    expect(setReplaySpeed).toHaveBeenCalledWith(2);
  });
});
