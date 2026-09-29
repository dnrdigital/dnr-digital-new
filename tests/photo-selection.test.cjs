const { test } = require("node:test");
const assert = require("node:assert/strict");
const { sourceId, discovery, suitablePhotos, DEFAULT_SOURCE } = require("../lib/photo-selection");
const placeholder = require("../lib/photo-placeholder");

test("unset and legacy Wallpapers configurations select themes; collection and topic overrides remain distinct", () => {
  assert.equal(sourceId({}), DEFAULT_SOURCE);
  assert.equal(sourceId({ UNSPLASH_COLLECTION_ID: "bo8jQKTaE0Y" }), DEFAULT_SOURCE);
  for (const [env, param, value] of [
    [{ UNSPLASH_COLLECTION_ID: "curated" }, "collections", "curated"],
    [{ UNSPLASH_TOPIC_ID: "wallpapers" }, "topics", "wallpapers"],
  ]) {
    const { url } = discovery(sourceId(env), {});
    assert.equal(url.pathname, "/photos/random");
    assert.equal(url.searchParams.get(param), value);
    assert.equal(url.searchParams.has("query"), false);
  }
});

test("searches rotate all three themes and vary phrases and bounded pages", () => {
  const searches = Array.from({ length: 45 }, (_, cursor) => discovery(DEFAULT_SOURCE, {
    cursor, searchPages: { "brutalist architecture": 2 },
  }));
  assert.equal(new Set(searches.slice(0, 3).map((s) => s.theme)).size, 3);
  assert.equal(new Set(searches.slice(0, 9).map((s) => s.query)).size, 9);
  for (const { url } of searches) {
    assert.equal(url.pathname, "/search/photos");
    assert.equal(url.searchParams.get("content_filter"), "high");
    assert.equal(url.searchParams.get("orientation"), "landscape");
    assert.equal(url.searchParams.has("collections"), false);
    assert.ok(Number(url.searchParams.get("page")) <= 2);
  }
  assert.equal(searches[9].url.searchParams.get("page"), "2");
  assert.equal(searches[18].url.searchParams.get("page"), "1");
});

test("selection excludes small, portrait, extreme panorama and unknown dimensions", () => {
  const good = { id: "good", width: 2400, height: 1600 };
  assert.deepEqual(suitablePhotos([good, { width: 1200, height: 800 },
    { width: 2000, height: 3000 }, { width: 6000, height: 1200 }, {}]), [good]);
});

test("valid BlurHash creates a bounded inline preview and invalid metadata falls back safely", () => {
  const uri = placeholder("LL6l0?%gMdIUtRozaeWBDNMwx^x]");
  assert.match(uri, /^data:image\/svg\+xml;base64,/);
  assert.ok(uri.length < 4000);
  const svg = Buffer.from(uri.split(",")[1], "base64").toString();
  assert.match(svg, /feGaussianBlur/);
  assert.doesNotMatch(svg, /https?:\/\/(?!www.w3.org)/);
  for (const value of [null, "", "bad", "x".repeat(101)]) assert.equal(placeholder(value), null);
});
