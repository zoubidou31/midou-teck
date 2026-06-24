module.exports = {
  apps: [
    {
      name: 'midou_teck',
      script: 'dist/index.js',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '512M',
      env: {
        NODE_ENV: 'production',
      },
      log_file: 'logs/pm2.log',
      error_file: 'logs/pm2-error.log',
      out_file: 'logs/pm2-out.log',
      time: true,
      restart_delay: 5000,
      max_restarts: 10,
      min_uptime: '10s',
      exp_backoff_restart_delay: 100,
    },
  ],
};
