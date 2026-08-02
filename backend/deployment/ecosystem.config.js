/**
 * PM2 ecosystem — API cluster + dedicated workers
 * Usage: pm2 start deployment/ecosystem.config.js --update-env
 */
module.exports = {
  apps: [
    {
      name: 'ec-api',
      cwd: __dirname + '/..',
      script: 'dist/main.js',
      // Cap instances — 'max' caused EADDRINUSE storms on aaPanel Node builds
      instances: 2,
      exec_mode: 'cluster',
      env: {
        NODE_ENV: 'production',
        PROCESS_ROLE: 'api',
        DISABLE_WORKERS: 'true',
        TRUST_PROXY: 'true',
        PORT: '3051',
      },
      env_production: {
        NODE_ENV: 'production',
        PROCESS_ROLE: 'api',
        DISABLE_WORKERS: 'true',
        TRUST_PROXY: 'true',
        PORT: '3051',
      },
      max_memory_restart: '1024M',
      kill_timeout: 10_000,
      listen_timeout: 10_000,
      wait_ready: false,
      exp_backoff_restart_delay: 200,
      node_args: '--max-old-space-size=1024',
      out_file: 'logs/api-out.log',
      error_file: 'logs/api-error.log',
      merge_logs: true,
      time: true,
    },
    {
      name: 'ec-worker',
      cwd: __dirname + '/..',
      script: 'dist/main.js',
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'production',
        PROCESS_ROLE: 'worker',
        DISABLE_WORKERS: 'false',
        PORT: '3052',
      },
      env_production: {
        NODE_ENV: 'production',
        PROCESS_ROLE: 'worker',
        DISABLE_WORKERS: 'false',
        PORT: '3052',
      },
      max_memory_restart: '1024M',
      kill_timeout: 30_000,
      exp_backoff_restart_delay: 500,
      node_args: '--max-old-space-size=1024',
      out_file: 'logs/worker-out.log',
      error_file: 'logs/worker-error.log',
      merge_logs: true,
      time: true,
    },
  ],
};
