const { test } = require("node:test");
const assert = require("node:assert/strict");
const loadBackground = require("../lib/load-background");
const photo = { urls: { full: "https://images.unsplash.com/photo-test?ixid=track" } };

test("preloading waits for decoding, preserves tracking, and rejects decode or abort failures", async () => {
  const oldWindow = global.window;
  let image, completeDecode;
  global.window = { Image: class {
    constructor() { image = this; }
    decode() { return new Promise((resolve, reject) => { completeDecode = { resolve, reject }; }); }
    removeAttribute(name) { delete this[name]; }
  } };
  try {
    let completed = false;
    const controller = new AbortController();
    const promise = loadBackground(photo, controller.signal).then((data) => { completed = true; return data; });
    assert.match(image.srcset, /ixid=track/);
    image.onload();
    await Promise.resolve();
    assert.equal(completed, false);
    completeDecode.resolve();
    assert.equal(await promise, photo);

    const broken = loadBackground(photo, controller.signal);
    image.onload();
    completeDecode.reject(new Error("invalid pixels"));
    await assert.rejects(broken, /decoded/);

    const aborted = loadBackground(photo, controller.signal);
    image.onload();
    controller.abort();
    await assert.rejects(aborted, /cancelled/);
    completeDecode.resolve(); // Late decode completion must not revive a cancelled photo.
    assert.equal(image.src, undefined);
  } finally { global.window = oldWindow; }
});
