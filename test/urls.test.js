import { test } from "node:test";
import assert from "node:assert/strict";
import { urlsJoueurs } from "../src/urls.js";

test("sans URL publique, les URL Joueurs sont celles des adresses du réseau local", () => {
  assert.deepEqual(urlsJoueurs({ port: 4242, adresses: ["192.168.1.10", "10.0.0.2"] }), [
    "http://192.168.1.10:4242/",
    "http://10.0.0.2:4242/",
  ]);
});

test("sans adresse locale, on retombe sur 127.0.0.1", () => {
  assert.deepEqual(urlsJoueurs({ port: 4242, adresses: [] }), ["http://127.0.0.1:4242/"]);
});

test("avec une URL publique, elle remplace les adresses locales", () => {
  assert.deepEqual(
    urlsJoueurs({ port: 4242, adresses: ["192.168.1.10"], publique: "https://abc.trycloudflare.com" }),
    ["https://abc.trycloudflare.com/"],
  );
});

test("une URL publique vide est ignorée", () => {
  assert.deepEqual(urlsJoueurs({ port: 4242, adresses: ["192.168.1.10"], publique: "  " }), [
    "http://192.168.1.10:4242/",
  ]);
});
