# Changesets

Toda mudança visível ao usuário ou à API precisa de um changeset: rode `pnpm changeset` e
commite o arquivo gerado junto com a mudança.

Os pacotes `@kokka/*` são versionados juntos (`fixed`). Fluxo de release:

1. `pnpm version-packages` — aplica os changesets, sobe as versões e escreve os `CHANGELOG.md`
2. Commit `chore(repo): release vX.Y.Z` via PR
3. Depois do merge no `main`: `pnpm release:tag` e `git push origin vX.Y.Z`
