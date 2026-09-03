// CertiForge Config - Version and app metadata
export const APP_VERSION = "0.1.0";
export const APP_NAME = "CertiForge";

export const CONFIG = {
  appName: APP_NAME,
  appVersion: APP_VERSION,
  env: process.env.NODE_ENV || "development",
  port: parseInt(process.env.PORT || "3000"),
  databaseUrl: process.env.DATABASE_URL,
  verificationUrl: process.env.VERIFICATION_URL || "http://localhost:3000",
};
