# Folder Structure

```
backend/
  src/
    main.ts                 # bootstrap: helmet, cors, swagger, pipes
    app.module.ts           # root wiring + global guards/filters
    config/                 # @nestjs/config registerAs loaders
    database/               # PrismaService, health indicator
    core/
      auth/                 # JwtModule + guard exports (no login)
      errors/               # AppException, codes, Prisma mapper
      response/             # success/error envelope + interceptor
    common/
      constants/
      decorators/           # Public, Roles, Permissions, CurrentUser
      filters/
      guards/
      interceptors/
      middleware/
      pipes/
      utils/
      types/
      interfaces/
      testing/
    shared/
      cache/
      lock/                 # Redis distributed locks
      idempotency/          # Idempotency-Key interceptor + service
      events/               # Domain EventBus / publisher / DLQ stub
      workflow/             # SagaCoordinator (in-memory workflow state)
      context/              # TransactionContext (correlation ALS)
      state-machine/        # Delivery/lifecycle StateMachineEngine
      case-management/      # CaseManager (SLA, assignment, timeline)
      queue/
      storage/
      mail/
      logger/
      sockets/
    modules/
      health/
      auth/
      catalog/              # product catalog (public + admin)
      inventory/            # warehouses, stock, reservations, GRN
      orders/               # cart, checkout saga, fulfillment
      payments/             # gateways, capture, refunds, webhooks
      shipping/             # Shiprocket, tracking, reverse, RTO
      template/             # reference module layout for future domains
    jobs/
    events/
  templates/email/
  test/mocks/
  docs/
  Dockerfile
  docker-compose.yml
  .env.example
```

Future domain modules (auth, catalog, orders, …) must follow `modules/template/` layout:

`controllers/ services/ repositories/ dto/ entities/ interfaces/ mappers/ validators/ events/`
