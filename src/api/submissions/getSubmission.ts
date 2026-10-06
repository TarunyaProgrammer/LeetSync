import { getClient } from '../../lib/client';
import { Submission } from '../../types/Submission';
import {
  GET_RECENT_ACCEPTED_SUBMISSIONS,
  GET_SOLVED_PROBLEMS,
  GET_SUBMISSIONS,
  GET_SUBMISSION_DETAILS,
  GET_USER_STATUS,
} from './submission.query';

export type SubmissionSummary = {
  id: number;
  title: string;
  titleSlug: string;
  lang?: string;
  timestamp: number;
};

export type SolvedProblem = {
  frontendId: string;
  title: string;
  titleSlug: string;
  difficulty: string;
  lastSubmittedAt?: string;
};

export const getSubmission = async (
  submissionId: number | string,
  leetcode_session?: string,
): Promise<{ submissionDetails: Submission } | null> => {
  try {
    const client = getClient();
    return await client.request(GET_SUBMISSION_DETAILS, {
      submissionId,
    });
  } catch (e) {
    console.log(e);
    return null;
  }
};
export const getAllSubmission = async (questionSlug: string): Promise<{
  questionSubmissionList?: { submissions: SubmissionSummary[] };
} | null> => {
  try {
    const client = getClient();
    return await client.request(GET_SUBMISSIONS, {
      questionSlug,
      limit: 20,
      offset: 0,
      lastKey: null,
      status: 10,
    });
  } catch (e) {
    console.log(e);
    return null;
  }
};

export const getUserStatus = async (): Promise<{
  userStatus?: { isSignedIn: boolean; username: string };
} | null> => {
  try {
    return await getClient().request(GET_USER_STATUS);
  } catch (e) {
    console.log(e);
    return null;
  }
};

export const getSolvedProblemPage = async (skip: number, limit: number): Promise<{
  userProgressQuestionList?: { totalNum: number; questions: SolvedProblem[] };
} | null> => {
  try {
    return await getClient().request(GET_SOLVED_PROBLEMS, {
      filters: { questionStatus: 'SOLVED', skip, limit },
    });
  } catch (e) {
    console.log(e);
    return null;
  }
};

export const getRecentAcceptedSubmissions = async (
  username: string,
  limit: number,
): Promise<{ recentAcSubmissionList?: SubmissionSummary[] } | null> => {
  try {
    return await getClient().request(GET_RECENT_ACCEPTED_SUBMISSIONS, {
      username,
      limit,
    });
  } catch (e) {
    console.log(e);
    return null;
  }
};
