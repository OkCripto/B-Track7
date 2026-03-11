import { spawnSync } from "node:child_process";

function run(command) {
  const result = spawnSync(command, {
    stdio: "inherit",
    shell: true,
    env: process.env,
  });
  if (result.error) {
    throw result.error;
  }
  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

const vercelEnv = process.env.VERCEL_ENV;

if (vercelEnv === "production") {
  run('npx convex deploy --cmd "npm run build"');
} else {
  run("npm run build");
}
