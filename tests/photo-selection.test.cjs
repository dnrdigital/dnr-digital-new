const { test } = require("node:test");
const assert = require("node:assert/strict");
const { sourceId, discovery, suitablePhotos, DEFAULT_SOURCE } = require("../lib/photo-selection");
const placeholder = require("../lib/photo-placeholder");

test("unset and legacy Wallpapers configurations select curated collections; collection and topic overrides remain distinct", () => {
  assert.equal(sourceId({}), DEFAULT_SOURCE);
  assert.equal(sourceId({ UNSPLASH_COLLECTION_ID: "bo8jQKTaE0Y" }), DEFAULT_SOURCE);
  for (const [env, param, value] of [
    [{ UNSPLASH_COLLECTION_ID: "curated" }, "collections", "curated"],
    [{ UNSPLASH_TOPIC_ID: "wallpapers" }, "topics", "wallpapers"],
  ]) {
    const [{ url }] = discovery(sourceId(env));
    assert.equal(url.pathname, "/photos/random");
    assert.equal(url.searchParams.get(param), value);
    assert.equal(url.searchParams.has("query"), false);
  }
});

test("discovery fetches both curated collections in both orientations with bounded requests", () => {
  const selections = discovery(DEFAULT_SOURCE);
  assert.equal(selections.length, 4);
  assert.equal(new Set(selections.map(({ id }) => id)).size, 4);
  for (const { url, orientation } of selections) {
    assert.equal(url.pathname, "/photos/random");
    assert.ok(["11978287", "1101855"].includes(url.searchParams.get("collections")));
    assert.equal(url.searchParams.get("orientation"), orientation);
    assert.equal(url.searchParams.get("count"), "30");
    assert.equal(url.searchParams.get("content_filter"), "high");
  }
});

test("selection applies symmetric resolution and aspect limits to portraits and landscapes", () => {
  const landscape = { id: "wide", width: 2400, height: 1600 };
  const portrait = { id: "tall", width: 1600, height: 2400 };
  const images = [landscape, portrait, { width: 1200, height: 800 },
    { width: 6000, height: 1200 }, { width: 1200, height: 6000 }, { width: 2400, height: 2400 }, {}];
  assert.deepEqual(suitablePhotos(images, "landscape"), [landscape]);
  assert.deepEqual(suitablePhotos(images, "portrait"), [portrait]);
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
