const { test } = require("node:test");
const assert = require("node:assert/strict");
const { choosePhoto, readHistory, historyCookie } = require("../lib/photo-rotation");
const images = ["one", "two", "three"].map((id) => ({ id }));
test("visits exhaust the pool before repeating and do not repeat across cycle boundaries", () => {
  let history = [], last, visited = [];
  for (let i = 0; i < 9; i++) {
    const next = choosePhoto(images, history, "", () => 0);
    assert.notEqual(next.photo.id, last);
    history = readHistory(historyCookie(next.history));
    visited.push(next.photo.id);
    last = next.photo.id;
  }
  for (let i = 0; i < 9; i += 3) assert.equal(new Set(visited.slice(i, i + 3)).size, 3);
});
test("exclude prevents current image returning even without cookies", () => {
  assert.equal(choosePhoto(images, [], "one", () => 0).photo.id, "two");
  assert.equal(choosePhoto([{ id: "one" }], [], "one").photo, null);
});
test("changed pools discard old IDs and select unseen additions", () => {
  const next = choosePhoto(images, ["removed", "one", "two"]);
  assert.equal(next.photo.id, "three");
  assert.ok(!next.history.includes("removed"));
});
test("malformed cookies are ignored and output is private, bounded and host-only", () => {
  for (const cookie of ["dnr_photos=%ZZ", "dnr_photos=%7B%7D", 'dnr_photos=[null,1,"bad space"]']) assert.deepEqual(readHistory(cookie), []);
  assert.equal(readHistory(historyCookie(Array.from({ length: 120 }, (_, i) => String(i)))).length, 90);
  const cookie = historyCookie(["one"], true);
  assert.match(cookie, /HttpOnly; SameSite=Lax; Secure/);
  assert.ok(!cookie.includes("Domain="));
});
test("empty pool returns no photo", () => assert.equal(choosePhoto([]).photo, null));

test("orientation changes preserve separate repeat history and reset only the exhausted orientation", () => {
  const pool = [
    { id: "wide-a", width: 2400, height: 1600 }, { id: "wide-b", width: 2400, height: 1600 },
    { id: "tall-a", width: 1600, height: 2400 }, { id: "tall-b", width: 1600, height: 2400 },
  ];
  const first = choosePhoto(pool, [], "", () => 0, "landscape");
  assert.equal(first.photo.id, "wide-a");
  const portrait = choosePhoto(pool, first.history, first.photo.id, () => 0, "portrait");
  assert.equal(portrait.photo.id, "tall-a");
  const next = choosePhoto(pool, portrait.history, portrait.photo.id, () => 0, "landscape");
  assert.equal(next.photo.id, "wide-b");
  const reset = choosePhoto(pool, next.history, next.photo.id, () => 0, "landscape");
  assert.equal(reset.photo.id, "wide-a");
  assert.ok(reset.history.includes("tall-a"));
  assert.equal(choosePhoto(pool, reset.history, reset.photo.id, () => 0, "portrait").photo.id, "tall-b");
});

test("missing orientation falls back to usable photos without repeating the current photo", () => {
  const pool = [{ id: "wide", width: 2400, height: 1600 }];
  assert.equal(choosePhoto(pool, [], "", () => 0, "portrait").photo.id, "wide");
  assert.equal(choosePhoto(pool, [], "wide", () => 0, "portrait").photo, null);
});
