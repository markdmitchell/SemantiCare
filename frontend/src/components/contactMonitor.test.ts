import { afterEach, describe, expect, it, vi } from 'vitest';
import { startContactMonitor } from './contactMonitor';

afterEach(() => { vi.useRealTimers(); });

describe('shared contact monitoring', () => {
  it('stays quiet when both buttons render', () => {
    vi.useFakeTimers();
    const onStatus = vi.fn();
    const stop = startContactMonitor({ isRendered: () => true, onStatus, target: new EventTarget() });
    vi.advanceTimersByTime(20_000);
    expect(onStatus.mock.calls).toEqual([['ready']]);
    stop();
  });

  it('alerts after the render grace period and clears when rendering recovers', () => {
    vi.useFakeTimers();
    let rendered = false;
    const onStatus = vi.fn();
    const stop = startContactMonitor({ isRendered: () => rendered, onStatus, target: new EventTarget() });
    vi.advanceTimersByTime(14_000);
    expect(onStatus).not.toHaveBeenCalled();
    vi.advanceTimersByTime(2_000);
    expect(onStatus).toHaveBeenLastCalledWith('failed');
    rendered = true;
    vi.advanceTimersByTime(2_000);
    expect(onStatus).toHaveBeenLastCalledWith('ready');
    stop();
  });

  it('detects an enforced script CSP violation immediately', () => {
    vi.useFakeTimers();
    const target = new EventTarget();
    const onStatus = vi.fn();
    const stop = startContactMonitor({ isRendered: () => false, onStatus, target });
    const event = new Event('securitypolicyviolation');
    Object.assign(event, { disposition: 'enforce', blockedURI: 'https://www.slightlyfaster.com/connect.js' });
    target.dispatchEvent(event);
    expect(onStatus).toHaveBeenCalledWith('failed');
    stop();
  });

  it('ignores report-only CSP and unrelated resource failures', () => {
    vi.useFakeTimers();
    const target = new EventTarget();
    const onStatus = vi.fn();
    const stop = startContactMonitor({ isRendered: () => false, onStatus, target });
    const event = new Event('securitypolicyviolation');
    Object.assign(event, { disposition: 'report', blockedURI: 'https://www.slightlyfaster.com/connect.js' });
    target.dispatchEvent(event);
    expect(onStatus).not.toHaveBeenCalled();
    stop();
    vi.advanceTimersByTime(20_000);
    expect(onStatus).not.toHaveBeenCalled();
  });
});