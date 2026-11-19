#!/usr/bin/env node
// Point d'entrée : démarre le serveur et affiche les URL Joueurs / Animateur.
// Variables : GRILL_ARENA_PORT (4242), GRILL_ARENA_DOSSIER (<dépôt>/seances),
// GRILL_ARENA_URL_PUBLIQUE (URL d'un tunnel vers le port, affichée aux Joueurs à la place des adresses locales).
import { randomBytes } from "node:crypto";
import { writeFileSync } from "node:fs";
import { networkInterfaces } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { demarrer } from "./serveur.js";
import { urlsJoueurs as calculerUrlsJoueurs } from "./urls.js";

const racine = join(dirname(fileURLToPath(import.meta.url)), "..");
const port = Number(process.env.GRILL_ARENA_PORT ?? 4242);
const dossier = process.env.GRILL_ARENA_DOSSIER ?? join(racine, "seances");
const jeton = randomBytes(12).toString("base64url");

const adresses = Object.values(networkInterfaces())
  .flat()
  .filter((i) => i.family === "IPv4" && !i.internal)
  .map((i) => i.address);
const urlsJoueurs = calculerUrlsJoueurs({ port, adresses, publique: process.env.GRILL_ARENA_URL_PUBLIQUE });

const serveur = await demarrer({ port, dossier, jeton, urlsJoueurs });

// Le jeton est aussi écrit sur disque, lisible par l'utilisateur seul,
// pour que le skill le retrouve quand le serveur tourne déjà.
writeFileSync(join(dossier, ".jeton"), `${jeton}\n`, { mode: 0o600 });
writeFileSync(join(dossier, ".port"), `${serveur.port}\n`);

console.log(`grill-arena prêt (Séances : ${dossier})`);
// Avec une URL publique, le lien Animateur reste local : le jeton ne passe jamais par le tunnel.
const urlAnimateur = process.env.GRILL_ARENA_URL_PUBLIQUE
  ? [`http://127.0.0.1:${serveur.port}/`]
  : urlsJoueurs;
for (const url of urlsJoueurs) console.log(`  Joueurs    : ${url}`);
for (const url of urlAnimateur) console.log(`  Animateur  : ${url}?jeton=${jeton}`);
console.log(`  API Claude : http://127.0.0.1:${serveur.port}  jeton=${jeton}`);

for (const signal of ["SIGINT", "SIGTERM"]) {
  process.on(signal, async () => {
    await serveur.fermer();
    process.exit(0);
  });
}
