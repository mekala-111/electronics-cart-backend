# Deployment Safety

## Order

1. Git pull (ff-only)  
2. `pnpm install --frozen-lockfile`  
3. Prisma generate + build  
4. Env validation  
5. DB migrate + **reference** seeds (`APPLY_DEMO_DATA=0`)  
6. PM2 reload (`ecosystem.config.js`)  
7. Health + verify scripts  
8. On failure: checkout previous SHA, rebuild, reload PM2  

Entry: `backend/deployment/deploy.sh`

## Database rollback (production)

**Do not** run DROP-based phase rollbacks against production.

1. Stop traffic / scale down API+worker  
2. Restore PostgreSQL from last verified backup (`pg_restore` / snapshot)  
3. Restore Redis if session/queue consistency required  
4. Deploy previous app revision (`rollback.sh <sha>`)  
5. Health check + smoke payments/shipping webhooks  
6. Confirm `_prisma_migrations` checksums match the restored tree  

## App-only rollback

`backend/deployment/rollback.sh <git-sha>` — code only; DB remains on backup restore if schema changed (v1.0 locked → rare).
