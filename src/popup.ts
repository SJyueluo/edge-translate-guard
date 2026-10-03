type SiteState = { enabled: boolean };

declare const chrome: {
  tabs: {
    query(query: { active: boolean; currentWindow: boolean }): Promise<Array<{ id?: number; url?: string }>>;
    sendMessage(tabId: number, message: { type: string; enabled?: boolean }): Promise<SiteState>;
  };
};

const siteElement = document.querySelector<HTMLElement>('#site');
const statusElement = document.querySelector<HTMLElement>('#status');
const toggleButton = document.querySelector<HTMLButtonElement>('#toggle');

async function start(): Promise<void> {
  if (!siteElement || !statusElement || !toggleButton) return;

  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.id || !tab.url) {
    siteElement.textContent = '此页面不支持';
    statusElement.textContent = '扩展仅在普通网页上运行。';
    toggleButton.disabled = true;
    return;
  }

  let hostname: string;
  try {
    const url = new URL(tab.url);
    if (url.protocol !== 'http:' && url.protocol !== 'https:') throw new Error('Unsupported page');
    hostname = url.hostname;
  } catch {
    siteElement.textContent = '此页面不支持';
    statusElement.textContent = '扩展仅在普通网页上运行。';
    toggleButton.disabled = true;
    return;
  }

  siteElement.textContent = hostname;
  try {
    const current = await chrome.tabs.sendMessage(tab.id, { type: 'GET_SITE_STATE' });
    render(current.enabled);
  } catch {
    statusElement.textContent = '请刷新此网页后再更改设置。';
    toggleButton.disabled = true;
    return;
  }

  toggleButton.addEventListener('click', async () => {
    toggleButton.disabled = true;
    try {
      const next = await chrome.tabs.sendMessage(tab.id!, {
        type: 'SET_SITE_STATE',
        enabled: toggleButton.dataset.enabled !== 'true',
      });
      render(next.enabled);
    } catch {
      statusElement.textContent = '设置未能应用，请刷新网页后重试。';
    } finally {
      toggleButton.disabled = false;
    }
  });
}

function render(enabled: boolean): void {
  if (!statusElement || !toggleButton) return;
  toggleButton.dataset.enabled = String(enabled);
  statusElement.textContent = enabled ? '翻译修复保护已开启。' : '此网站已暂停翻译修复保护。';
  toggleButton.textContent = enabled ? '暂停此网站保护' : '对此网站启用保护';
}

void start();
