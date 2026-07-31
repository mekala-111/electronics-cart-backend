import { mkdir, readFile, unlink, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { StorageDriver, StoragePutOptions } from './storage.types';

export class LocalStorageAdapter implements StorageDriver {
  constructor(private readonly basePath: string) {}

  private resolvePath(key: string): string {
    return join(this.basePath, key);
  }

  async put(
    key: string,
    body: Buffer | string,
    _options?: StoragePutOptions,
  ): Promise<void> {
    const filePath = this.resolvePath(key);
    await mkdir(dirname(filePath), { recursive: true });
    await writeFile(filePath, body);
  }

  async get(key: string): Promise<Buffer> {
    return readFile(this.resolvePath(key));
  }

  async delete(key: string): Promise<void> {
    await unlink(this.resolvePath(key));
  }

  async getSignedUrl(key: string, _expiresInSeconds = 3600): Promise<string> {
    return `file://${this.resolvePath(key)}`;
  }
}
