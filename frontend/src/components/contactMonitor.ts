export const CONTACT_SCRIPT_URL = 'https://www.slightlyfaster.com/connect.js';
export const CONTACT_RENDER_TIMEOUT_MS = 15_000;

export type ContactStatus = 'pending' | 'ready' | 'failed';

// Only inspects the contact widget. Never reads clinical data or sends telemetry.
export function contactButtonsRendered(host: HTMLElement | null): boolean {
  if (!host) return false;
  const root = host.shadowRoot ?? host;
  const link = root.querySelector<HTMLAnchorElement>('a[href*="linkedin.com/in/"]');
  const button = root.querySelector<HTMLButtonElement>('button');
  const visible = (element: HTMLElement | null): boolean => {
    if (!element || element.getClientRects().length === 0) return false;
    let current: HTMLElement | null = element;
    while (current) {
      const style = getComputedStyle(current);
      if (style.display === 'none' || style.visibility === 'hidden' || style.visibility === 'collapse' || Number(style.opacity) === 0) return false;
      const parent = current.parentElement;
      const tree = current.getRootNode();
      current = parent ?? (tree instanceof ShadowRoot ? tree.host as HTMLElement : null);
    }
    return true;
  };
  return visible(link) && visible(button) && button?.disabled === false;
}

export function startContactMonitor({
  isRendered,
  onStatus,
  target = document,
}: {
  isRendered: () => boolean;
  onStatus: (status: ContactStatus) => void;
  target?: EventTarget;
}): () => void {
  const deadline = Date.now() + CONTACT_RENDER_TIMEOUT_MS;
  let status: ContactStatus = 'pending';
  let blocked = false;
  const check = () => {
    const next = isRendered() ? 'ready' : blocked || status === 'ready' || Date.now() >= deadline ? 'failed' : 'pending';
    if (next !== status) {
      status = next;
      onStatus(next);
    }
  };
  const onError = (event: Event) => {
    if (event.target instanceof HTMLScriptElement && event.target.src === CONTACT_SCRIPT_URL) {
      blocked = true;
      check();
    }
  };
  const onCsp = (event: Event) => {
    const violation = event as SecurityPolicyViolationEvent;
    if (violation.disposition === 'enforce' && violation.blockedURI === CONTACT_SCRIPT_URL) {
      blocked = true;
      check();
    }
  };
  target.addEventListener('error', onError, true);
  target.addEventListener('securitypolicyviolation', onCsp);
  check();
  const timer = setInterval(check, 2_000);
  return () => {
    clearInterval(timer);
    target.removeEventListener('error', onError, true);
    target.removeEventListener('securitypolicyviolation', onCsp);
  };
}