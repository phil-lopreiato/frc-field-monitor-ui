import { Link } from 'react-router-dom';
import TeamStatusCard from '../components/TeamStatusCard';
import usePageTitle from '../lib/usePageTitle';

function generateSampleHistory(base, variance, length = 30) {
  return Array.from({ length }, () => base + (Math.random() - 0.5) * variance);
}

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
    history: {
      battery: generateSampleHistory(12.4, 0.6),
      bandwidth: generateSampleHistory(4.8, 2.0),
      trip: generateSampleHistory(7, 5),
    },
    ...overrides,
  };
}

const showcaseSections = [
  {
    title: 'Healthy States',
    subtitle: 'Baseline cards with clean connections and normal match flow.',
    cards: [
      {
        title: 'Teleop Ready',
        subtitle: 'A healthy teleop card with all three links up and steady metrics.',
        alliance: 'red',
        row: createRow({
          team: '254',
          station: 'Stn 1',
          status: { label: 'Teleop Enabled', shortLabel: 'TELEOP', tone: 'tele' },
        }),
      },
      {
        title: 'Autonomous Enabled',
        subtitle: 'The same healthy shell with the autonomous state pill.',
        alliance: 'blue',
        row: createRow({
          team: '1114',
          station: 'Stn 2',
          status: { label: 'Auto Enabled', shortLabel: 'AUTO', tone: 'auto' },
          bwu: { value: '5.2 Mbps', tx: '2.2', rx: '3.0' },
          trip: '6 ms',
        }),
      },
    ],
  },
  {
    title: 'Connection Warnings',
    subtitle: 'Cards that still render the full connection chain but surface warning emphasis.',
    cards: [
      {
        title: 'Driver Station Warning',
        subtitle: 'DS is degraded while the radio and RIO are still connected.',
        alliance: 'red',
        row: createRow({
          team: '1678',
          station: 'Stn 2',
          mode: 'degraded',
          ds: { label: 'DS', state: 'warn', detail: 'Intermittent' },
          radio: { label: 'Radio', state: 'good', detail: '4 bars', bars: 4, connectedToAp: true, linkActive: true },
          rio: { label: 'RIO', state: 'good', detail: 'Connected' },
          trip: '18 ms',
          pkts: '9',
        }),
      },
      {
        title: 'Low Radio Signal',
        subtitle: 'Radio quality is marginal, with reduced bars but no connection-path warning shell.',
        alliance: 'blue',
        row: createRow({
          team: '2056',
          station: 'Stn 3',
          mode: 'degraded',
          radio: { label: 'Radio', state: 'warn', detail: '2 bars', bars: 2, connectedToAp: true, linkActive: true },
          bwu: { value: '3.9 Mbps', tx: '1.5', rx: '2.4' },
          trip: '21 ms',
          pkts: '12',
        }),
      },
    ],
  },
  {
    title: 'Critical Conditions',
    subtitle: 'Hard failures and severe performance issues with stronger visual emphasis.',
    cards: [
      {
        title: 'Connection Loss',
        subtitle: 'A critical row where the robot-side links have dropped out.',
        alliance: 'red',
        row: createRow({
          team: '148',
          station: 'Stn 3',
          mode: 'critical',
          ds: { label: 'DS', state: 'good', detail: 'Connected' },
          radio: { label: 'Radio', state: 'bad', detail: '0 bars', bars: 0, connectedToAp: false, linkActive: false },
          rio: { label: 'RIO', state: 'bad', detail: 'Disconnected' },
          trip: '65 ms',
          pkts: '74',
        }),
      },
      {
        title: 'Brownout Risk',
        subtitle: 'A battery warning state with alert treatment in the footer.',
        alliance: 'blue',
        row: createRow({
          team: '4414',
          station: 'Stn 1',
          mode: 'degraded',
          battery: { value: '6.8V', min: '6.4', tone: 'warn', action: 'BROWNOUT', detail: 'Unsafe' },
          bwu: { value: '2.7 Mbps', tx: '1.1', rx: '1.6' },
          trip: '29 ms',
          pkts: '16',
        }),
      },
    ],
  },
  {
    title: 'Stops And Overrides',
    subtitle: 'Operational overrides that change the badge treatment or suppress portions of the card.',
    cards: [
      {
        title: 'Emergency Stop',
        subtitle: 'Referee or team E-stop with danger styling across the card.',
        alliance: 'red',
        row: createRow({
          team: '973',
          station: 'Stn 1',
          mode: 'estopped',
          status: { label: 'E-STOPPED', shortLabel: 'E-STOP', tone: 'danger' },
        }),
      },
      {
        title: 'Autonomous Stop',
        subtitle: 'Expected autonomous disable with warning treatment while keeping the battery tile neutral.',
        alliance: 'blue',
        row: createRow({
          team: '1323',
          station: 'Stn 2',
          mode: 'astopped',
          status: { label: 'A-STOPPED', shortLabel: 'A-STOP', tone: 'warn' },
          battery: { value: '11.9V', min: '11.2', tone: 'normal', action: '', detail: 'Stable' },
        }),
      },
      {
        title: 'Bypassed Station',
        subtitle: 'Bypass keeps the red stop styling but hides the match-state pill.',
        alliance: 'red',
        row: createRow({
          team: '118',
          station: 'Stn 3',
          mode: 'bypassed',
          status: { label: 'BYPASSED', shortLabel: 'BYPASS', tone: 'danger' },
        }),
      },
    ],
  },
  {
    title: 'Special Cases',
    subtitle: 'Non-standard card treatments that are useful during UI review and QA.',
    cards: [
      {
        title: 'Blocking Assignment',
        subtitle: 'A station-level blocking message replaces the connection and footer areas.',
        alliance: 'blue',
        row: createRow({
          team: '----',
          station: 'Stn 1',
          mode: 'blocking',
          blockingText: 'TEAM MISMATCH',
        }),
      },
      {
        title: 'Post-Match Muted',
        subtitle: 'Disconnects after the match remain visible, but the card is intentionally softened.',
        alliance: 'red',
        row: createRow({
          team: '604',
          station: 'Stn 2',
          isPostMatchMuted: true,
          ds: { label: 'DS', state: 'bad', detail: 'Disconnected' },
          radio: { label: 'Radio', state: 'bad', detail: '0 bars', bars: 0, connectedToAp: false, linkActive: false },
          rio: { label: 'RIO', state: 'bad', detail: 'Disconnected' },
          trip: '0 ms',
          pkts: '0',
        }),
      },
    ],
  },
];

