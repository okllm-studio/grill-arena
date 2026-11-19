// Stockage : un fichier JSON par Séance dans un dossier.
import { mkdirSync, readdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { join } from "node:path";

export function creerStockage(dossier) {
  mkdirSync(dossier, { recursive: true });
  return {
    /** Écrit l'état complet de la Séance (écriture atomique). */
    enregistrer(donnees) {
      const fichier = join(dossier, `${donnees.id}.json`);
      writeFileSync(`${fichier}.tmp`, JSON.stringify(donnees, null, 2));
      renameSync(`${fichier}.tmp`, fichier);
    },

    /** La Séance non terminée démarrée en dernier, ou null. */
    derniereEnCours() {
      return (
        readdirSync(dossier)
          .filter((f) => f.endsWith(".json"))
          .map((f) => JSON.parse(readFileSync(join(dossier, f), "utf8")))
          .filter((d) => !d.terminee)
          .sort((a, b) => b.demarreeLe - a.demarreeLe)[0] ?? null
      );
    },
  };
}
