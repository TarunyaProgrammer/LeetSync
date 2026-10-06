import GithubHandler from '../handlers/GithubHandler';
import type { QuestionDifficulty } from '../types/Question';
import { vi } from 'vitest';

describe('GithubHandler utility methods', () => {
  beforeEach(() => {
    (global as any).chrome = {
      storage: {
        sync: {
          get: vi.fn((keys: any, cb: any) => cb({})),
          clear: vi.fn(),
          set: vi.fn((_values: any, cb: any) => cb?.()),
          remove: vi.fn((_keys: any, cb: any) => cb?.()),
        },
        local: {
          get: vi.fn((keys: any, cb: any) => cb({})),
          set: vi.fn((_values: any, cb: any) => cb?.()),
          remove: vi.fn((_keys: any, cb: any) => cb?.()),
        },
      },
    };
  });

  it('returns correct file extension for a language', () => {
    const handler = new GithubHandler();
    expect(handler.getProblemExtension('Python')).toBe('.py');
    expect(handler.getProblemExtension('JavaScript')).toBe('.js');
  });

  it('parses a GitHub repository URL without losing the owner', async () => {
    const { parseRepositoryUrl } = await import('../handlers/GithubHandler');
    expect(parseRepositoryUrl('https://github.com/owner/solutions.git')).toEqual({
      owner: 'owner',
      name: 'solutions',
    });
  });

  it('returns correct difficulty color', () => {
    const handler = new GithubHandler();
    expect(handler.getDifficultyColor('Easy' as QuestionDifficulty)).toBe('brightgreen');
    expect(handler.getDifficultyColor('Medium' as QuestionDifficulty)).toBe('orange');
    expect(handler.getDifficultyColor('Hard' as QuestionDifficulty)).toBe('red');
  });

  it('creates a difficulty badge using the difficulty color', () => {
    const handler = new GithubHandler();
    const badge = handler.createDifficultyBadge('Medium' as QuestionDifficulty);
    expect(badge).toContain('img');
    expect(badge).toContain('Difficulty-Medium-orange');
  });

  it('loads token from storage', async () => {
    const handler = new GithubHandler();
    (global as any).chrome.storage.sync.get = vi.fn((keys: any, cb: any) => cb({ github_leetsync_token: 'abc' }));
    const token = await handler.loadTokenFromStorage();
    expect(token).toBe('abc');
  });

  it('returns an empty string when token is missing', async () => {
    (global as any).chrome.storage.sync.get = vi.fn((keys: any, cb: any) => cb({}));
    const handler = new GithubHandler();
    const token = await handler.loadTokenFromStorage();
    expect(token).toBe('');
  });
});
