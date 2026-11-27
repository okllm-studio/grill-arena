// HTTP API: thin adapter over the Session.
import { timingSafeEqual } from "node:crypto";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import express from "express";
import { Session, Refusal } from "./session.js";
import { createStorage } from "./storage.js";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const clientFiles = {
  "/vendor/marked.js": join(root, "node_modules/marked/lib/marked.umd.js"),
  "/vendor/qrcode.js": join(root, "node_modules/qrcode-generator/qrcode.js"),
};

/**
 * @param {{port: number, dir: string, token: string, host?: string, playerUrls?: string[], language?: string}} options
 *   `playerUrls`: addresses to show (and as a QR code) on the Facilitator's page.
 *   `language`: initial language of new Sessions (an unsupported value means English).
 * @returns {Promise<{url: string, port: number, close: () => Promise<void>}>}
 */
export async function start({ port, dir, token, host = "0.0.0.0", playerUrls = [], language }) {
  const storage = createStorage(dir);
  /** The loaded Session: none at startup, the Facilitator picks one from the Session list. */
  let session = null;
  /** stepId → long-poll responses waiting for the Step to close */
  const waiting = new Map();
  /** SSE streams opened by the pages */
  const subscribers = new Set();
  const app = express();
  app.use(express.json());
  app.use(express.static(join(root, "public")));
  for (const [path, file] of Object.entries(clientFiles)) {
    app.get(path, (req, res) => res.sendFile(file));
  }

  // Every request that modifies the Session is followed by a save and a signal to the pages,
  // which then re-read the state visible to them.
  app.use((req, res, next) => {
    if (req.method !== "GET") {
      res.on("finish", () => {
        if (session) storage.save(session.toJSON());
        for (const subscriber of subscribers) subscriber.write("event: change\ndata: {}\n\n");
      });
    }
    next();
  });

  app.get("/api/events", (req, res) => {
    res.set({ "content-type": "text/event-stream", "cache-control": "no-cache", connection: "keep-alive" });
    res.flushHeaders();
    res.write(": open\n\n");
    const heartbeat = setInterval(() => res.write(": heartbeat\n\n"), 25_000);
    subscribers.add(res);
    res.on("close", () => {
      clearInterval(heartbeat);
      subscribers.delete(res);
    });
  });

  const activeSession = () => {
    if (!session) throw new Refusal(409, "No Session started");
    return session;
  };

  // Reserved to Claude and the Facilitator: token in a Bearer header or in the `token` parameter.
  const validToken = (req) => sameToken(req.get("authorization")?.replace(/^Bearer /, "") ?? req.query.token ?? "", token);
  // A Player who identifies without having the right gets 403; with no identification at all, 401.
  const refuse = (req, res) => {
    const playerId = req.body?.player ?? req.query.player;
    if (playerId) return res.status(403).json({ error: "Reserved to the facilitator" });
    res.status(401).json({ error: "Facilitator token required" });
  };
  const facilitatorOnly = (req, res, next) => (validToken(req) ? next() : refuse(req, res));
  // Open and close: the Facilitator, or an appointed Co-facilitator identified by their Player identity.
  const facilitatorOrCoFacilitator = (req, res, next) => {
    const playerId = req.body?.player ?? req.query.player;
    if (validToken(req) || (session && playerId && session.isCoFacilitator(playerId))) return next();
    refuse(req, res);
  };

  /** Facilitator state requests waiting for a Session to be loaded. */
  const loadWaiters = new Set();
  const loaded = (next) => {
    session = next;
    for (const answer of [...loadWaiters]) answer();
  };

  const releaseWaiting = (error) => {
    for (const pending of [...waiting.values()].flatMap((set) => [...set])) pending.status(409).json({ error });
    waiting.clear();
  };

  app.post("/api/session", facilitatorOnly, (req, res) => {
    // guarantees the order of Sessions even if two start in the same millisecond
    const startedAt = Math.max(Date.now(), (session?.startedAt ?? 0) + 1);
    if (session) storage.save(session.toJSON());
    releaseWaiting("Session replaced");
    loaded(new Session({ title: req.body.title, prompt: req.body.prompt ?? "", startedAt, language }));
    res.status(201).json({ id: session.id });
  });

  app.get("/api/sessions", facilitatorOnly, (req, res) => {
    res.json(
      storage.list().map(({ id, title, startedAt, ended, steps }) => ({
        id,
        title,
        startedAt,
        ended: ended === true,
        steps: steps.length,
        loaded: session?.id === id,
      })),
    );
  });

  app.post("/api/sessions/:id/load", facilitatorOnly, (req, res) => {
    if (session) throw new Refusal(409, "A Session is already loaded");
    const data = storage.load(req.params.id);
    if (!data) throw new Refusal(404, "Unknown Session");
    loaded(Session.restore(data));
    res.json({ id: session.id });
  });

  // Shelving an unfinished Session, or going back to the Session list from a finished one.
  app.post("/api/session/unload", facilitatorOnly, (req, res) => {
    storage.save(activeSession().toJSON());
    releaseWaiting("Session unloaded");
    session = null;
    res.json({ unloaded: true });
  });

  app.delete("/api/sessions/:id", facilitatorOnly, (req, res) => {
    if (session?.id === req.params.id) throw new Refusal(409, "The loaded Session cannot be deleted");
    if (!storage.remove(req.params.id)) throw new Refusal(404, "Unknown Session");
    res.json({ deleted: true });
  });

  app.put("/api/session/prompt", facilitatorOnly, (req, res) => {
    activeSession().setPrompt(req.body.prompt);
    res.json({ prompt: activeSession().prompt });
  });

  app.put("/api/session/live-distribution", facilitatorOnly, (req, res) => {
    activeSession().configure({ liveDistribution: req.body.enabled });
    res.json({ enabled: activeSession().liveDistribution });
  });

  app.put("/api/session/language", facilitatorOrCoFacilitator, (req, res) => {
    activeSession().setLanguage(req.body.language);
    res.json({ language: activeSession().language });
  });

  app.put("/api/session/co-facilitators/:playerId", facilitatorOnly, (req, res) => {
    activeSession().appointCoFacilitator(req.params.playerId);
    res.json({ coFacilitator: true });
  });

  app.delete("/api/session/co-facilitators/:playerId", facilitatorOnly, (req, res) => {
    activeSession().revokeCoFacilitator(req.params.playerId);
    res.json({ coFacilitator: false });
  });

  app.post("/api/steps", facilitatorOnly, (req, res) => {
    const step = activeSession().publish(req.body);
    res.status(201).json({ id: step.id });
  });

  app.post("/api/steps/:id/opening", facilitatorOrCoFacilitator, (req, res) => {
    activeSession().open(req.params.id);
    res.json({ state: "open" });
  });

  app.post("/api/steps/:id/closing", facilitatorOrCoFacilitator, (req, res) => {
    activeSession().close(req.params.id, req.body);
    const result = activeSession().result(req.params.id);
    for (const pending of waiting.get(req.params.id) ?? []) pending.json(result);
    waiting.delete(req.params.id);
    res.json(result);
  });

  app.get("/api/steps/:id/result", facilitatorOnly, (req, res) => {
    const step = activeSession().step(req.params.id);
    if (step.state !== "closed" && req.query.wait) {
      if (!waiting.has(step.id)) waiting.set(step.id, new Set());
      waiting.get(step.id).add(res);
      res.on("close", () => waiting.get(step.id)?.delete(res));
      return;
    }
    if (step.state !== "closed") return res.status(202).json({ open: step.state === "open", state: step.state });
    res.json(activeSession().result(req.params.id));
  });

  app.get("/api/info", facilitatorOnly, (req, res) => res.json({ playerUrls }));

  app.post("/api/session/statistics", facilitatorOnly, (req, res) => {
    activeSession().publishStatistics();
    res.json({ published: true });
  });

  app.post("/api/session/end", facilitatorOnly, (req, res) => {
    const summary = activeSession().end();
    res.json({ summary, statistics: activeSession().statistics() });
  });

  app.post("/api/players", (req, res) => {
    const { player, created } = activeSession().join(req.body.nickname, { resume: req.body.resume === true });
    res.status(created ? 201 : 200).json(player);
  });

  app.put("/api/steps/:id/questions/:questionId/answer", (req, res) => {
    const { player, option, abstain, comment } = req.body;
    activeSession().answer(req.params.id, req.params.questionId, player, { option, abstain, comment });
    res.json(activeSession().viewFor(player));
  });

  app.get("/api/state", (req, res) => {
    // The Facilitator's request with `wait=1` holds until a Session is loaded (Claude waiting for the Facilitator's choice).
    if (!session && req.query.wait && validToken(req)) {
      const answer = () => {
        loadWaiters.delete(answer);
        res.json(session.viewFor(undefined, { facilitator: true }));
      };
      loadWaiters.add(answer);
      res.on("close", () => loadWaiters.delete(answer));
      return;
    }
    res.json(session ? session.viewFor(req.query.player, { facilitator: validToken(req) }) : { session: null });
  });

  app.use((err, req, res, next) => {
    if (err instanceof Refusal) return res.status(err.httpStatus).json({ error: err.message, ...err.details });
    next(err);
  });

  const http = await new Promise((resolve) => {
    const s = app.listen(port, host, () => resolve(s));
  });
  const { port: actualPort } = http.address();
  return {
    url: `http://127.0.0.1:${actualPort}`,
    port: actualPort,
    close: () =>
      new Promise((resolve) => {
        http.closeAllConnections();
        http.close(() => resolve());
      }),
  };
}

function sameToken(provided, expected) {
  const a = Buffer.from(String(provided));
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}
