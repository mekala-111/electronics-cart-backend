export interface StoragePutOptions {
  contentType?: string;
  metadata?: Record<string, string>;
}

export interface StorageDriver {
  put(
    key: string,
    body: Buffer | string,
    options?: StoragePutOptions,
  ): Promise<void>;
  get(key: string): Promise<Buffer>;
  delete(key: string): Promise<void>;
  getSignedUrl(key: string, expiresInSeconds?: number): Promise<string>;
}
