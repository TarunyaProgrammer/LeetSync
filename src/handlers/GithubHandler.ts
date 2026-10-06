import { QuestionDifficulty } from '../types/Question';
import { Submission } from '../types/Submission';

const languagesToExtensions: Record<string, string> = {
  Python: '.py', Python3: '.py', 'C++': '.cpp', C: '.c', Java: '.java', 'C#': '.cs',
  JavaScript: '.js', Javascript: '.js', Ruby: '.rb', Swift: '.swift', Go: '.go', Kotlin: '.kt',
  Scala: '.scala', Rust: '.rs', PHP: '.php', TypeScript: '.ts', MySQL: '.sql',
  'MS SQL Server': '.sql', Oracle: '.sql', PostgreSQL: '.sql', 'C++14': '.cpp', 'C++17': '.cpp',
  'C++11': '.cpp', 'C++98': '.cpp', 'C++03': '.cpp', 'C++20': '.cpp', 'C++1z': '.cpp',
  'C++1y': '.cpp', 'C++1x': '.cpp', 'C++1a': '.cpp', CPP: '.cpp', Dart: '.dart', Elixir: '.ex',
};

interface GithubUser { id: number; avatar_url?: string | null; url: string; login: string; }
export interface GithubRepository { owner: string; name: string; }
type StorageAreaName = 'sync' | 'local';

const getStorage = (area: StorageAreaName, keys: string | string[]) =>
  new Promise<Record<string, any>>((resolve) => {
    chrome.storage[area].get(keys, (result) => resolve(result));
  });
const setStorage = (area: StorageAreaName, values: Record<string, any>) =>
  new Promise<void>((resolve) => chrome.storage[area].set(values, () => resolve()));
const removeStorage = (area: StorageAreaName, keys: string | string[]) =>
  new Promise<void>((resolve) => chrome.storage[area].remove(keys, () => resolve()));

const encodePath = (path: string) =>
  path.split('/').filter(Boolean).map((part) => encodeURIComponent(part)).join('/');
const encodeContent = (content: string) => btoa(unescape(encodeURIComponent(content)));

export const parseRepositoryUrl = (value: string): GithubRepository | null => {
  const input = value.trim();
  if (!input) return null;
  const withProtocol = /^https?:\/\//i.test(input) ? input : `https://${input}`;
  let url: URL;
  try { url = new URL(withProtocol); } catch { return null; }
  if (url.hostname.toLowerCase() !== 'github.com' || url.search || url.hash) return null;
  const parts = url.pathname.split('/').filter(Boolean);
  if (parts.length !== 2) return null;
  const owner = parts[0];
  const name = parts[1].replace(/\.git$/i, '');
  if (!/^[A-Za-z0-9][A-Za-z0-9_.-]*$/.test(owner)) return null;
  if (!/^[A-Za-z0-9][A-Za-z0-9_.-]*$/.test(name)) return null;
  return { owner, name };
};

export default class GithubHandler {
  base_url = 'https://api.github.com';
  private accessToken = '';
  private username = '';
  private repoOwner = '';
  private repo = '';
  private github_leetsync_subdirectory = '';
  private ready: Promise<void>;

  constructor() { this.ready = this.loadConfig(); }

  private async loadConfig(): Promise<void> {
    const [sync, local] = await Promise.all([
      getStorage('sync', [
        'github_username', 'github_repo_owner', 'github_leetsync_repo',
        'github_leetsync_subdirectory', 'github_leetsync_token',
      ]),
      getStorage('local', ['github_leetsync_token']),
    ]);
    const legacyToken = sync.github_leetsync_token as string | undefined;
    this.accessToken = (local.github_leetsync_token || legacyToken || '') as string;
    this.username = (sync.github_username || '') as string;
    this.repoOwner = (sync.github_repo_owner || this.username || '') as string;
    this.repo = (sync.github_leetsync_repo || '') as string;
    this.github_leetsync_subdirectory = (sync.github_leetsync_subdirectory || '') as string;
    if (!local.github_leetsync_token && legacyToken) {
      await setStorage('local', { github_leetsync_token: legacyToken });
      await removeStorage('sync', 'github_leetsync_token');
    }
  }

