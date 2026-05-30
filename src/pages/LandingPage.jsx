import { Link } from 'react-router-dom';
import TeamStatusCard from '../components/TeamStatusCard';
import usePageTitle from '../lib/usePageTitle';

function createRow(overrides = {}) {
  return {
    team: '254',
    station: 'Stn 1',
    mode: 'normal',
    status: { label: 'Teleop Enabled', shortLabel: 'TELEOP', tone: 'tele' },
    isPostMatchMuted: false,
    ds: { label: 'DS', state: 'good', detail: 'Connected' },
    radio: { label: 'Radio', state: 'good', detail: '4 bars', bars: 4, connectedToAp: true, linkActive: true },
    rio: { label: 'RIO', state: 'good', detail: 'Connected' },
    battery: { value: '12.4V', min: '12.1', tone: 'normal', action: '', detail: 'Stable' },
    bwu: { value: '4.8 Mbps', tx: '1.9', rx: '2.9' },
    trip: '7 ms',
    pkts: '1',
    blockingText: '',
    ...overrides,
  };
}

const heroRows = [
  {
    alliance: 'red',
    row: createRow({
      team: '1678',
      station: 'Stn 2',
      mode: 'degraded',
      ds: { label: 'DS', state: 'warn', detail: 'Intermittent' },
      radio: { label: 'Radio', state: 'good', detail: '4 bars', bars: 4, connectedToAp: true, linkActive: true },
      rio: { label: 'RIO', state: 'good', detail: 'Connected' },
      battery: { value: '11.7V', min: '10.9', tone: 'warn', action: 'WATCH', detail: 'Recovering' },
      bwu: { value: '5.4 Mbps', tx: '2.1', rx: '3.3' },
      trip: '18 ms',
      pkts: '9',
    }),
  },
  {
    alliance: 'blue',
    row: createRow({
      team: '4414',
      station: 'Stn 1',
      mode: 'degraded',
      status: { label: 'Teleop Enabled', shortLabel: 'TELEOP', tone: 'tele' },
      radio: { label: 'Radio', state: 'bad', detail: '0 bars', bars: 0, connectedToAp: false, linkActive: false },
      rio: { label: 'RIO', state: 'bad', detail: 'Disconnected' },
      battery: { value: '6.8V', min: '6.4', tone: 'warn', action: 'BROWNOUT', detail: 'Unsafe' },
      bwu: { value: '2.7 Mbps', tx: '1.1', rx: '1.6' },
      trip: '65 ms',
      pkts: '74',
    }),
  },
];

const valuePillars = [
  {
    title: 'See the whole field at a glance',
    body:
      'A live six-station view keeps red and blue alliances in one place, so staff can spot which team, which station, and which issue needs attention first.',
  },
  {
    title: 'Triage the right layer faster',
    body:
      'The DS, Radio, and RIO chain is separated from robot mode and performance metrics, helping FTAs diagnose the failure layer before the next cycle starts.',
  },
  {
    title: 'Train and review without a live field',
    body:
      'Record hub traffic to JSON, replay the same UI offline, and use real incidents for staff training, demos, and post-event review.',
  },
];

const fieldScenarios = [
  {
    title: 'Pinpoint station-level trouble',
    body:
      'Wrong station, team mismatch, or blocking assignment states jump to the foreground instead of getting buried in a wall of telemetry.',
  },
  {
    title: 'Catch battery and bandwidth risk early',
    body:
      'Battery minimums, bandwidth utilization, trip time, and packet loss stay visible enough to surface risk before it becomes a field interruption.',
  },
  {
    title: 'Keep healthy rows calm',
    body:
      'Normal teams stay visually quiet, which makes warnings, critical states, and stop conditions stand out under match pressure.',
  },
  {
    title: 'Support staff on either side of the field',
    body:
      'The mirrored layout option helps preserve orientation when the screen is being viewed from the opposite side of the driver station wall.',
  },
];

const replaySteps = [
  'Capture live SignalR traffic from the field into a JSON recording.',
  'Load the saved file back into the same interface for offline playback.',
  'Pause, resume, restart, and adjust speed to walk volunteers through what happened.',
];

function SectionHeading({ eyebrow, title, body, align = 'left' }) {
  const alignmentClass = align === 'center' ? 'text-center' : 'text-left';

  return (
    <div className={alignmentClass}>
      <p className="text-sm font-semibold uppercase tracking-[0.26em] text-blue-600">{eyebrow}</p>
      <h2 className="mt-3 text-3xl font-semibold tracking-tight text-zinc-950 sm:text-4xl">{title}</h2>
      <p className="mt-4 text-base leading-7 text-zinc-600 sm:text-lg">{body}</p>
    </div>
  );
}

