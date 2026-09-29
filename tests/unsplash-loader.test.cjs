const { test } = require("node:test");
const assert = require("node:assert/strict");
const loader = require("../lib/unsplash-loader");

test("resizes on the Unsplash CDN without dropping photo tracking parameters", () => {
  const url = new URL(loader({ src: "https://images.unsplash.com/photo-one?ixid=tracking&ixlib=rb-4.0.3&q=85", width: 640 }));
  assert.equal(url.origin, "https://images.unsplash.com");
  assert.equal(url.searchParams.get("ixid"), "tracking");
  assert.equal(url.searchParams.get("ixlib"), "rb-4.0.3");
  assert.equal(url.searchParams.get("w"), "640");
  assert.equal(url.searchParams.get("q"), "65");
  assert.equal(url.searchParams.get("auto"), "format");
  assert.equal(url.searchParams.get("fit"), "max");
});

test("respects an explicit quality supplied by the image component", () => {
  const url = new URL(loader({ src: "https://images.unsplash.com/photo-one", width: 1920, quality: 60 }));
  assert.equal(url.searchParams.get("q"), "60");
});
