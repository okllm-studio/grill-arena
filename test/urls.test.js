import { test } from "node:test";
import assert from "node:assert/strict";
import { playerUrls } from "../src/urls.js";

test("without a public URL, player URLs are the local network addresses", () => {
  assert.deepEqual(playerUrls({ port: 4242, addresses: ["192.168.1.10", "10.0.0.2"] }), [
    "http://192.168.1.10:4242/",
    "http://10.0.0.2:4242/",
  ]);
});

test("without a local address, it falls back to 127.0.0.1", () => {
  assert.deepEqual(playerUrls({ port: 4242, addresses: [] }), ["http://127.0.0.1:4242/"]);
});

test("a public URL replaces the local addresses", () => {
  assert.deepEqual(
    playerUrls({ port: 4242, addresses: ["192.168.1.10"], publicUrl: "https://abc.trycloudflare.com" }),
    ["https://abc.trycloudflare.com/"],
  );
});

test("a blank public URL is ignored", () => {
  assert.deepEqual(playerUrls({ port: 4242, addresses: ["192.168.1.10"], publicUrl: "  " }), [
    "http://192.168.1.10:4242/",
  ]);
});
