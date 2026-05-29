import React from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useFieldMonitorLiveData } from '../lib/fieldMonitorLive';
import usePageTitle from '../lib/usePageTitle';

export default function Config() {
  usePageTitle('Config');

  const [searchParams] = useSearchParams();
  const [recordingLabel, setRecordingLabel] = React.useState('');
  const mirrorLayout = searchParams.get('mirror') === 'true';
  const reverseBlueTeams = searchParams.get('reverseBlueTeams') === 'true';
  const { sourceMode, alliancePanels, matchStatus, scheduleStatus, error, isConnected, hasLiveData, recorder, replay } =
    useFieldMonitorLiveData({
      mirrorLayout,
      reverseBlueTeams,
    });
  const fieldMonitorParams = new URLSearchParams({
    mirror: String(mirrorLayout),
    reverseBlueTeams: String(reverseBlueTeams),
  });


  return (
    <div className="min-h-screen bg-zinc-100 p-6 text-zinc-900">
      <div className="mx-auto max-w-[1800px]">
        <div className="mb-6">
          <h1 className="text-2xl font-semibold tracking-tight">FIRST Field Monitor Config</h1>
          <p className="mt-1 text-sm text-zinc-600">
            {sourceMode === 'replay'
              ? 'A saved match recording is driving the configuration preview below. The layout side order follows the `mirror` query param, and the blue station order follows `reverseBlueTeams`.'
              : 'Live FMS data is driving the configuration preview below. The layout side order follows the `mirror` query param, and the blue station order follows `reverseBlueTeams`.'}
          </p>
        </div>

        <div className="mb-6 grid gap-3 lg:grid-cols-[auto_auto_1fr]">
          <div className="rounded-xl bg-white px-4 py-3 shadow-sm ring-1 ring-zinc-200">
            <div className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Connection</div>
            <div className={`mt-1 text-sm font-semibold ${isConnected ? 'text-emerald-700' : 'text-amber-700'}`}>
              {sourceMode === 'replay'
                ? replay.isPlaying
                  ? 'Replay playing'
                  : 'Replay paused'
                : isConnected
                  ? 'Live feed connected'
                  : 'Connecting to live feed'}
            </div>
          </div>
          <div className="rounded-xl bg-white px-4 py-3 shadow-sm ring-1 ring-zinc-200">
            <div className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Match</div>
            <div className="mt-1 text-sm font-semibold text-zinc-900">
              {matchStatus.matchNumber > 0 ? `M${matchStatus.matchNumber}` : 'No match yet'}
              {` · ${scheduleStatus}`}
            </div>
            <div className="mt-1 text-sm text-zinc-600">{matchStatus.matchStateMessage}</div>
          </div>
          <div className="rounded-xl bg-white px-4 py-3 shadow-sm ring-1 ring-zinc-200">
            <div className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Feed Notes</div>
            <div className="mt-1 text-sm text-zinc-700">
              {sourceMode === 'replay'
                ? replay.error
                  ? replay.error
                  : replay.fileName
                    ? `Rendering from ${replay.fileName} at ${replay.speed}x speed.`
                    : 'Replay mode is ready for a recording file.'
                : error
                  ? error
                  : hasLiveData
                    ? 'SignalR station updates are active and the configuration preview is rendering live rows.'
                    : 'Waiting for the first station payload from the field monitor hubs.'}
            </div>
          </div>
        </div>

        <div className="mb-6 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-zinc-200">
          <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_auto]">
            <div className="min-w-0">
              <div className="text-sm font-semibold text-zinc-900">Recorder and replay</div>
              <div className="mt-1 text-sm text-zinc-600">
                Capture live SignalR traffic as JSON, then load that file back in to replay the match offline through the same UI.
              </div>
              <div className="mt-2 text-xs text-zinc-500">
                {sourceMode === 'replay'
                  ? replay.fileName
                    ? `Replay loaded from ${replay.fileName} with ${replay.eventCount} events.`
                    : 'Load a saved recording to enter replay mode.'
                  : recorder.isRecording
                    ? `Recording ${recorder.eventCount} events${recorder.startedAtIso ? ` since ${new Date(recorder.startedAtIso).toLocaleTimeString()}` : ''}.`
                    : recorder.lastDownloadName
                      ? `Last saved ${recorder.lastEventCount} events to ${recorder.lastDownloadName}.`
                      : 'Ready to capture a live match.'}
              </div>
            </div>

            <div className="flex flex-col gap-3">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                <label className="inline-flex cursor-pointer items-center justify-center rounded-xl border border-zinc-300 px-4 py-2 text-sm font-semibold text-zinc-700 transition hover:border-blue-500 hover:text-blue-700">
                  Load replay JSON
                  <input
                    type="file"
                    accept="application/json,.json"
                    className="hidden"
                    onChange={async (event) => {
                      const file = event.target.files?.[0];
                      if (file) {
                        await replay.loadReplayFile(file);
                      }
                      event.target.value = '';
                    }}
                  />
                </label>

                {sourceMode === 'replay' ? (
                  <>
                    <button
                      type="button"
                      onClick={() => (replay.isPlaying ? replay.pauseReplay() : replay.resumeReplay())}
                      className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700"
                    >
                      {replay.isPlaying ? 'Pause replay' : 'Resume replay'}
                    </button>
                    <button
                      type="button"
                      onClick={() => replay.restartReplay()}
                      className="rounded-xl bg-zinc-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-zinc-800"
                    >
                      Restart replay
                    </button>
                    <button
                      type="button"
                      onClick={() => replay.clearReplay()}
                      className="rounded-xl bg-white px-4 py-2 text-sm font-semibold text-zinc-700 ring-1 ring-zinc-300 transition hover:bg-zinc-50"
                    >
                      Return to live
                    </button>
                    <select
                      value={String(replay.speed)}
                      onChange={(event) => replay.setReplaySpeed(Number(event.target.value))}
                      className="rounded-xl border border-zinc-300 px-3 py-2 text-sm text-zinc-900 outline-none focus:border-blue-500"
                    >
                      {replay.speedOptions.map((speed) => (
                        <option key={speed} value={speed}>
                          {speed}x
                        </option>
                      ))}
                    </select>
                  </>
                ) : null}
              </div>

              {sourceMode === 'live' ? (
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                  <input
                    type="text"
                    value={recordingLabel}
                    onChange={(event) => setRecordingLabel(event.target.value)}
                    disabled={recorder.isRecording}
                    placeholder="Optional label, e.g. qm-42"
                    className="w-full rounded-xl border border-zinc-300 px-3 py-2 text-sm text-zinc-900 outline-none placeholder:text-zinc-400 focus:border-blue-500 sm:w-64"
                  />
                  {recorder.isRecording ? (
                    <button
                      type="button"
                      onClick={() => recorder.stopRecordingAndDownload()}
                      className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-700"
                    >
                      Stop and download
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => recorder.startRecording(recordingLabel)}
                      className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700"
                    >
                      Start recording
                    </button>
                  )}
                </div>
              ) : (
                <div className="text-xs text-zinc-500">
                  Replay time {Math.round(replay.currentTimeMs / 100) / 10}s / {Math.round(replay.durationMs / 100) / 10}s
                </div>
              )}
            </div>
          </div>
        </div>

        {sourceMode === 'replay' ? (
          <div className="mb-6 rounded-xl bg-blue-50 px-4 py-3 text-sm text-blue-900 ring-1 ring-blue-200">
            Live SignalR is disconnected while replay mode is active. Use `Return to live` to reconnect to the field.
          </div>
        ) : null}

        <div className="mt-8 rounded-xl bg-white px-4 py-3 shadow-sm ring-1 ring-zinc-200">
          <Link
            to={`/?${fieldMonitorParams.toString()}`}
            className="text-sm font-semibold text-blue-600 hover:text-blue-800 hover:underline"
          >
            Open default field monitor →
          </Link>
          <div className="mt-1 text-sm text-zinc-600">
            Refined for 6 teams on fullscreen 16:9 or 4:3 using the same live field data feed.
          </div>
        </div>

        <div className="mt-8 rounded-2xl bg-white p-5 text-sm text-zinc-700 shadow-sm ring-1 ring-zinc-200">
          <div className="font-semibold text-zinc-900">Live mapping notes</div>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            <li>`TEAM MISMATCH` and `MOVE TO ...` rows are driven from live station status values.</li>
            <li>DS, Radio, and RIO states are inferred from the same connection flags used by the live Angular field monitor.</li>
            <li>Battery minimum is tracked over time per station while the hubs stay connected.</li>
            <li>Severity bands are derived from live connection quality, battery, bandwidth, trip time, and packet loss.</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
