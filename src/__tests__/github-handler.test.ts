import GithubHandler from '../handlers/GithubHandler';

describe('GithubHandler utility methods', () => {
  beforeEach(() => {
    (global as any).chrome = {
      storage: {
        sync: {
          get: jest.fn((keys: any, cb: any) => cb({})),
          clear: jest.fn(),
          set: jest.fn((_values: any, cb: any) => cb?.()),
          remove: jest.fn((_keys: any, cb: any) => cb?.()),
        },
        local: {
          get: jest.fn((keys: any, cb: any) => cb({})),
          set: jest.fn((_values: any, cb: any) => cb?.()),
          remove: jest.fn((_keys: any, cb: any) => cb?.()),
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
    expect(handler.getDifficultyColor('Easy')).toBe('brightgreen');
    expect(handler.getDifficultyColor('Medium')).toBe('orange');
    expect(handler.getDifficultyColor('Hard')).toBe('red');
  });

  it('creates a difficulty badge using the difficulty color', () => {
    const handler = new GithubHandler();
    const badge = handler.createDifficultyBadge('Medium');
    expect(badge).toContain('img');
    expect(badge).toContain('Difficulty-Medium-orange');
  });

  it('loads token from storage', async () => {
    const handler = new GithubHandler();
    (global as any).chrome.storage.sync.get = jest.fn((keys: any, cb: any) => cb({ github_leetsync_token: 'abc' }));
    const token = await handler.loadTokenFromStorage();
    expect(token).toBe('abc');
  });

  it('returns an empty string when token is missing', async () => {
    (global as any).chrome.storage.sync.get = jest.fn((keys: any, cb: any) => cb({}));
    const handler = new GithubHandler();
    const token = await handler.loadTokenFromStorage();
    expect(token).toBe('');
  });
});
