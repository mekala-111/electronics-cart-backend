import { Global, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { StorageHealthService } from './storage.health';
import { StorageService } from './storage.service';

@Global()
@Module({
  imports: [ConfigModule],
  providers: [StorageService, StorageHealthService],
  exports: [StorageService, StorageHealthService],
})
export class StorageModule {}