function ExampleCard({ title, subtitle, alliance, row }) {
  const allianceBadgeClass =
    alliance === 'red'
      ? 'bg-red-50 text-red-800 ring-red-200'
      : 'bg-blue-50 text-blue-800 ring-blue-200';

  return (
    <article className="rounded-3xl bg-zinc-50/80 p-4 ring-1 ring-zinc-200">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-lg font-semibold tracking-tight text-zinc-900">{title}</h3>
          <p className="mt-1 max-w-2xl text-sm text-zinc-600">{subtitle}</p>
        </div>
        <div className={`inline-flex rounded-full px-3 py-1 text-xs font-bold uppercase tracking-[0.18em] ring-1 ${allianceBadgeClass}`}>
          {alliance} alliance
        </div>
      </div>

      <TeamStatusCard alliance={alliance} row={row} />
    </article>
  );
}

export default function TeamCardShowcase() {
  usePageTitle('Team Card Showcase');

  return (
    <div className="min-h-screen bg-zinc-100 text-zinc-900">
      <div className="mx-auto max-w-[1800px] px-4 py-6 sm:px-6 lg:px-8">
        <div className="rounded-[28px] bg-white px-6 py-6 shadow-sm ring-1 ring-zinc-200">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.22em] text-zinc-500">Static Reference</p>
              <h1 className="mt-2 text-3xl font-semibold tracking-tight text-zinc-950">Team Card Showcase</h1>
              <p className="mt-2 max-w-3xl text-sm text-zinc-600 sm:text-base">
                Static examples of every meaningful team card state for UI review. Use this page to compare
                severity modes, connection treatments, and footer behavior without waiting for live field data.
              </p>
            </div>

            <div className="flex flex-wrap gap-3 text-sm font-semibold">
              <Link
                to="/"
                className="rounded-xl bg-zinc-900 px-4 py-2 text-white transition hover:bg-zinc-800"
              >
                Open live monitor
              </Link>
              <Link
                to="/config"
                className="rounded-xl bg-white px-4 py-2 text-zinc-700 ring-1 ring-zinc-300 transition hover:bg-zinc-50"
              >
                Open config
              </Link>
            </div>
          </div>
        </div>

        <div className="mt-6 space-y-6">
          {showcaseSections.map((section) => (
            <section key={section.title} className="rounded-[28px] bg-white px-5 py-5 shadow-sm ring-1 ring-zinc-200 sm:px-6">
              <div className="mb-5">
                <h2 className="text-2xl font-semibold tracking-tight text-zinc-950">{section.title}</h2>
                <p className="mt-1 text-sm text-zinc-600 sm:text-base">{section.subtitle}</p>
              </div>

              <div className="grid gap-5 xl:grid-cols-2">
                {section.cards.map((card) => (
                  <ExampleCard key={card.title} {...card} />
                ))}
              </div>
            </section>
          ))}
        </div>
      </div>
    </div>
  );
}
