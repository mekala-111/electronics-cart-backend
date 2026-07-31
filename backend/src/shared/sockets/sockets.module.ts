import { Module } from '@nestjs/common';
import { RoomManager } from './room.manager';

@Module({
  providers: [RoomManager],
  exports: [RoomManager],
})
export class SocketsModule {}
