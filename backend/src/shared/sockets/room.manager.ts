import { Injectable } from '@nestjs/common';
import { Server } from 'socket.io';

@Injectable()
export class RoomManager {
  join(server: Server, room: string, socketId: string): void {
    server.in(socketId).socketsJoin(room);
  }

  leave(server: Server, room: string, socketId: string): void {
    server.in(socketId).socketsLeave(room);
  }

  emitToRoom<T>(server: Server, room: string, event: string, payload: T): void {
    server.to(room).emit(event, payload);
  }
}
