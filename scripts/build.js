// scripts/build.js
import { build } from "esbuild";
import { rmSync, mkdirSync } from "fs";
import path from "path";

const domains = ["auth", "users", "todos"]; // expand as needed

rmSync("dist", { recursive: true, force: true });

for (const domain of domains) {
  const entry = `infra/domains/${domain}/index.js`;
  const outfile = `infra/dist/${domain}/index.js`;

  mkdirSync(path.dirname(outfile), { recursive: true });

  await build({
    entryPoints: [entry],
    bundle: true,
    platform: "node",
    target: "node22",
    absWorkingDir: process.cwd(), // 🔑 resolve from project root
    alias: {
      infra: path.resolve("infra"),
    },
    outfile,
    external: [
      "@aws-sdk/client-ssm",
      "@aws-sdk/client-ses",
      "@aws-sdk/client-dynamodb",
      "@aws-sdk/lib-dynamodb",
      "aws-sdk", // optional fallback
    ],
  });

  console.log(`✅ Built domain: ${domain}`);
}
