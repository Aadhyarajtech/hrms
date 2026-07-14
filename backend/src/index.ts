import { createApp } from "@/app";
import { runMigrations } from "@/db/connection";
import { env } from "@/config/env";
import { logger } from "@/utils/logger";

runMigrations();

const app = createApp();

app.listen(env.port, () => {
  logger.info(`Aadhyaraj HRMS API listening on http://localhost:${env.port}`, { env: env.nodeEnv });
});
