const { test } = require("node:test");
const assert = require("node:assert/strict");
const { createPoolReader, refreshPool, usableImages, poolKey, HOUR } = require("../lib/image-cache");
const { toPageBackground } = require("../lib/photo-props");
const photo = (id, orientation = "landscape") => ({ id, width: orientation === "landscape" ? 2400 : 1600, height: orientation === "landscape" ? 1600 : 2400, urls: { full: `https://images.unsplash.com/${id}?ixid=track` },
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

test("overlapping refreshes reserve one batch sequence per clock hour and retain tracking metadata", async () => {
  const store = memoryStore();
  let calls = 0;
  const options = { store, key: "test", collection: "curated", now: () => 1000,
    fetchImages: async (url, init) => {
      calls++;
      assert.equal(url.searchParams.get("collections"), "curated");
      assert.ok(["landscape", "portrait"].includes(url.searchParams.get("orientation")));
      assert.equal(url.searchParams.get("content_filter"), "high");
      assert.equal(url.searchParams.get("count"), "30");
      assert.equal(init.headers.Authorization, "Client-ID test");
      return ok([photo(`new-${url.searchParams.get("orientation")}`, url.searchParams.get("orientation"))]);
    } };
  await Promise.all(Array.from({ length: 10 }, () => refreshPool(options)));
  assert.equal(calls, 2);
  assert.equal((await store.get()).images[0].links.download_location, photo("new-landscape").links.download_location);
  assert.equal((await refreshPool(options)).status, "backoff");
  await refreshPool({ ...options, now: () => HOUR + 1000 });
  assert.equal(calls, 4);
});

test("cron jitter refreshes all four batches each hour, capped at 80 photos", async () => {
  const store = memoryStore();
  let calls = 0;
  for (const time of [13 * HOUR + 39 * 60_000, 14 * HOUR + 57_000, 15 * HOUR + 54_000]) {
    const result = await refreshPool({ store, key: "test", now: () => time,
      fetchImages: async (url) => {
        calls++;
        const orientation = url.searchParams.get("orientation");
        return ok(Array.from({ length: 30 }, (_, i) => photo(`${url.searchParams.get("collections")}-${orientation}-${i}`, orientation)));
      } });
    assert.equal(result.status, "fresh");
    assert.equal(result.photos, 80);
    assert.equal(Object.keys(result.batches).length, 4);
    assert.equal(result.nextAttempt, (Math.floor(time / HOUR) + 1) * HOUR);
    assert.equal((await refreshPool({ store, key: "test", now: () => time + 1,
      fetchImages: () => assert.fail("same-hour retry must not request") })).status, "backoff");
  }
  assert.equal(calls, 12);
});

test("a failed refresh waits a full hour even just before the next clock hour", async () => {
  const store = memoryStore();
  const time = HOUR - 1000;
  const result = await refreshPool({ store, key: "test", now: () => time,
    fetchImages: async () => { throw new Error("offline"); } });
  assert.ok(Object.values(result.batches).every((batch) => batch.failure === "request-failed"));
  assert.equal(result.nextAttempt, time + HOUR);
  assert.equal((await refreshPool({ store, key: "test", now: () => HOUR,
    fetchImages: () => assert.fail("failure cooldown must survive hour boundary") })).status, "backoff");
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
    assert.equal(calls, name === "quota exhausted" ? 2 : 8);
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

test("scheduled events without HTTP deploy metadata refresh; preview and invalid events skip", async () => {
  const cache = require("../lib/image-cache");
  const { default: handler } = await import("../netlify/functions/refresh-photos.mjs");
  const originalStore = cache.photoStore, originalRefresh = cache.refreshPool;
  let calls = 0;
  cache.photoStore = () => ({});
  cache.refreshPool = async () => { calls++; return { status: "test-refresh" }; };
  const event = (body = { next_run: "2026-09-29T15:00:00.000Z" }, headers = {}) =>
    new Request("https://example.invalid/refresh-photos", { method: "POST", body: JSON.stringify(body), headers });
  try {
    await handler(event(), { deploy: { context: "", published: false } });
    assert.equal(calls, 1);
    await handler(event(), { deploy: { context: "production", published: true } });
    assert.equal(calls, 2);
    await handler(event(), { deploy: { context: "production", published: false } });
    assert.equal(calls, 3, "A timer may also omit only the published header");
    for (const deploy of [{ context: "deploy-preview", published: false },
      { context: "branch-deploy", published: false }, { context: "production", published: false }]) {
      await handler(event(undefined, { "x-nf-deploy-published": "0" }), { deploy });
    }
    await handler(event({}, {}), { deploy: {} });
    await handler(event({ next_run: "invalid" }), { deploy: {} });
    await handler(event(undefined, { "x-nf-deploy-published": "0" }), { deploy: {} });
    assert.equal(calls, 3, "Only scheduled events and the published production manual run refresh");
  } finally {
    cache.photoStore = originalStore;
    cache.refreshPool = originalRefresh;
  }
});

test("partial failure retains that batch while refreshing the other orientations and collection", async () => {
  const store = memoryStore();
  let round = 0;
  const fetchImages = async (url) => {
    const orientation = url.searchParams.get("orientation");
    const id = `${url.searchParams.get("collections")}-${orientation}`;
    if (round && id === "11978287-portrait") throw new Error("offline");
    return ok([photo(`${id}-${round}`, orientation)]);
  };
  await refreshPool({ store, key: "test", now: () => 0, fetchImages });
  round++;
  const result = await refreshPool({ store, key: "test", now: () => HOUR, fetchImages });
  assert.equal(result.status, "partial");
  assert.equal(result.photos, 4);
  assert.equal((await store.get()).batches["11978287:portrait"].images[0].id, "11978287-portrait-0");
  assert.equal((await store.get()).batches["1101855:portrait"].images[0].id, "1101855-portrait-1");
});

test("a successful response with zero quota stops subsequent requests", async () => {
  const store = memoryStore();
  let calls = 0;
  const result = await refreshPool({ store, key: "test", now: () => 1000, fetchImages: async () => {
    calls++;
    return { ...ok([photo("last")]), headers: new Headers({ "x-ratelimit-remaining": "0" }) };
  } });
  assert.equal(calls, 1);
  assert.equal(result.status, "partial");
  assert.equal(result.photos, 1);
  assert.equal(result.nextAttempt, HOUR + 1000);
});
