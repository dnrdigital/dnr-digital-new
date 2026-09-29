const { test } = require("node:test");
const assert = require("node:assert/strict");
const { createPoolReader, refreshPool, toPageBackground, usableImages, poolKey, HOUR } = require("../lib/image-cache");
const photo = (id) => ({ id, urls: { full: `https://images.unsplash.com/${id}?ixid=track` },
  user: { name: "Photographer", username: "photographer" },
  links: { download_location: `https://api.unsplash.com/photos/${id}/download?ixid=track` } });
const ok = (images) => ({ ok: true, headers: new Headers({ "x-ratelimit-remaining": "49" }), json: async () => images });
function memoryStore(initial) {
  let data = initial ? structuredClone(initial) : null;
  let revision = data ? 1 : 0;
  return {
    get: async () => structuredClone(data),
    getWithMetadata: async () => data ? { data: structuredClone(data), etag: String(revision) } : null,
    setJSON: async (_key, value, options = {}) => {
      if ((options.onlyIfNew && data) || (options.onlyIfMatch && options.onlyIfMatch !== String(revision))) return { modified: false };
      data = structuredClone(value);
      return { modified: true, etag: String(++revision) };
    },
  };
}

test("cold readers share durable photos and never need an Unsplash access key", async () => {
  const store = memoryStore({ images: [photo("saved")] });
  const readers = Array.from({ length: 10 }, () => createPoolReader({ store: () => store }));
  assert.deepEqual(await Promise.all(readers.map(async (get) => (await get())[0].id)), Array(10).fill("saved"));
});

test("storage failures preserve last good photos and coalesce concurrent reads", async () => {
  let time = 0, calls = 0;
  const get = createPoolReader({ now: () => time, store: () => ({ get: async () => {
    calls++;
    if (calls > 1) throw new Error("offline");
    return { images: [photo("saved")] };
  } }) });
  await Promise.all([get(), get(), get()]);
  assert.equal(calls, 1);
  time = 60000;
  assert.equal((await get())[0].id, "saved");
  assert.equal(calls, 2);
});

test("missing store uses bundled photos; a custom collection never falls back to unrelated seed photos", async () => {
  const store = () => { throw new Error("unconfigured"); };
  assert.equal((await createPoolReader({ store })()).length, 30);
  assert.deepEqual(await createPoolReader({ store, collection: () => "custom" })(), []);
});

test("overlapping refreshes reserve one request, retain tracking metadata, and limit attempts to hourly", async () => {
  const store = memoryStore();
  let calls = 0;
  const options = { store, key: "test", collection: "curated", now: () => 1000,
    fetchImages: async (url, init) => {
      calls++;
      assert.equal(url.searchParams.get("collections"), "curated");
      assert.equal(url.searchParams.get("orientation"), "landscape");
      assert.equal(url.searchParams.get("content_filter"), "high");
      assert.equal(url.searchParams.get("count"), "30");
      assert.equal(init.headers.Authorization, "Client-ID test");
      return ok([photo("new")]);
    } };
  await Promise.all(Array.from({ length: 10 }, () => refreshPool(options)));
  assert.equal(calls, 1);
  assert.equal((await store.get()).images[0].links.download_location, photo("new").links.download_location);
  assert.equal((await refreshPool(options)).status, "backoff");
  await refreshPool({ ...options, now: () => HOUR + 1000 });
  assert.equal(calls, 2);
});

for (const [name, failure] of [
  ["quota exhausted", async () => ({ ok: false, status: 429, headers: new Headers({ "retry-after": "7200" }) })],
  ["network failure", async () => { throw new Error("offline"); }],
  ["timeout", async () => { throw new DOMException("timeout", "TimeoutError"); }],
  ["malformed JSON", async () => ({ ok: true, json: async () => { throw new SyntaxError(); } })],
  ["empty result", async () => ok([])],
  ["invalid shape", async () => ok({ errors: ["bad"] })],
]) {
  test(`${name}: keep the snapshot across instances and back off`, async () => {
    const store = memoryStore({ images: [photo("saved")] });
    let calls = 0;
    const fetchImages = async (...args) => { calls++; return failure(...args); };
    await refreshPool({ store, key: "test", now: () => 0, fetchImages });
    const state = await store.get();
    assert.equal(state.images[0].id, "saved");
    assert.ok(state.nextAttempt >= HOUR);
    if (name === "quota exhausted") assert.equal(state.nextAttempt, 2 * HOUR);
    assert.equal((await refreshPool({ store, key: "test", now: () => 1, fetchImages })).status, "backoff");
    await refreshPool({ store, key: "test", now: () => state.nextAttempt, fetchImages });
    assert.equal(calls, 2);
    assert.ok((await store.get()).nextAttempt >= state.nextAttempt + 2 * HOUR);
  });
}

test("failed storage reservation makes no upstream request", async () => {
  const store = memoryStore();
  store.setJSON = async () => { throw new Error("storage unavailable"); };
  await assert.rejects(refreshPool({ store, key: "test", fetchImages: () => assert.fail("must not call") }));
});

test("missing key does not write or request; crashes after reservation retain cooldown", async () => {
  const store = memoryStore({ images: [photo("saved")] });
  assert.equal((await refreshPool({ store, key: "" })).status, "missing-key");
  const original = store.setJSON;
  let writes = 0;
  store.setJSON = async (...args) => { if (++writes > 1) throw new Error("write failed"); return original(...args); };
  await assert.rejects(refreshPool({ store, key: "test", now: () => 0, fetchImages: async () => ok([photo("new")]) }));
  assert.equal((await store.get()).images[0].id, "saved");
  assert.equal((await refreshPool({ store, key: "test", now: () => 1 })).status, "backoff");
});

test("rejects duplicate, non-hotlinked and unattributed photos", () => {
  assert.equal(usableImages([photo("one"), photo("one"), null, {},
    { ...photo("bad"), urls: { full: "https://example.com/photo" } },
    { ...photo("no-credit"), user: {} }]).length, 1);
});

test("page props retain stable IDs but omit tracking and unused metadata", () => {
  const original = { ...photo("one"), description: "unused" };
  const result = toPageBackground(original);
  assert.equal(result.id, "one");
  assert.equal(result.links, undefined);
  assert.equal(result.description, undefined);
  assert.equal(original.links.download_location, photo("one").links.download_location);
  assert.equal(toPageBackground(null), null);
  assert.deepEqual(JSON.parse(JSON.stringify(result)), result);
  assert.equal(poolKey("abc"), "pool-abc");
});

test("preview and unpublished scheduled functions cannot write the production pool", async () => {
  const { default: handler, config } = await import("../netlify/functions/refresh-photos.mjs");
  assert.equal(config.schedule, "0 * * * *");
  for (const deploy of [{ context: "deploy-preview", published: false }, { context: "production", published: false }]) {
    assert.equal((await handler(null, { deploy })).status, 204);
  }
});
