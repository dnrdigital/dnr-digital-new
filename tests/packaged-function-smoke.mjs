// Run with a packaged function path, outside the repository's node_modules tree:
// node tests/packaged-function-smoke.mjs /tmp/function/netlify/functions/refresh-photos.mjs
// All credentials are synthetic and all HTTP is intercepted: no network or live writes.
import assert from "node:assert/strict";
import { pathToFileURL } from "node:url";

assert.ok(process.argv[2], "Pass the packaged refresh-photos.mjs path");
process.env.UNSPLASH_ACCESS_KEY = "smoke-test-key";
process.env.UNSPLASH_COLLECTION_ID = "smoke-test-collection";
process.env.NETLIFY_BLOBS_CONTEXT = Buffer.from(JSON.stringify({
  siteID: "smoke-test-site", token: "smoke-test-token",
  edgeURL: "https://blobs.invalid", uncachedEdgeURL: "https://blobs.invalid",
})).toString("base64");
let saved = null;
let revision = 0;
let discoveries = 0;
let writes = 0;
const photo = { id: "smoke-photo", urls: { full: "https://images.unsplash.com/smoke-photo?ixid=test" },
  user: { name: "Smoke Photographer", username: "smoke-photographer" } };
globalThis.fetch = async (input, options = {}) => {
  const url = new URL(input);
  if (url.hostname === "api.unsplash.com") {
    discoveries++;
    assert.equal(options.headers.Authorization, "Client-ID smoke-test-key");
    assert.equal(url.searchParams.get("collections"), "smoke-test-collection");
    return Response.json([photo], { headers: { "x-ratelimit-remaining": "49" } });
  }
  assert.equal(url.hostname, "blobs.invalid", "Unexpected HTTP target; real network is never used");
  assert.ok(url.pathname.includes("unsplash-photos/pool-smoke-test-collection"));
  const method = (options.method || "GET").toUpperCase();
  if (method === "GET") {
    return saved ? Response.json(saved, { headers: { etag: String(revision) } }) : new Response(null, { status: 404 });
  }
  assert.equal(method, "PUT");
  const headers = new Headers(options.headers);
  if (saved) assert.equal(headers.get("if-match"), String(revision));
  else assert.equal(headers.get("if-none-match"), "*");
  saved = JSON.parse(typeof options.body === "string" ? options.body : await options.body.text());
  writes++;
  return new Response(null, { status: 200, headers: { etag: String(++revision) } });
};
const { default: handler } = await import(pathToFileURL(process.argv[2]).href);
const production = { deploy: { context: "production", published: true } };
assert.equal((await handler(null, production)).status, 204);
assert.equal(saved.status, "fresh");
assert.equal(saved.images[0].id, photo.id);
assert.equal(writes, 2, "Reservation and completed snapshot both written");
assert.equal(discoveries, 1);
await handler(null, production);
assert.equal(discoveries, 1, "Cooldown must prevent a second discovery request");
await handler(null, { deploy: { context: "deploy-preview", published: false } });
assert.equal(writes, 2, "Preview must not write");
console.log("Packaged function passed: SDK loads, refresh persists, cooldown and preview guard work (mock HTTP only).");
