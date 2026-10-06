# Tarunya LeetSync

Tarunya LeetSync is a personal Chrome extension that copies accepted LeetCode submissions into a GitHub repository you control.

## How it works

The extension has two independent credentials:

1. Chrome supplies the LeetCode session cookie when you are logged in. After you submit a problem, the extension detects LeetCode's submit request, waits for the result, and asks LeetCode's GraphQL API for the accepted code, question details, runtime, memory, and notes.
2. A GitHub fine-grained personal access token authorizes GitHub API requests. The repository URL only identifies the destination; it is not authentication. The token is sent to GitHub's API to verify your account, inspect the repository, and create or update files.

For an accepted submission, the extension creates a folder like:

```text
123-two-sum/
├── README.md
├── Notes.md                 # only when LeetCode notes exist
└── two-sum.py               # extension depends on the submitted language
```

If the same problem is submitted again, the existing files are updated using their GitHub blob SHA. Each file update creates a normal GitHub commit through the Contents API.

## Setup

### 1. Create a GitHub token

In GitHub, open `Settings → Developer settings → Personal access tokens → Fine-grained tokens` and create a token with:

- Repository access restricted to the repository you want to use.
- Repository permission `Contents: Read and write`.

Copy the token immediately. GitHub will not show it again. The extension stores the token in Chrome's local extension storage, not synced storage. Revoke it from GitHub whenever you want.

### 2. Build and install the extension

```bash
npm install
npm run build
```

Then open `chrome://extensions`, enable Developer mode, choose **Load unpacked**, and select this project's `build` directory.

### 3. Complete setup

1. Open the Tarunya LeetSync extension.
2. Paste the GitHub token and choose **Verify GitHub token**.
3. Log in to LeetCode when prompted. Keep the LeetCode tab open until the cookie is captured.
4. Paste the full repository URL, for example `https://github.com/TarunyaProgrammer/leetcode-solutions`.
5. Submit an accepted problem on LeetCode.

The dashboard shows the latest GitHub sync result. A failed sync includes the GitHub error message there.

## Why pasting a repository URL is not enough

A repository URL is public information and only contains an owner and repository name. GitHub must still know that the extension is allowed to write to that repository. The fine-grained token proves your identity and grants the `Contents: Read and write` permission. During setup, Tarunya LeetSync calls `GET /user` to validate the token and `GET /repos/{owner}/{repo}` to verify that the selected repository is visible and writable.

## Troubleshooting

- **Token rejected:** create a new token, copy the complete value, and ensure it has not expired.
- **Repository not found:** verify the URL is exactly `https://github.com/owner/repository`; for a private repository, make sure the token's repository access includes it.
- **Can read but cannot push:** edit the token and grant `Contents: Read and write`, then reconnect it.
- **No sync after submitting:** ensure you are on a `leetcode.com/problems/...` page, are logged in, and the submission was accepted. Reload the problem page after installing or updating the extension.
- **A build error mentions `config.production.js`:** that was the upstream OAuth configuration. This fork no longer requires that file; make sure you are building the current source and not an old checkout.

## Development

```bash
npm test -- --watchAll=false
npm run build
```

This fork is intentionally maintained as a personal rebrand and does not use the upstream project's OAuth application or issue tracker.
