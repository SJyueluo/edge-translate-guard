import { installTranslationResilience } from '../vendor/translation-resilience';

type GuardCommand = 'enable' | 'disable';
type GuardMessage = { source: 'edge-translate-guard'; command: GuardCommand };

let uninstall: (() => void) | undefined;
let documentObserver: MutationObserver | undefined;
let requestedEnabled = true;

function enable(): void {
  requestedEnabled = true;
  if (uninstall) return;

  if (!document.documentElement) {
    if (!documentObserver) {
      documentObserver = new MutationObserver(() => {
        if (!document.documentElement) return;
        documentObserver?.disconnect();
        documentObserver = undefined;
        if (requestedEnabled) enable();
      });
      documentObserver.observe(document, { childList: true });
    }
    return;
  }

  documentObserver?.disconnect();
  documentObserver = undefined;
  uninstall = installTranslationResilience();
}

function disable(): void {
  requestedEnabled = false;
  documentObserver?.disconnect();
  documentObserver = undefined;
  uninstall?.();
  uninstall = undefined;
}

function isGuardMessage(value: unknown): value is GuardMessage {
  if (typeof value !== 'object' || value === null) return false;
  const message = value as Partial<GuardMessage>;
  return message.source === 'edge-translate-guard' &&
    (message.command === 'enable' || message.command === 'disable');
}

window.addEventListener('message', (event: MessageEvent<unknown>) => {
  if (event.source !== window || !isGuardMessage(event.data)) return;
  if (event.data.command === 'enable') enable();
  else disable();
});

enable();
