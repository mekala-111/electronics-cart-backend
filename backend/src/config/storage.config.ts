import { registerAs } from '@nestjs/config';

export type StorageDriver = 'local' | 's3';

function parseStorageDriver(value?: string): StorageDriver {
  return value === 's3' ? 's3' : 'local';
}

export default registerAs('storage', () => {
  const driver = parseStorageDriver(process.env.STORAGE_DRIVER);

  return {
    driver,
    bucket: process.env.STORAGE_BUCKET ?? 'electronics-cart',
    region: process.env.STORAGE_REGION ?? 'us-east-1',
    endpoint: process.env.STORAGE_ENDPOINT ?? '',
    accessKey: process.env.STORAGE_ACCESS_KEY ?? '',
    secretKey: process.env.STORAGE_SECRET_KEY ?? '',
    publicUrl: process.env.STORAGE_PUBLIC_URL ?? 'http://localhost:3000/uploads',
    localPath: process.env.STORAGE_LOCAL_PATH ?? './uploads',
  };
});
