import {
  getAllSubmission,
  getRecentAcceptedSubmissions,
  getSolvedProblemPage,
  getSubmission,
  getUserStatus,
  SolvedProblem,
  SubmissionSummary,
} from '../api/submissions/getSubmission';
import { Submission } from '../types/Submission';

export type SyncProgress = {
  state: 'running' | 'complete' | 'error';
  source: 'all-solved' | 'recent';
  processed: number;
  total: number;
  synced: number;
  failed: number;
  message?: string;
};

const pause = (milliseconds: number) =>
  new Promise((resolve) => setTimeout(resolve, milliseconds));

class LeetCodeHandler {
  async getSubmission(questionSlug: string): Promise<Submission | null> {
    const leetcode_session = (await chrome.storage.sync.get('leetcode_session'))?.[
      'leetcode_session'
    ];

    if (!leetcode_session) {
      return null;
    }

    const submissions = await getAllSubmission(questionSlug);

    if (!submissions?.questionSubmissionList?.submissions?.[0]?.id) {
      console.log('No question submissions were found for this problem');
      return null;
    }

    const latestSubmissionId = submissions.questionSubmissionList?.submissions?.[0]?.id;

    const result = await getSubmission(latestSubmissionId, leetcode_session);

    if (!result?.submissionDetails) return null;

    return result.submissionDetails;
  }

  private async latestAcceptedSubmission(questionSlug: string): Promise<Submission | null> {
    const submissions = await getAllSubmission(questionSlug);
    const latest = submissions?.questionSubmissionList?.submissions?.[0];
    if (!latest?.id) return null;
    const result = await getSubmission(latest.id);
    return result?.submissionDetails || null;
  }

  private async getAllSolvedProblems(): Promise<SolvedProblem[] | null> {
    const firstPage = await getSolvedProblemPage(0, 1000);
    const result = firstPage?.userProgressQuestionList;
    if (!result) return null;

    const questions = [...(result.questions || [])];
    for (let skip = questions.length; skip < result.totalNum; skip += 1000) {
      const page = await getSolvedProblemPage(skip, 1000);
      const next = page?.userProgressQuestionList?.questions;
      if (!next?.length) break;
      questions.push(...next);
    }
    return questions;
  }

  private async getRecentSolvedSubmissions(username: string): Promise<SubmissionSummary[]> {
    const response = await getRecentAcceptedSubmissions(username, 100);
    return response?.recentAcSubmissionList || [];
  }

  async getAllAcceptedSubmissions(
    onProgress?: (
      progress: Pick<SyncProgress, 'processed' | 'total' | 'source'>,
    ) => void | Promise<void>,
  ): Promise<{ submissions: Submission[]; source: SyncProgress['source']; failed: number }> {
    const status = await getUserStatus();
    if (!status?.userStatus?.isSignedIn || !status.userStatus.username) {
      throw new Error('LeetCode is not signed in. Log in and try again.');
    }

    const solvedProblems = await this.getAllSolvedProblems();
    let source: SyncProgress['source'] = 'all-solved';
    let targets: Array<{ titleSlug: string }> = solvedProblems || [];

    if (!solvedProblems?.length) {
      source = 'recent';
      const recent = await this.getRecentSolvedSubmissions(status.userStatus.username);
      const unique = new Map<string, SubmissionSummary>();
      recent.forEach((submission) => {
        if (!unique.has(submission.titleSlug)) unique.set(submission.titleSlug, submission);
      });
      targets = Array.from(unique.values());
    }

    const submissions: Submission[] = [];
    let processed = 0;
    let failed = 0;
    const concurrency = 3;
    let nextIndex = 0;
    const worker = async () => {
      while (nextIndex < targets.length) {
        const index = nextIndex++;
        const target = targets[index];
        try {
          const submission = await this.latestAcceptedSubmission(target.titleSlug);
          if (submission) submissions.push(submission);
          else failed++;
        } catch (error) {
          console.warn(`Could not fetch ${target.titleSlug}`, error);
          failed++;
        } finally {
          processed++;
          await onProgress?.({ processed, total: targets.length, source });
          await pause(150);
        }
      }
    };
    await Promise.all(Array.from({ length: concurrency }, () => worker()));
    return { submissions, source, failed };
  }
}

export default LeetCodeHandler;
