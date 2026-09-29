const { test } = require("node:test");
const assert = require("node:assert/strict");
const { createImageCache, toPageBackground } = require("../lib/image-cache");

const photo = (id) => ({ id, urls: { full: `https://images.unsplash.com/${id}` } });
const ok = (images) => ({ ok: true, json: async () => images });

test("without a key, rotates the saved images without calling Unsplash", async () => {
  const get = createImageCache({
    images: [photo("one"), photo("two")],
    accessKey: () => "",
    fetchImages: () => assert.fail("must not fetch without a key"),
  });
  assert.equal((await get()).id, "one");
  assert.equal((await get()).id, "two");
  assert.equal((await get()).id, "one");
});

test("simultaneous requests share a refresh, use the collection and rotate results", async () => {
  let calls = 0;
  let release;
  const get = createImageCache({
    images: [], accessKey: () => "test-key", collection: () => "curated",
    fetchImages: async (url, options) => {
      calls++;
      assert.equal(url.searchParams.get("collections"), "curated");
      assert.equal(url.searchParams.get("count"), "30");
      assert.equal(url.searchParams.get("orientation"), "landscape");
      assert.equal(options.headers.Authorization, "Client-ID test-key");
      assert.ok(options.signal instanceof AbortSignal);
      await new Promise((resolve) => { release = resolve; });
      return ok([photo("new-one"), photo("new-two")]);
    },
  });
  const first = get();
  const second = get();
  release();
  assert.deepEqual((await Promise.all([first, second])).map((x) => x.id), ["new-one", "new-two"]);
  assert.equal(calls, 1);
});

test("refreshes by elapsed time even before all 30 cached images are used", async () => {
  let time = 0;
  let calls = 0;
  const get = createImageCache({
    accessKey: () => "test-key", now: () => time,
    fetchImages: async () => ok([photo(`fetch-${++calls}`)]),
  });
  assert.equal((await get()).id, "fetch-1");
  time = 299999;
  assert.equal((await get()).id, "fetch-1");
  time = 300000;
  assert.equal((await get()).id, "fetch-2");
});

for (const [name, failure] of [
  ["rate limit", async () => ({ ok: false, status: 429 })],
  ["network error", async () => { throw new Error("offline"); }],
  ["timeout", async () => { throw new DOMException("timed out", "TimeoutError"); }],
  ["invalid JSON", async () => ({ ok: true, json: async () => { throw new SyntaxError(); } })],
  ["empty response", async () => ok([])],
  ["wrong response shape", async () => ok({ errors: ["bad response"] })],
]) {
  test(`${name}: serves the last good snapshot and backs off before retrying`, async () => {
    let time = 0;
    let calls = 0;
    const get = createImageCache({
      images: [photo("saved")], accessKey: () => "test-key", now: () => time,
      fetchImages: async () => { calls++; return failure(); },
    });
    assert.equal((await get()).id, "saved");
    assert.equal((await get()).id, "saved");
    assert.equal(calls, 1);
    time = 300000;
    assert.equal((await get()).id, "saved");
    assert.equal(calls, 2);
  });
}

test("unusable or absent photos return null for the page's local fallback", async () => {
  const get = createImageCache({
    images: [null, {}, { urls: { full: "https://example.com/image" } }],
    accessKey: () => "",
  });
  assert.equal(await get(), null);
});

test("a failed refresh with no saved photos still returns the fallback", async () => {
  const get = createImageCache({ images: [], accessKey: () => "test-key", fetchImages: async () => ok([]) });
  assert.equal(await get(), null);
});

test("page props omit unused metadata without changing the cached API photo", async () => {
  const image = {
    ...photo("saved"), color: "#123456", description: "unused metadata",
    user: { name: "Photographer", username: "photographer", bio: "unused profile" },
    links: { download: "https://unsplash.com/download" },
  };
  const get = createImageCache({ images: [image], accessKey: () => "" });
  const apiPhoto = await get();
  const pagePhoto = toPageBackground(apiPhoto);
  assert.equal(pagePhoto.urls.full, image.urls.full);
  assert.equal(pagePhoto.color, image.color);
  assert.deepEqual(pagePhoto.user, { name: "Photographer", username: "photographer" });
  assert.equal(pagePhoto.description, undefined);
  assert.equal(pagePhoto.links, undefined);
  assert.equal(pagePhoto.user.bio, undefined);
  assert.equal(apiPhoto.description, "unused metadata");
  assert.equal(apiPhoto.user.bio, "unused profile");
});

test("page props preserve the empty-cache fallback and are serializable without optional metadata", () => {
  assert.equal(toPageBackground(null), null);
  const minimal = toPageBackground(photo("minimal"));
  assert.deepEqual(JSON.parse(JSON.stringify(minimal)), minimal);
  assert.equal(minimal.color, "#10293a");
  assert.equal(minimal.user.username, null);
});
