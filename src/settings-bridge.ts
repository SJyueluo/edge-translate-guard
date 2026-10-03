import { isHostEnabled, updateDisabledHosts } from './site-policy';

type GuardMessage = { source: 'edge-translate-guard'; command: 'enable' | 'disable' };

type ExtensionRequest = {
  type?: string;
  enabled?: boolean;
};

type ExtensionResponse = {
  enabled: boolean;
};

declare const chrome: {
  storage: {
    local: {
      get(defaults: Record<string, unknown>, callback: (items: Record<string, unknown>) => void): void;
      set(items: Record<string, unknown>, callback?: () => void): void;
    };
  };
  runtime: {
    onMessage: {
      addListener(
        listener: (
          message: ExtensionRequest,
          sender: unknown,
          sendResponse: (response: ExtensionResponse) => void
        ) => boolean | void
      ): void;
    };
  };
};

const DISABLED_HOSTS_KEY = 'disabledHosts';
const host = location.hostname.toLowerCase();

function readDisabledHosts(callback: (hosts: string[]) => void): void {
  chrome.storage.local.get({ [DISABLED_HOSTS_KEY]: [] }, (items) => {
    const stored = items[DISABLED_HOSTS_KEY];
    callback(Array.isArray(stored) ? stored.filter((item): item is string => typeof item === 'string') : []);
  });
}

function sendGuardCommand(enabled: boolean): void {
  const message: GuardMessage = {
    source: 'edge-translate-guard',
    command: enabled ? 'enable' : 'disable',
  };
  window.postMessage(message, location.origin);
}

function setSiteEnabled(enabled: boolean, callback: (response: ExtensionResponse) => void): void {
  readDisabledHosts((hosts) => {
    const nextHosts = updateDisabledHosts(hosts, host, enabled);

    chrome.storage.local.set({ [DISABLED_HOSTS_KEY]: nextHosts }, () => {
      sendGuardCommand(enabled);
      callback({ enabled });
    });
  });
}

readDisabledHosts((hosts) => sendGuardCommand(isHostEnabled(host, hosts)));

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type !== 'GET_SITE_STATE' && message?.type !== 'SET_SITE_STATE') return;

  if (message.type === 'GET_SITE_STATE') {
    readDisabledHosts((hosts) => sendResponse({ enabled: isHostEnabled(host, hosts) }));
  } else {
    setSiteEnabled(message.enabled !== false, sendResponse);
  }
  return true;
});
