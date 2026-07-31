import { Injectable } from '@nestjs/common';
import { access, constants, mkdir, unlink, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { ConfigService } from '@nestjs/config';
import { StorageService } from './storage.service';

@Injectable()
export class StorageHealthService {
  constructor(
    private readonly storageService: StorageService,
    private readonly config: ConfigService,
  ) {}

  async check(): Promise<{ status: 'ok' | 'error'; message?: string }> {
    const driver = this.storageService.getDriverName();

    if (driver === 's3') {
      return this.checkS3();
    }

    return this.checkLocal();
  }

  private async checkLocal(): Promise<{ status: 'ok' | 'error'; message?: string }> {
    const basePath = this.config.getOrThrow<string>('storage.localPath');
    const probePath = join(basePath, '.health-probe');

    try {
      await mkdir(basePath, { recursive: true });
      await access(basePath, constants.W_OK);
      await writeFile(probePath, 'ok');
      await unlink(probePath);
      return { status: 'ok' };
    } catch (error) {
      return {
        status: 'error',
        message: error instanceof Error ? error.message : 'Local storage unavailable',
      };
    }
  }

  private async checkS3(): Promise<{ status: 'ok' | 'error'; message?: string }> {
    const adapter = this.storageService.getS3Adapter();
    if (!adapter) {
      return { status: 'error', message: 'S3 adapter not configured' };
    }

    try {
      await adapter.headBucket();
      return { status: 'ok' };
    } catch (error) {
      return {
        status: 'error',
        message: error instanceof Error ? error.message : 'S3 bucket unavailable',
      };
    }
  }
}
