// API HTTP : adaptateur fin sur la Séance.
import { timingSafeEqual } from "node:crypto";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import express from "express";
import { Seance, Refus } from "./seance.js";
import { creerStockage } from "./stockage.js";

const racine = join(dirname(fileURLToPath(import.meta.url)), "..");
const fichiersClients = {
  "/vendor/marked.js": join(racine, "node_modules/marked/lib/marked.umd.js"),
  "/vendor/qrcode.js": join(racine, "node_modules/qrcode-generator/qrcode.js"),
};

/**
 * @param {{port: number, dossier: string, jeton: string, hote?: string, urlsJoueurs?: string[]}} options
 *   `urlsJoueurs` : adresses à afficher (et en QR code) sur la page de l'Animateur.
 * @returns {Promise<{url: string, port: number, fermer: () => Promise<void>}>}
 */
export async function demarrer({ port, dossier, jeton, hote = "0.0.0.0", urlsJoueurs = [] }) {
  const stockage = creerStockage(dossier);
  const enCours = stockage.derniereEnCours();
  let seance = enCours && Seance.restaurer(enCours);
  /** etapeId → réponses de long-poll en attente de la clôture */
  const enAttente = new Map();
  /** Flux SSE ouverts par les pages */
  const abonnes = new Set();
  const app = express();
  app.use(express.json());
  app.use(express.static(join(racine, "public")));
  for (const [chemin, fichier] of Object.entries(fichiersClients)) {
    app.get(chemin, (req, res) => res.sendFile(fichier));
  }

  // Toute requête qui modifie la Séance est suivie d'une sauvegarde et d'un signal aux pages,
  // qui relisent alors l'état qui leur est visible.
  app.use((req, res, next) => {
    if (req.method !== "GET") {
      res.on("finish", () => {
        if (seance) stockage.enregistrer(seance.toJSON());
        for (const abonne of abonnes) abonne.write("event: changement\ndata: {}\n\n");
      });
    }
    next();
  });

  app.get("/api/evenements", (req, res) => {
    res.set({ "content-type": "text/event-stream", "cache-control": "no-cache", connection: "keep-alive" });
    res.flushHeaders();
    res.write(": ouvert\n\n");
    const battement = setInterval(() => res.write(": battement\n\n"), 25_000);
    abonnes.add(res);
    res.on("close", () => {
      clearInterval(battement);
      abonnes.delete(res);
    });
  });

  const seanceActive = () => {
    if (!seance) throw new Refus(409, "Aucune Séance démarrée");
    return seance;
  };

  // Réservé à Claude et à l'Animateur : jeton en en-tête Bearer ou en paramètre `jeton`.
  const jetonValide = (req) => memeJeton(req.get("authorization")?.replace(/^Bearer /, "") ?? req.query.jeton ?? "", jeton);
  // Un Joueur qui s'identifie sans avoir le droit reçoit 403 ; sans identification du tout, 401.
  const refuser = (req, res) => {
    const joueurId = req.body?.joueur ?? req.query.joueur;
    if (joueurId) return res.status(403).json({ erreur: "Réservé à l'Animateur" });
    res.status(401).json({ erreur: "Jeton Animateur requis" });
  };
  const animateurSeul = (req, res, next) => (jetonValide(req) ? next() : refuser(req, res));
  // Ouvrir et clore : l'Animateur, ou un Co-animateur désigné qui s'identifie par son identité de Joueur.
  const animateurOuCoAnimateur = (req, res, next) => {
    const joueurId = req.body?.joueur ?? req.query.joueur;
    if (jetonValide(req) || (seance && joueurId && seance.estCoAnimateur(joueurId))) return next();
    refuser(req, res);
  };

  app.post("/api/seance", animateurSeul, (req, res) => {
    // garantit l'ordre des Séances même si deux démarrent dans la même milliseconde
    const demarreeLe = Math.max(Date.now(), (seance?.demarreeLe ?? 0) + 1);
    if (seance) stockage.enregistrer(seance.toJSON());
    seance = new Seance({ titre: req.body.titre, prompt: req.body.prompt ?? "", demarreeLe });
    res.status(201).json({ id: seance.id });
  });

  app.put("/api/seance/prompt", animateurSeul, (req, res) => {
    seanceActive().definirPrompt(req.body.prompt);
    res.json({ prompt: seanceActive().prompt });
  });

  app.put("/api/seance/repartition-en-direct", animateurSeul, (req, res) => {
    seanceActive().regler({ repartitionEnDirect: req.body.actif });
    res.json({ actif: seanceActive().repartitionEnDirect });
  });

  app.put("/api/seance/co-animateurs/:joueurId", animateurSeul, (req, res) => {
    seanceActive().designerCoAnimateur(req.params.joueurId);
    res.json({ coAnimateur: true });
  });

  app.delete("/api/seance/co-animateurs/:joueurId", animateurSeul, (req, res) => {
    seanceActive().revoquerCoAnimateur(req.params.joueurId);
    res.json({ coAnimateur: false });
  });

  app.post("/api/etapes", animateurSeul, (req, res) => {
    const etape = seanceActive().publier(req.body);
    res.status(201).json({ id: etape.id });
  });

  app.post("/api/etapes/:id/ouverture", animateurOuCoAnimateur, (req, res) => {
    seanceActive().ouvrir(req.params.id);
    res.json({ etat: "ouverte" });
  });

  app.post("/api/etapes/:id/cloture", animateurOuCoAnimateur, (req, res) => {
    seanceActive().clore(req.params.id, req.body);
    const resultat = seanceActive().resultat(req.params.id);
    for (const attente of enAttente.get(req.params.id) ?? []) attente.json(resultat);
    enAttente.delete(req.params.id);
    res.json(resultat);
  });

  app.get("/api/etapes/:id/resultat", animateurSeul, (req, res) => {
    const etape = seanceActive().etape(req.params.id);
    if (etape.etat !== "close" && req.query.attendre) {
      if (!enAttente.has(etape.id)) enAttente.set(etape.id, new Set());
      enAttente.get(etape.id).add(res);
      res.on("close", () => enAttente.get(etape.id)?.delete(res));
      return;
    }
    if (etape.etat !== "close") return res.status(202).json({ ouverte: etape.etat === "ouverte", etat: etape.etat });
    res.json(seanceActive().resultat(req.params.id));
  });

  app.get("/api/infos", animateurSeul, (req, res) => res.json({ urlsJoueurs }));

  app.post("/api/seance/statistiques", animateurSeul, (req, res) => {
    seanceActive().publierStatistiques();
    res.json({ publiees: true });
  });

  app.post("/api/seance/fin", animateurSeul, (req, res) => {
    const recapitulatif = seanceActive().terminer();
    res.json({ recapitulatif, statistiques: seanceActive().statistiques() });
  });

  app.post("/api/joueurs", (req, res) => {
    const { joueur, cree } = seanceActive().rejoindre(req.body.pseudo, { reprendre: req.body.reprendre === true });
    res.status(cree ? 201 : 200).json(joueur);
  });

  app.put("/api/etapes/:id/questions/:questionId/reponse", (req, res) => {
    const { joueur, proposition, commentaire } = req.body;
    seanceActive().repondre(req.params.id, req.params.questionId, joueur, { proposition, commentaire });
    res.json(seanceActive().vuePour(joueur));
  });

  app.get("/api/etat", (req, res) => {
    res.json(seance ? seance.vuePour(req.query.joueur, { animateur: jetonValide(req) }) : { seance: null });
  });

  app.use((err, req, res, next) => {
    if (err instanceof Refus) return res.status(err.statut).json({ erreur: err.message, ...err.details });
    next(err);
  });

  const http = await new Promise((resolve) => {
    const s = app.listen(port, hote, () => resolve(s));
  });
  const { port: portReel } = http.address();
  return {
    url: `http://127.0.0.1:${portReel}`,
    port: portReel,
    fermer: () =>
      new Promise((resolve) => {
        http.closeAllConnections();
        http.close(() => resolve());
      }),
  };
}

function memeJeton(fourni, attendu) {
  const a = Buffer.from(String(fourni));
  const b = Buffer.from(attendu);
  return a.length === b.length && timingSafeEqual(a, b);
}
