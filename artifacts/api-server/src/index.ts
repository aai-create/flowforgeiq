import app from "./app";
import { logger } from "./lib/logger";
import { runMigrations } from "./lib/migrations";
import { seedFab4DemoOnce } from "./lib/seedFab4DemoOnce";

const rawPort = process.env["PORT"];

if (!rawPort) {
  throw new Error(
    "PORT environment variable is required but was not provided.",
  );
}

const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

runMigrations()
  .then(async () => {
    // Seed Fab4Demo org on first boot if it doesn't exist yet.
    // This is intentionally fire-and-forget: seeding failure never prevents startup.
    seedFab4DemoOnce().catch((err) =>
      logger.error({ err }, "seedFab4DemoOnce unexpected rejection"),
    );

    app.listen(port, (err) => {
      if (err) {
        logger.error({ err }, "Error listening on port");
        process.exit(1);
      }

      logger.info({ port }, "Server listening");
    });
  })
  .catch((err) => {
    logger.error({ err }, "Migration failed — server will not start");
    process.exit(1);
  });
