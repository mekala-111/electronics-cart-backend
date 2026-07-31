import { Logger } from '@nestjs/common';
import {
  OnGatewayConnection,
  OnGatewayDisconnect,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';

function socketCorsOrigins(): string[] | boolean {
  const raw = process.env.CORS_ORIGINS ?? 'http://localhost:3000,http://localhost:3001';
  const origins = raw
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
    .filter((o) => o !== '*');
  const nodeEnv = (process.env.NODE_ENV ?? process.env.APP_ENV ?? '').toLowerCase();
  if (nodeEnv === 'production' || nodeEnv === 'staging') {
    return origins.length ? origins : false;
  }
  return origins.length ? origins : ['http://localhost:3000'];
}

@WebSocketGateway({
  cors: {
    origin: socketCorsOrigins(),
    credentials: true,
  },
})
export abstract class BaseGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  protected readonly logger = new Logger(this.constructor.name);

  @WebSocketServer()
  protected server!: Server;

  handleConnection(client: Socket): void {
    this.logger.log(`Client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket): void {
    this.logger.log(`Client disconnected: ${client.id}`);
  }
}
