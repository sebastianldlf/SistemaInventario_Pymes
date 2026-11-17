import { spawn } from "node:child_process";
import { mkdirSync } from "node:fs";
import path from "node:path";

mkdirSync(path.resolve("reports/junit"), { recursive: true });

const mock = spawn(process.execPath, ["tests/postman/mock-server.mjs"], {
  stdio: ["ignore", "pipe", "inherit"],
  env: { ...process.env, MOCK_API_PORT: "3002" },
});

mock.stdout.on("data", (chunk) => {
  const msg = chunk.toString();
  process.stdout.write(msg);
  if (msg.includes("Mock API listening")) {
    const newman = spawn(
      process.execPath,
      [
        "node_modules/newman/bin/newman.js",
        "run",
        "tests/postman/tarima-mobile-api.postman_collection.json",
        "-e",
        "tests/postman/local.postman_environment.json",
        "--reporters",
        "cli,junit",
        "--reporter-junit-export",
        "reports/junit/newman-junit.xml",
      ],
      { stdio: "inherit" },
    );

    newman.on("exit", (code) => {
      mock.kill();
      process.exit(code ?? 1);
    });
  }
});

mock.on("error", (err) => {
  console.error("Failed to start mock server:", err);
  process.exit(1);
});
