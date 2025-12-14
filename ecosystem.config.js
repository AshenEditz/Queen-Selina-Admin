module.exports = {
  apps: [{
    name: 'selina-md',
    script: 'index.js',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '500M',
    env: {
      NODE_ENV: 'production'
    },
    error_file: './logs/error.log',
    out_file: './logs/out.log',
    log_file: './logs/combined.log',
    time: true,
    cron_restart: '0 */6 * * *', // Restart every 6 hours
    min_uptime: '10s',
    max_restarts: 10,
    restart_delay: 4000
  }]
};
