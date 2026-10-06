chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
  if (request.type === 'sync-all') {
    startSyncAll();
    sendResponse({ status: 'started' });
    return;
  }
  if (request.type === 'set-fire-icon') {
    //set icon to fire then back to normal after 2 second

    chrome.action.setIcon(
      {
        path: 'icon-fire-96x96.gif',
      },
      () => {
        setTimeout(() => {
          chrome.action.setIcon({
            path: 'logo96.png',
          });
        }, 5000);
      },
    );
  }
  /* Will be used if we want to get messages from content scripts to background script */
  sendResponse({ status: 'OK' });
});

const sendSyncAllToTab = (tabId: number) => {
  chrome.tabs.sendMessage(tabId, { type: 'sync-all' }, () => {
    if (chrome.runtime.lastError) {
      chrome.storage.sync.set({
        github_sync_progress: {
          state: 'error',
          source: 'all-solved',
          processed: 0,
          total: 0,
          synced: 0,
          failed: 0,
          message: 'Reload the LeetCode tab and try sync again.',
          updatedAt: Date.now(),
        },
      });
    }
  });
};

const startSyncAll = () => {
  chrome.storage.sync.set({
    github_sync_progress: {
      state: 'running',
      source: 'all-solved',
      processed: 0,
      total: 0,
      synced: 0,
      failed: 0,
      message: 'Opening LeetCode…',
      updatedAt: Date.now(),
    },
  });
  chrome.tabs.query({ active: true, lastFocusedWindow: true }, (tabs) => {
    const activeTab = tabs[0];
    if (activeTab?.id && activeTab.url?.startsWith('https://leetcode.com/')) {
      sendSyncAllToTab(activeTab.id);
      return;
    }

    chrome.tabs.create({ url: 'https://leetcode.com/problemset/all/', active: true }, (tab) => {
      if (!tab.id) return;
      const onUpdated = (tabId: number, changeInfo: chrome.tabs.TabChangeInfo) => {
        if (tabId !== tab.id || changeInfo.status !== 'complete') return;
        chrome.tabs.onUpdated.removeListener(onUpdated);
        sendSyncAllToTab(tabId);
      };
      chrome.tabs.onUpdated.addListener(onUpdated);
    });
  });
};
chrome.cookies.get({ name: 'LEETCODE_SESSION', url: 'https://leetcode.com/' }, function (cookie) {
  if (!cookie) return;
  chrome.storage.sync.set({ leetcode_session: cookie.value }, () => {
    console.log(`Leetcode Synced Successfully`);
  });
});

chrome.cookies.onChanged.addListener(function (info) {
  const { cookie } = info;
  //get LEETCODE_SESSION cookie
  if (cookie.name === 'LEETCODE_SESSION') {
    //save cookie value to local storage
    chrome.storage.sync.set({ leetcode_session: cookie?.value || null }, () => {
      console.log(`Leetcode Re-Synced Successfully`);
    });
  }
});
chrome.storage.sync.onChanged.addListener((changes) => {
  console.log(`🚀 ~ file: background.ts:68 ~ changes:`, JSON.stringify(changes, null, 2));
});

export const sendMessageToContentScript = (type: string, data: any) => {
  chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
    if (!tabs.length || !tabs[0].id) return;
    chrome.tabs.sendMessage(tabs[0].id, { type, data }, function (response) {
      if (chrome.runtime.lastError) {
        console.log(chrome.runtime.lastError.message);
        // Handle the error here
        return;
      }
      console.log(`✅ Acknowledged`, response);
    });
  });
};

// Listen for submit request
chrome.webRequest.onCompleted.addListener(
  (details: chrome.webRequest.WebResponseCacheDetails) => {
    // Check if it's a POST request to submit the code
    if (
      details.method === 'POST' &&
      details.url.startsWith('https://leetcode.com/problems/') &&
      details.url.includes('/submit/')
    ) {
      const questionSlug = details.url.match(/\/problems\/([^/?#]+)\/submit/)?.[1] ?? null;
      if (!questionSlug) return;
      // Wait 5 secs to complete the checks
      // Send a message to the content script to get the submission
      setTimeout(() => {
        sendMessageToContentScript('get-submission', { questionSlug });
      }, 5000);
    }
  },
  {
    urls: ['https://leetcode.com/problems/*/submit/'],
    types: ['xmlhttprequest'],
  },
);
export {};
