import LeetCodeHandler from '../handlers/LeetCodeHandler';
import * as submissionApi from '../api/submissions/getSubmission';
import { vi, type Mock } from 'vitest';

vi.mock('../api/submissions/getSubmission');

describe('LeetCodeHandler getSubmission', () => {
  beforeEach(() => {
    (global as any).chrome = {
      storage: { sync: { get: vi.fn() } }
    };
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('returns null when there is no session token', async () => {
    (global as any).chrome.storage.sync.get.mockResolvedValue({});
    const handler = new LeetCodeHandler();
    const result = await handler.getSubmission('two-sum');
    expect(result).toBeNull();
  });

  it('returns null when no submissions exist', async () => {
    (global as any).chrome.storage.sync.get.mockResolvedValue({ leetcode_session: 'sess' });
    (submissionApi.getAllSubmission as Mock).mockResolvedValue({});
    const handler = new LeetCodeHandler();
    const result = await handler.getSubmission('two-sum');
    expect(result).toBeNull();
  });

  it('returns latest submission details', async () => {
    (global as any).chrome.storage.sync.get.mockResolvedValue({ leetcode_session: 'sess' });
    (submissionApi.getAllSubmission as Mock).mockResolvedValue({
      questionSubmissionList: { submissions: [{ id: 1 }] }
    });
    const details = { id: 1, code: 'code' } as any;
    (submissionApi.getSubmission as Mock).mockResolvedValue({ submissionDetails: details });

    const handler = new LeetCodeHandler();
    const result = await handler.getSubmission('two-sum');
    expect(result).toEqual(details);
  });

  it('collects the latest accepted submission for every solved problem', async () => {
    (submissionApi.getUserStatus as Mock).mockResolvedValue({
      userStatus: { isSignedIn: true, username: 'tarunyak' },
    });
    (submissionApi.getSolvedProblemPage as Mock).mockResolvedValue({
      userProgressQuestionList: {
        totalNum: 1,
        questions: [{ titleSlug: 'two-sum' }],
      },
    });
    (submissionApi.getAllSubmission as Mock).mockResolvedValue({
      questionSubmissionList: { submissions: [{ id: 1 }] },
    });
    const details = { id: 1, statusCode: 10, question: { titleSlug: 'two-sum' } } as any;
    (submissionApi.getSubmission as Mock).mockResolvedValue({ submissionDetails: details });

    const progress = vi.fn();
    const result = await new LeetCodeHandler().getAllAcceptedSubmissions(progress);

    expect(result.submissions).toEqual([details]);
    expect(result.source).toBe('all-solved');
    expect(result.failed).toBe(0);
    expect(progress).toHaveBeenCalledWith({ processed: 1, total: 1, source: 'all-solved' });
  });
});
