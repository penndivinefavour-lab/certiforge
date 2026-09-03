module.exports = {
  apps: [
    {
      name: "web",
      script: "next dev",
      cwd: path.join(__dirname, "apps/web"),
      env: {
        NODE_ENV: "development",
        DATABASE_URL: "file:./packages/database/dev.db",
      },
      watch: ["apps/web/src"],
    },
    {
      name: "worker",
      script: "tsx watch src/index.ts",
      cwd: path.join(__dirname, "apps/worker"),
      env: {
        NODE_ENV: "development",
        DATABASE_URL: "file:./packages/database/dev.db",
      },
      watch: ["apps/worker/src"],
    },
  ],
};
