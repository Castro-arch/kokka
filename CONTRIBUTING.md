# Contributing to Kokka

Thanks for helping build Kokka. This guide covers how work moves from a branch to a release.

## Setup

Follow the [Quick start](README.md#quick-start). Use Node 22 LTS and pnpm; Docker is required for Postgres, Redis and local S3 storage.

## Branches

- `main` is always deployable and protected: pull request required, CI must pass, linear history, no force pushes.
- Work on short-lived branches: `feat/<scope>-<description>`, `fix/<scope>-<description>`, `chore/<description>`.
- Keep your branch current with `git rebase origin/main` (never merge `main` into it).
- Pull requests are merged with **Rebase and merge**, so every commit lands on `main` as written.

## Commits

[Conventional Commits 1.0](https://www.conventionalcommits.org/), in English, imperative mood.

```
<type>(<scope>): <subject>
```

| Types                                                                              | Scopes                                                  |
| ---------------------------------------------------------------------------------- | ------------------------------------------------------- |
| `feat` `fix` `refactor` `perf` `test` `docs` `build` `ci` `chore` `style` `revert` | `web` `worker` `db` `shared` `infra` `deps` `ci` `repo` |

- Subject in lowercase, no trailing period, up to 72 characters.
- Body explains **why**, wrapped at 100 characters.
- `BREAKING CHANGE:` footer for incompatible changes; `Refs: #123` for issues.
- **Atomic commits:** one logical change each, and every commit must pass lint, typecheck and tests on its own.
- Never mix refactors and features in the same commit.

Examples:

```
feat(db): add events and media tables
fix(web): reject uploads after event is closed
build(infra): add worker dockerfile with ffmpeg
```

commitlint runs on `commit-msg`; lint-staged runs on `pre-commit`; typecheck and tests run on `pre-push`.

## Dependencies

Stick to the approved stack listed in [CLAUDE.md](CLAUDE.md). Any dependency outside it, including small tooling packages, needs explicit approval before it is added. A dependency goes in the same commit as the code that first uses it.

## Releases

Versioning follows [SemVer](https://semver.org/) and is managed with [Changesets](https://github.com/changesets/changesets).

1. Add a changeset to every user- or API-visible change: `pnpm changeset`.
2. To release, run `pnpm version-packages` on a branch: it consumes the changesets, bumps versions, updates every `CHANGELOG.md` and refreshes the lockfile. Commit the result as `chore(repo): release vX.Y.Z` and open a pull request.
3. Once that pull request is merged, run `pnpm release:tag` on `main` and push the tag: `git push origin vX.Y.Z`.

Before `1.0.0`, each completed roadmap step is a minor release. The first live event marks `v1.0.0`.

## Pull request checklist

- [ ] Branch is rebased on `main`
- [ ] Commits follow the convention and pass individually
- [ ] Changeset added (if user- or API-visible)
- [ ] `.env.example` updated for any new variable
- [ ] Manual test steps described in the PR
