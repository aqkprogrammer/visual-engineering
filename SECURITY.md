# Security policy

## Supported versions

Only the latest commit on `main` is supported. There are no versioned releases yet.

## Reporting a vulnerability

Please **do not** open a public issue for security problems.

Report privately through GitHub: open the repository's **Security** tab and choose **Report a vulnerability**. If that option is not available, open an issue titled "Security contact request" **without any details**, and the maintainer will arrange a private channel.

Please include what you found, how to reproduce it, and its potential impact. You can expect an acknowledgement within 7 days. Fixes are prioritised by severity, and reporters are credited unless they prefer otherwise.

## Scope and threat model

Visual Engineering is a statically generated website with no backend, no accounts and no user-submitted content at runtime. Relevant risks include:

- **Content and supply chain** — lessons are MDX, which compiles to code. Malicious content or a compromised dependency could execute in readers' browsers. Mitigations: maintainer review on all content (`CODEOWNERS`), a lockfile with frozen installs in CI, pnpm's minimum-release-age guard, Dependabot updates and a production dependency audit in CI.
- **CI/CD** — workflows use least-privilege `permissions`, SHA-pinned actions and checkouts without persisted credentials.
- **Client-side storage** — only the colour theme and learning progress (completed lessons and knowledge-check scores) are stored, in the reader's own browser. Stored progress is validated on every read, so corrupted or tampered data is ignored. Interview practice answers are never stored, and nothing is sent anywhere.

Simulations run entirely in the browser on fixed data. They never execute user-supplied code, call external APIs or touch real infrastructure.