  async loadTokenFromStorage(): Promise<string> {
    const local = await getStorage('local', ['github_leetsync_token']);
    if (local.github_leetsync_token) return local.github_leetsync_token as string;
    const sync = await getStorage('sync', ['github_leetsync_token']);
    const token = (sync.github_leetsync_token || '') as string;
    if (token) {
      await setStorage('local', { github_leetsync_token: token });
      await removeStorage('sync', 'github_leetsync_token');
    }
    return token;
  }

  private async githubRequest(path: string, init: RequestInit = {}, token = this.accessToken) {
    const headers = new Headers(init.headers || {});
    headers.set('Accept', 'application/vnd.github+json');
    headers.set('X-GitHub-Api-Version', '2022-11-28');
    if (token) headers.set('Authorization', `Bearer ${token}`);
    return fetch(`${this.base_url}${path}`, { ...init, headers });
  }

  async connectWithToken(token: string): Promise<GithubUser> {
    await this.ready;
    const normalizedToken = token.trim();
    if (!normalizedToken) throw new Error('Enter a GitHub token.');
    const response = await this.githubRequest('/user', { method: 'GET' }, normalizedToken);
    const user = (await response.json().catch(() => null)) as GithubUser | null;
    if (!response.ok || !user?.login) {
      throw new Error(response.status === 401
        ? 'GitHub rejected this token. Check that it is copied completely and has not expired.'
        : 'Could not validate the GitHub token.');
    }
    this.accessToken = normalizedToken;
    this.username = user.login;
    this.repoOwner = this.repoOwner || user.login;
    await setStorage('local', { github_leetsync_token: normalizedToken });
    await setStorage('sync', { github_username: user.login });
    return user;
  }

  async validateRepository(repository: GithubRepository): Promise<void> {
    await this.ready;
    const token = await this.loadTokenFromStorage();
    if (!token) throw new Error('Connect GitHub before linking a repository.');
    const response = await this.githubRequest(
      `/repos/${encodeURIComponent(repository.owner)}/${encodeURIComponent(repository.name)}`,
      { method: 'GET' },
      token,
    );
    const data = await response.json().catch(() => null);
    if (response.status === 401) throw new Error('Your GitHub token is invalid or expired.');
    if (response.status === 404) throw new Error('Repository not found, or your token cannot see it.');
    if (!response.ok) throw new Error(data?.message || 'GitHub could not inspect this repository.');
    if (data?.permissions && data.permissions.push !== true) {
      throw new Error('This token can read the repository but cannot push to it.');
    }
  }

  async linkRepository(repositoryUrl: string): Promise<GithubRepository> {
    const repository = parseRepositoryUrl(repositoryUrl);
    if (!repository) throw new Error('Use a GitHub URL such as https://github.com/owner/repository.');
    await this.validateRepository(repository);
    this.repoOwner = repository.owner;
    this.repo = repository.name;
    await setStorage('sync', {
      github_repo_owner: repository.owner, github_leetsync_repo: repository.name,
    });
    return repository;
  }

  async checkIfRepoExists(repoName: string): Promise<boolean> {
    const repository = repoName.includes('/')
      ? parseRepositoryUrl(`https://github.com/${repoName}`)
      : this.repoOwner
        ? { owner: this.repoOwner, name: repoName.replace(/\.git$/i, '').trim() }
        : null;
    if (!repository) return false;
    try { await this.validateRepository(repository); return true; } catch { return false; }
  }

  public getProblemExtension(lang: string) { return languagesToExtensions[lang]; }

  private getRepositoryPath(path: string, fileName: string) {
    return `/repos/${encodeURIComponent(this.repoOwner || this.username)}/${encodeURIComponent(
      this.repo,
    )}/contents/${encodePath(path)}/${encodeURIComponent(fileName)}`;
  }

  async fileExists(path: string, fileName: string): Promise<string | null> {
    await this.ready;
    const response = await this.githubRequest(this.getRepositoryPath(path, fileName), { method: 'GET' });
    if (response.status === 404) return null;
    const data = await response.json().catch(() => null);
    if (!response.ok) throw new Error(data?.message || 'Could not inspect the existing GitHub file.');
    return data?.sha || null;
  }

