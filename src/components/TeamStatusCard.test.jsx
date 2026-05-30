import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import TeamStatusCard from './TeamStatusCard';

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
    hasCriticalConnection: false,
    disconnectedSinceMs: null,
    history: { battery: [], bandwidth: [], trip: [] },
    ...overrides,
  };
}

describe('TeamStatusCard', () => {
  it('renders radio bars from explicit row data instead of parsing the detail string', () => {
    render(
      <TeamStatusCard
        alliance="red"
        row={createRow({
          radio: {
            label: 'Radio',
            state: 'good',
            detail: '0 bars',
            bars: 4,
            connectedToAp: true,
            linkActive: true,
          },
        })}
      />
    );

    expect(screen.queryByText('OUT')).not.toBeInTheDocument();
    expect(screen.queryByText('LINK')).not.toBeInTheDocument();
  });

  it('keeps connection tiles label-free when the explicit radio bar count is zero', () => {
    render(
      <TeamStatusCard
        alliance="blue"
        row={createRow({
          radio: {
            label: 'Radio',
            state: 'bad',
            detail: '4 bars',
            bars: 0,
            connectedToAp: false,
            linkActive: false,
          },
        })}
      />
    );

    expect(screen.queryByText('OUT')).not.toBeInTheDocument();
    expect(screen.queryByText('LINK')).not.toBeInTheDocument();
  });

  it('keeps the radio cell neutral when low signal is the only warning', () => {
    render(
      <TeamStatusCard
        alliance="blue"
        row={createRow({
          mode: 'degraded',
          radio: {
            label: 'Radio',
            state: 'warn',
            detail: '2 bars',
            bars: 2,
            connectedToAp: true,
            linkActive: true,
          },
        })}
      />
    );

    const radioChip = screen.getAllByTestId('mobile-connection-chip')[1];

    expect(radioChip).toHaveClass('border-zinc-300', 'bg-white', 'text-zinc-900');
    expect(radioChip).not.toHaveClass('border-amber-500', 'bg-amber-100', 'text-amber-950');
  });

  it('keeps the yellow radio cell for connection path warnings', () => {
    render(
      <TeamStatusCard
        alliance="blue"
        row={createRow({
          mode: 'degraded',
          radio: {
            label: 'Radio',
            state: 'warn',
            detail: '4 bars',
            bars: 4,
            connectedToAp: true,
            linkActive: false,
          },
        })}
      />
    );

    const radioChip = screen.getAllByTestId('mobile-connection-chip')[1];

    expect(radioChip).toHaveClass('border-amber-500', 'bg-amber-100', 'text-amber-950');
  });

  it('keeps bypass affordances emphasized while muting the connection and footer sections', () => {
    render(
      <TeamStatusCard
        alliance="red"
        row={createRow({
          mode: 'bypassed',
          status: { label: 'BYPASSED', shortLabel: 'BYPASS', tone: 'danger' },
        })}
      />
    );

    expect(screen.queryByTestId('issue-band')).not.toBeInTheDocument();
    expect(screen.getAllByText('BYPASS')).toHaveLength(1);
    expect(screen.queryByText('BYPASSED')).not.toBeInTheDocument();
    expect(screen.getByTestId('row-header-primary')).not.toHaveClass('opacity-60');

    const contentSection = screen.getByTestId('mobile-connection-layout').parentElement;
    const footerSection = screen.getByTestId('mobile-footer-summary').parentElement;

    expect(contentSection).toHaveClass('opacity-60');
    expect(footerSection).toHaveClass('opacity-70');
  });

  it('keeps e-stop affordances visible while muting the connection and footer sections', () => {
    render(
      <TeamStatusCard
        alliance="red"
        row={createRow({
          mode: 'estopped',
          status: { label: 'E-STOPPED', shortLabel: 'E-STOP', tone: 'danger' },
        })}
      />
    );

    expect(screen.queryByTestId('issue-band')).not.toBeInTheDocument();
    expect(screen.getAllByText('E-STOP')).toHaveLength(2);
    expect(screen.getByTestId('row-header-primary')).not.toHaveClass('opacity-60');

    const contentSection = screen.getByTestId('mobile-connection-layout').parentElement;
    const footerSection = screen.getByTestId('mobile-footer-summary').parentElement;

    expect(contentSection).toHaveClass('opacity-60');
    expect(footerSection).toHaveClass('opacity-70');
  });

  it('does not highlight the battery tile for a-stop rows unless the battery itself is warned', () => {
    render(
      <TeamStatusCard
        alliance="blue"
        row={createRow({
          mode: 'astopped',
          status: { label: 'A-STOPPED', shortLabel: 'A-STOP', tone: 'warn' },
          battery: { value: '12.4V', min: '12.1', tone: 'normal', action: '', detail: 'Stable' },
        })}
      />
    );

    const batteryTile = screen.getByTestId('mobile-footer-summary').firstElementChild;

    expect(batteryTile).toHaveClass('bg-white/80');
    expect(batteryTile).not.toHaveClass('ring-2', 'ring-amber-300', 'ring-amber-400');
  });

  it('shows a disconnect timer next to the critical badge only for armed critical connection loss', () => {
    render(
      <TeamStatusCard
        alliance="red"
        currentTimeMs={75_000}
        row={createRow({
          mode: 'critical',
          hasCriticalConnection: true,
          disconnectedSinceMs: 10_000,
        })}
      />
    );

    expect(screen.getByTestId('disconnect-timer-badge')).toHaveTextContent('1:05');
  });

  it('keeps the disconnect timer hidden for non-connection critical rows', () => {
    render(
      <TeamStatusCard
        alliance="blue"
        currentTimeMs={75_000}
        row={createRow({
          mode: 'degraded',
          hasCriticalConnection: false,
          disconnectedSinceMs: 10_000,
          battery: { value: '6.8V', min: '6.4', tone: 'warn', action: 'BROWNOUT', detail: 'Unsafe' },
        })}
      />
    );

    expect(screen.queryByTestId('disconnect-timer-badge')).not.toBeInTheDocument();
  });
});
