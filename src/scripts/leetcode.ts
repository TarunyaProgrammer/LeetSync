//this script should only run in leetcode/problems/*.com pages  (i.e. the problem page)

import { LeetCodeHandler, GithubHandler } from '../handlers';
import { SyncProgress } from '../handlers/LeetCodeHandler';

const leetcode = new LeetCodeHandler();
const github = new GithubHandler();

const sleep = async (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
let syncInProgress = false;

const saveSyncProgress = (progress: SyncProgress) =>
  new Promise<void>((resolve) => {
    chrome.storage.sync.set({ github_sync_progress: { ...progress, updatedAt: Date.now() } }, () =>
      resolve(),
    );
  });

const syncAll = async () => {
  if (syncInProgress) return;
  syncInProgress = true;
  try {
    await saveSyncProgress({
      state: 'running', source: 'all-solved', processed: 0, total: 0, synced: 0, failed: 0,
      message: 'Reading solved problems from LeetCode…',
    });
    const fetched = await leetcode.getAllAcceptedSubmissions(async (progress) => {
      await saveSyncProgress({
        state: 'running', ...progress, synced: 0, failed: 0,
        message: `Fetching accepted submissions (${progress.processed}/${progress.total})…`,
      });
    });

    let synced = 0;
    let failed = fetched.failed;
    await saveSyncProgress({
      state: 'running', source: fetched.source, processed: 0, total: fetched.submissions.length,
      synced, failed, message: 'Pushing solutions to GitHub…',
    });
    for (const submission of fetched.submissions) {
      if (await github.submit(submission)) synced++;
      else failed++;
      await saveSyncProgress({
        state: 'running', source: fetched.source, processed: synced + failed,
        total: fetched.submissions.length, synced, failed,
        message: `Pushing solutions to GitHub (${synced + failed}/${fetched.submissions.length})…`,
      });
    }
    await saveSyncProgress({
      state: 'complete', source: fetched.source, processed: fetched.submissions.length,
      total: fetched.submissions.length, synced, failed,
      message: `Sync complete: ${synced} pushed, ${failed} failed.`,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Sync failed.';
    await saveSyncProgress({
      state: 'error', source: 'all-solved', processed: 0, total: 0, synced: 0, failed: 0,
      message,
    });
    console.error('Tarunya LeetSync bulk sync failed:', error);
  } finally {
    syncInProgress = false;
  }
};

chrome.runtime.onMessage.addListener(async function (request, _s, _sendResponse) {
  if (request && request.type === 'sync-all') {
    void syncAll();
    return;
  }
  if (request && request.type === 'get-submission') {
    const questionSlug = request?.data?.questionSlug;

    if (!questionSlug) return;

    let retries = 0;
    let submission = await leetcode.getSubmission(questionSlug);
    while (!submission && retries < 3) {
      retries++;
      await sleep(retries * 1000);
      submission = await leetcode.getSubmission(questionSlug);
    }
    if (!submission) return;
    //validate submission's timestamp, if its was submitted more than 1 minute ago, then its an old submission and we should ignore it
    const now = new Date();
    const submissionDate = new Date(submission.timestamp * 1000);
    const diff = now.getTime() - submissionDate.getTime();
    const diffInMinutes = Math.floor(diff / 1000 / 60);

    if (diffInMinutes > 1) return;

    const isPushed = await github.submit(submission);
    if (isPushed) {
      chrome.runtime.sendMessage({ type: 'set-fire-icon' });
    }
  }
});
