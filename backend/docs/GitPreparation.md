# Git Preparation

**Do not `git init` until maintainers approve.** This phase only prepares files.

## Files added

- Root `.gitignore`, `.gitattributes`, `CODEOWNERS`, `LICENSE`, `SECURITY.md`, `CONTRIBUTING.md`, `CHANGELOG.md`, `README.md`
- `backend/.gitignore` tightened for `.env*`
- `backend/.env.production.example`

## Before first commit

1. Confirm `backend/.env` and any real secrets are **not** staged.
2. Run secret audit (see SecretManagement.md).
3. `git init` (approval required).
4. Initial commit with meaningful message (e.g. `chore: initial import of electronics cart platform v1.1`).
5. Add remote; push protected `main`.

## Never commit

`.env`, `.env.production`, keys, dumps under `database/reports/backup/`, `node_modules/`, `dist/`, `coverage/`, `logs/`.
