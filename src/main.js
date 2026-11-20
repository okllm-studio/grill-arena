#!/usr/bin/env node
// Entry point: starts the server and prints the Player and Facilitator URLs.
// Variables: GRILL_ARENA_PORT (4242), GRILL_ARENA_DIR (<repository>/sessions),
// GRILL_ARENA_PUBLIC_URL (URL of a tunnel to the port, shown to Players instead of the local addresses),
// GRILL_LANG (initial interface language of new Sessions: en or fr; anything else means en).
import { randomBytes } from "node:crypto";
import { writeFileSync } from "node:fs";
import { networkInterfaces } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { start } from "./server.js";
import { playerUrls as computePlayerUrls } from "./urls.js";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const port = Number(process.env.GRILL_ARENA_PORT ?? 4242);
const dir = process.env.GRILL_ARENA_DIR ?? join(root, "sessions");
const token = randomBytes(12).toString("base64url");

const addresses = Object.values(networkInterfaces())
  .flat()
  .filter((i) => i.family === "IPv4" && !i.internal)
  .map((i) => i.address);
const playerUrls = computePlayerUrls({ port, addresses, publicUrl: process.env.GRILL_ARENA_PUBLIC_URL });

const server = await start({ port, dir, token, playerUrls, language: process.env.GRILL_LANG });

// The token is also written to disk, readable by the user only,
// so that the skill finds it when the server is already running.
writeFileSync(join(dir, ".token"), `${token}\n`, { mode: 0o600 });
writeFileSync(join(dir, ".port"), `${server.port}\n`);

console.log(`grill-arena ready (Sessions: ${dir})`);
// With a public URL, the Facilitator link stays local: the token never goes through the tunnel.
const facilitatorUrls = process.env.GRILL_ARENA_PUBLIC_URL ? [`http://127.0.0.1:${server.port}/`] : playerUrls;
for (const url of playerUrls) console.log(`  Players     : ${url}`);
for (const url of facilitatorUrls) console.log(`  Facilitator : ${url}?token=${token}`);
console.log(`  Claude API  : http://127.0.0.1:${server.port}  token=${token}`);

for (const signal of ["SIGINT", "SIGTERM"]) {
  process.on(signal, async () => {
    await server.close();
    process.exit(0);
  });
}
