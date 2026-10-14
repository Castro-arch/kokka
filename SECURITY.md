# Security Policy

## Reporting a vulnerability

Do **not** open a public issue, discussion or pull request for security problems.

Report privately through [GitHub private vulnerability reporting](https://github.com/Castro-arch/kokka/security/advisories/new). Include steps to reproduce, the affected area and the potential impact.

You will receive an acknowledgement within 3 business days.

## Scope

Kokka handles personal photos and videos from event guests. Issues that matter most:

- Access to media from another event or after expiration
- Bypassing the admin session guard or the venue screen access control
- Leaking storage credentials or signed URLs beyond their intended lifetime
- Uploads that bypass type, size or rate limits

## Supported versions

Only the latest release on `main` receives security fixes.
