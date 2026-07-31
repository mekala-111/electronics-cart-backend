# CI/CD

Workflow: `.github/workflows/backend-ci.yml`

Jobs:
1. Lint · Test · Build (Prisma validate on locked schema)
2. Docker build (API + worker images)
3. Optional deploy on `workflow_dispatch` with `deploy=true` (SSH + health-check)

Required secrets for deploy: `PROD_HOST`, `PROD_USER`, `PROD_SSH_KEY`, `PROD_APP_PATH`.

Rollback: SSH and run `backend/deployment/rollback.sh <sha>`.
