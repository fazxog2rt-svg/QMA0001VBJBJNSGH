module.exports = {
  apps: [
    {
      name: "komunitas-bot",
      script: "dist/index.js",
      instances: 1,
      exec_mode: "fork",
      autorestart: true,
      max_memory_restart: "500M",
      watch: false,
      env: {
        NODE_ENV: "production",
      },
      error_file: "src/logs/pm2-error.log",
      out_file: "src/logs/pm2-out.log",
      time: true,
    },
  ],
};
