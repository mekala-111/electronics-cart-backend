export enum AppEnv {
  Development = 'development',
  Test = 'test',
  Staging = 'staging',
  Production = 'production',
}

const APP_ENV_VALUES = new Set<string>(Object.values(AppEnv));

export function parseAppEnv(value?: string): AppEnv {
  const normalized = (value ?? AppEnv.Development).toLowerCase();
  if (APP_ENV_VALUES.has(normalized)) {
    return normalized as AppEnv;
  }
  return AppEnv.Development;
}

export function isProd(env: AppEnv): boolean {
  return env === AppEnv.Production;
}

export function isDev(env: AppEnv): boolean {
  return env === AppEnv.Development;
}
