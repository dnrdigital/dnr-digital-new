const COOKIE = "dnr_photos";
const MAX_HISTORY = 90;
function readHistory(cookie = "") {
  try {
    const value = cookie.split(";").map((s) => s.trim()).find((s) => s.startsWith(`${COOKIE}=`));
    const parsed = JSON.parse(decodeURIComponent(value?.slice(COOKIE.length + 1) || "[]"));
    return Array.isArray(parsed) ? parsed.filter((id) => typeof id === "string" && /^[\w-]{1,40}$/.test(id)).slice(-MAX_HISTORY) : [];
  } catch { return []; }
}
function choosePhoto(images, history = [], exclude = "", random = Math.random) {
  const available = images.filter((image) => image.id !== exclude);
  let candidates = available.filter((image) => !history.includes(image.id));
  let nextHistory = history.filter((id) => images.some((image) => image.id === id));
  if (!candidates.length) {
    candidates = available.filter((image) => image.id !== history.at(-1));
    if (!candidates.length) candidates = available;
    nextHistory = [];
  }
  const photo = candidates[Math.floor(random() * candidates.length)] || null;
  return { photo, history: photo ? [...nextHistory, photo.id].slice(-MAX_HISTORY) : nextHistory };
}
function historyCookie(history, secure = process.env.NODE_ENV === "production") {
  return `${COOKIE}=${encodeURIComponent(JSON.stringify(history))}; Path=/; Max-Age=2592000; HttpOnly; SameSite=Lax${secure ? "; Secure" : ""}`;
}
module.exports = { readHistory, choosePhoto, historyCookie };