export default function LandingPage() {
  usePageTitle('Welcome');

  return (
    <div className="min-h-screen bg-zinc-100 text-zinc-900">
      <section className="overflow-hidden bg-zinc-950 text-white">
        <div className="mx-auto max-w-[1400px] px-4 py-6 sm:px-6 lg:px-8">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <div className="text-xs font-semibold uppercase tracking-[0.28em] text-blue-200">FIRST Field Monitor</div>
              <div className="mt-1 text-sm text-zinc-300">Built for FTAs and FIRST field operations</div>
            </div>

            <div className="flex flex-wrap gap-3 text-sm font-semibold">
              <Link
                to="/showcase"
                className="rounded-xl border border-white/15 px-4 py-2 text-white transition hover:border-white/30 hover:bg-white/5"
              >
                View product states
              </Link>
              <Link
                to="/"
                className="rounded-xl bg-white px-4 py-2 text-zinc-950 transition hover:bg-zinc-200"
              >
                Open live monitor
              </Link>
            </div>
          </div>

          <div className="mt-12 grid gap-10 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)] lg:items-center">
            <div className="max-w-2xl">
              <div className="inline-flex rounded-full border border-blue-400/25 bg-blue-400/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.24em] text-blue-100">
                Real-time field awareness
              </div>
              <h1 className="mt-6 text-4xl font-semibold tracking-tight text-white sm:text-5xl lg:text-6xl">
                See the whole field. Catch issues before they cost a match.
              </h1>
              <p className="mt-6 text-lg leading-8 text-zinc-300">
                FIRST Field Monitor gives FTAs and FIRST staff a live, fullscreen view of every station so the
                team, the station, and the failure layer are obvious in seconds, not after the timeout has already
                started.
              </p>
              <p className="mt-4 text-lg leading-8 text-zinc-300">
                It turns FMS-aligned data into a glanceable operations display built for match pressure, volunteer
                coordination, and faster decisions on the field.
              </p>

              <div className="mt-8 flex flex-wrap gap-3 text-sm font-semibold sm:text-base">
                <Link
                  to="/"
                  className="rounded-2xl bg-blue-500 px-5 py-3 text-white transition hover:bg-blue-400"
                >
                  Launch the live monitor
                </Link>
                <Link
                  to="/config"
                  className="rounded-2xl border border-white/15 px-5 py-3 text-white transition hover:border-white/30 hover:bg-white/5"
                >
                  Explore config and replay
                </Link>
              </div>

              <div className="mt-10 grid gap-4 sm:grid-cols-3">
                <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-4">
                  <div className="text-2xl font-semibold text-white">6 stations</div>
                  <div className="mt-1 text-sm text-zinc-300">Red and blue alliances in one operational view.</div>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-4">
                  <div className="text-2xl font-semibold text-white">DS → Radio → RIO</div>
                  <div className="mt-1 text-sm text-zinc-300">A clearer chain for faster field-side triage.</div>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-4">
                  <div className="text-2xl font-semibold text-white">Record + replay</div>
                  <div className="mt-1 text-sm text-zinc-300">Train crews and review incidents off-field.</div>
                </div>
              </div>
            </div>

            <div className="relative">
              <div className="absolute inset-0 rounded-[32px] bg-gradient-to-br from-red-500/20 via-blue-500/10 to-transparent blur-3xl" />
              <div className="relative rounded-[32px] border border-white/10 bg-white/5 p-3 shadow-2xl backdrop-blur-sm sm:p-4">
                <div className="rounded-[28px] border border-white/10 bg-zinc-900/80 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-white/5 px-4 py-3 text-sm text-zinc-300 ring-1 ring-white/10">
                    <div>
                      <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-zinc-400">
                        Match status
                      </div>
                      <div className="mt-1 text-base font-semibold text-white">Qualification 42 · Teleop Enabled</div>
                    </div>
                    <div className="rounded-full bg-emerald-500/15 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-emerald-100 ring-1 ring-emerald-300/20">
                      Schedule on pace
                    </div>
                  </div>

                  <div className="mt-4 space-y-4">
                    {heroRows.map((item) => (
                      <TeamStatusCard key={`${item.alliance}-${item.row.team}-${item.row.station}`} alliance={item.alliance} row={item.row} />
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-[1400px] px-4 py-20 sm:px-6 lg:px-8">
        <SectionHeading
          eyebrow="Why teams need this"
          title="Built for the tempo of real field operations"
          body="This is not a generic analytics dashboard. It is an operational screen designed to reduce hesitation, surface action items quickly, and help staff coordinate around the same live picture."
        />

        <div className="mt-10 grid gap-6 lg:grid-cols-3">
          {valuePillars.map((pillar) => (
            <article key={pillar.title} className="rounded-[28px] bg-white p-6 shadow-sm ring-1 ring-zinc-200">
              <div className="inline-flex rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-blue-700 ring-1 ring-blue-200">
                Value
              </div>
              <h3 className="mt-4 text-2xl font-semibold tracking-tight text-zinc-950">{pillar.title}</h3>
              <p className="mt-3 text-base leading-7 text-zinc-600">{pillar.body}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="border-y border-zinc-200 bg-white">
        <div className="mx-auto grid max-w-[1400px] gap-10 px-4 py-20 sm:px-6 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)] lg:px-8 lg:items-start">
          <SectionHeading
            eyebrow="On-field clarity"
            title="Know what matters before anyone has to ask"
            body="FIRST Field Monitor makes healthy rows feel quiet and exceptions feel immediate, which helps staff recognize operational risk without overreacting to normal match noise."
          />

          <div className="grid gap-5 sm:grid-cols-2">
            {fieldScenarios.map((scenario) => (
              <article key={scenario.title} className="rounded-[24px] bg-zinc-50 px-5 py-5 ring-1 ring-zinc-200">
                <h3 className="text-xl font-semibold tracking-tight text-zinc-950">{scenario.title}</h3>
                <p className="mt-3 text-sm leading-7 text-zinc-600 sm:text-base">{scenario.body}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-[1400px] px-4 py-20 sm:px-6 lg:px-8">
        <div className="grid gap-6 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
          <div className="rounded-[32px] bg-zinc-950 px-6 py-8 text-white shadow-sm">
            <p className="text-sm font-semibold uppercase tracking-[0.26em] text-blue-200">Replay and training</p>
            <h2 className="mt-4 text-3xl font-semibold tracking-tight sm:text-4xl">
              Use real field behavior to train staff before the next event day.
            </h2>
            <p className="mt-4 text-base leading-7 text-zinc-300 sm:text-lg">
              The same interface that supports live monitoring can capture and replay field data, making it easier to
              teach volunteers what good, degraded, and critical states actually look like.
            </p>
            <div className="mt-8 rounded-[24px] border border-white/10 bg-white/5 p-5">
              <div className="text-sm font-semibold uppercase tracking-[0.2em] text-zinc-400">Best fit</div>
              <div className="mt-3 space-y-3 text-sm leading-7 text-zinc-300 sm:text-base">
                <p>Volunteer onboarding before competition begins.</p>
                <p>Post-incident review after unusual field behavior.</p>
                <p>Internal demos without requiring a live field connection.</p>
              </div>
            </div>
          </div>

          <div className="rounded-[32px] bg-white p-6 shadow-sm ring-1 ring-zinc-200">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.22em] text-zinc-500">How it works</p>
                <h3 className="mt-2 text-2xl font-semibold tracking-tight text-zinc-950">A simple workflow for live ops and offline review</h3>
              </div>
              <Link
                to="/config"
                className="rounded-xl bg-zinc-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-zinc-800"
              >
                Open replay controls
              </Link>
            </div>

            <div className="mt-8 space-y-4">
              {replaySteps.map((step, index) => (
                <div key={step} className="flex gap-4 rounded-2xl bg-zinc-50 px-4 py-4 ring-1 ring-zinc-200">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-600 text-sm font-bold text-white">
                    {index + 1}
                  </div>
                  <p className="text-sm leading-7 text-zinc-700 sm:text-base">{step}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="pb-20">
        <div className="mx-auto max-w-[1400px] px-4 sm:px-6 lg:px-8">
          <div className="rounded-[36px] bg-gradient-to-r from-zinc-950 via-zinc-900 to-blue-950 px-6 py-10 text-white shadow-2xl sm:px-8">
            <div className="max-w-3xl">
              <p className="text-sm font-semibold uppercase tracking-[0.28em] text-blue-200">Ready to evaluate</p>
              <h2 className="mt-4 text-3xl font-semibold tracking-tight sm:text-5xl">
                Give your field crew a clearer picture before the next issue becomes a delay.
              </h2>
              <p className="mt-4 text-base leading-7 text-zinc-300 sm:text-lg">
                Open the live monitor, review the card states, or step through replay mode to see how FIRST Field
                Monitor supports faster decisions on the field.
              </p>
            </div>

            <div className="mt-8 flex flex-wrap gap-3 text-sm font-semibold sm:text-base">
              <Link
                to="/"
                className="rounded-2xl bg-white px-5 py-3 text-zinc-950 transition hover:bg-zinc-200"
              >
                Open live monitor
              </Link>
              <Link
                to="/showcase"
                className="rounded-2xl border border-white/15 px-5 py-3 text-white transition hover:border-white/30 hover:bg-white/5"
              >
                Review showcase states
              </Link>
              <Link
                to="/config"
                className="rounded-2xl border border-white/15 px-5 py-3 text-white transition hover:border-white/30 hover:bg-white/5"
              >
                Explore config and replay
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