  async upload(path: string, fileName: string, content: string, commitMessage: string) {
    await this.ready;
    const sha = await this.fileExists(path, fileName);
    const response = await this.githubRequest(this.getRepositoryPath(path, fileName), {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: commitMessage, content: encodeContent(content), ...(sha ? { sha } : {}),
      }),
    });
    const data = await response.json().catch(() => null);
    if (!response.ok) throw new Error(data?.message || `GitHub rejected ${fileName} (${response.status}).`);
  }

  getDifficultyColor(difficulty: QuestionDifficulty) {
    switch (difficulty) {
      case 'Easy': return 'brightgreen';
      case 'Medium': return 'orange';
      case 'Hard': return 'red';
    }
  }

  createDifficultyBadge(difficulty: QuestionDifficulty) {
    return `<img src='https://img.shields.io/badge/Difficulty-${difficulty}-${this.getDifficultyColor(
      difficulty,
    )}' alt='Difficulty: ${difficulty}' />`;
  }

  async createReadmeFile(path: string, content: string, message: string, problemSlug: string,
    questionTitle: string, difficulty: QuestionDifficulty) {
    const mdContent = `<h2><a href="https://leetcode.com/problems/${problemSlug}">${questionTitle}</a></h2> ${this.createDifficultyBadge(
      difficulty,
    )}<hr>${content}`;
    await this.upload(path, 'README.md', mdContent, message);
  }

  async createNotesFile(path: string, notes: string, message: string, questionTitle: string) {
    await this.upload(path, 'Notes.md', `<h2>${questionTitle} Notes</h2><hr>${notes}`, message);
  }

  async createSolutionFile(path: string, code: string, problemName: string, lang: string, stats: {
    memory: number; memoryDisplay: string; memoryPercentile: number; runtime: number;
    runtimeDisplay: string; runtimePercentile: number;
  }) {
    const runtimePercentile = Number(stats.runtimePercentile || 0).toFixed(2);
    const memoryPercentile = Number(stats.memoryPercentile || 0).toFixed(2);
    const msg = `Time: ${stats.runtimeDisplay} (${runtimePercentile}%) | Memory: ${stats.memoryDisplay} (${memoryPercentile}%) - Tarunya LeetSync`;
    await this.upload(path, `${problemName}${lang}`, code, msg);
  }

  private async setSyncStatus(status: 'success' | 'error', message: string) {
    await setStorage('sync', { github_last_sync: { status, message, timestamp: Date.now() } });
  }

  async submit(submission: Submission): Promise<boolean> {
    await this.ready;
    if (!this.accessToken || !(this.repoOwner || this.username) || !this.repo) {
      await this.setSyncStatus('error', 'GitHub is not connected to a repository.');
      return false;
    }
    const {
      code, memory, memoryDisplay, memoryPercentile, runtime, runtimePercentile, runtimeDisplay,
      lang, statusCode, question, notes,
    } = submission;
    if (statusCode !== 10) return false;
    const baseName = `${question.questionFrontendId ?? question.questionId ?? 'unknown'}-${question.titleSlug}`;
    const basePath = this.github_leetsync_subdirectory
      ? `${this.github_leetsync_subdirectory}/${baseName}` : baseName;
    const { title, titleSlug, content, difficulty, questionId } = question;
    const langExtension = this.getProblemExtension(lang.verboseName);
    if (!langExtension) {
      await this.setSyncStatus('error', `Language not supported: ${lang.verboseName}`);
      return false;
    }
    try {
      await this.createReadmeFile(basePath, content, `Added README.md file for ${title}`,
        titleSlug, title, difficulty);
      if (notes?.length) await this.createNotesFile(basePath, notes, `Added Notes.md file for ${title}`, title);
      await this.createSolutionFile(basePath, code, question.titleSlug, langExtension, {
        memory, memoryDisplay, memoryPercentile, runtime, runtimeDisplay, runtimePercentile,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'GitHub upload failed.';
      console.error('Tarunya LeetSync upload failed:', error);
      await this.setSyncStatus('error', message);
      return false;
    }
    const todayTimestamp = Date.now();
    await setStorage('sync', { lastSolved: { slug: titleSlug, timestamp: todayTimestamp } });
    const solved = (await getStorage('sync', ['problemsSolved'])).problemsSolved || {};
    await setStorage('sync', {
      problemsSolved: { ...solved, [titleSlug]: { question: { difficulty, questionId }, timestamp: todayTimestamp } },
    });
    await this.setSyncStatus('success', `Pushed ${title} to GitHub.`);
    return true;
  }
}
