import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { LocalStorageAdapter } from './local-storage.adapter';
import { S3StorageAdapter } from './s3-storage.adapter';
import { StoragePutOptions } from './storage.types';

@Injectable()
export class StorageService {
  private readonly driver: LocalStorageAdapter | S3StorageAdapter;
  private readonly s3Adapter?: S3StorageAdapter;
  private readonly driverName: 'local' | 's3';

  constructor(private readonly config: ConfigService) {
    this.driverName = this.config.get<'local' | 's3'>('storage.driver', 'local');

    if (this.driverName === 's3') {
      const endpoint = this.config.get<string>('storage.endpoint');
      this.s3Adapter = new S3StorageAdapter({
        endpoint: endpoint || undefined,
        region: this.config.getOrThrow<string>('storage.region'),
        bucket: this.config.getOrThrow<string>('storage.bucket'),
        accessKeyId: this.config.getOrThrow<string>('storage.accessKey'),
        secretAccessKey: this.config.getOrThrow<string>('storage.secretKey'),
        forcePathStyle: Boolean(endpoint),
      });
      this.driver = this.s3Adapter;
      return;
    }

    this.driver = new LocalStorageAdapter(
      this.config.getOrThrow<string>('storage.localPath'),
    );
  }

  getDriverName(): 'local' | 's3' {
    return this.driverName;
  }

  getS3Adapter(): S3StorageAdapter | undefined {
    return this.s3Adapter;
  }

  put(
    key: string,
    body: Buffer | string,
    options?: StoragePutOptions,
  ): Promise<void> {
    return this.driver.put(key, body, options);
  }

  get(key: string): Promise<Buffer> {
    return this.driver.get(key);
  }

  delete(key: string): Promise<void> {
    return this.driver.delete(key);
  }

  getSignedUrl(key: string, expiresInSeconds?: number): Promise<string> {
    return this.driver.getSignedUrl(key, expiresInSeconds);
  }
}
