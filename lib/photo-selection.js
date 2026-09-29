// One search per refresh, rotating through three visual directions.
const THEMES = [
  { id: "quiet-monumental", queries: ["brutalist architecture", "minimal concrete architecture", "monumental architecture"] },
  { id: "otherworldly-earth", queries: ["volcanic landscape", "sand dunes", "glacier aerial"] },
  { id: "hidden-patterns", queries: ["aerial farmland", "architectural repetition", "terraced landscape"] },
];
const DEFAULT_SOURCE = "themes-v1";
const LEGACY_TOPIC = "bo8jQKTaE0Y";

function sourceId(env = process.env) {
  if (env.UNSPLASH_TOPIC_ID?.trim()) return `topic:${env.UNSPLASH_TOPIC_ID.trim()}`;
  const collection = env.UNSPLASH_COLLECTION_ID?.trim();
  // Earlier releases incorrectly described the Wallpapers topic ID as a collection.
  // Existing default configurations migrate to the approved search themes.
  return !collection || collection === LEGACY_TOPIC ? DEFAULT_SOURCE : collection;
}

function discovery(source, snapshot) {
  const url = new URL("https://api.unsplash.com/photos/random");
  url.search = new URLSearchParams({ count: "30", orientation: "landscape", content_filter: "high" });
  if (source !== DEFAULT_SOURCE) {
    url.searchParams.set(source.startsWith("topic:") ? "topics" : "collections", source.replace(/^topic:/, ""));
    return { url };
  }
  const cursor = Number.isSafeInteger(snapshot.cursor) && snapshot.cursor >= 0 ? snapshot.cursor : 0;
  const theme = THEMES[cursor % THEMES.length];
  const query = theme.queries[Math.floor(cursor / THEMES.length) % theme.queries.length];
  const maxPage = Math.min(5, Math.max(1, snapshot.searchPages?.[query] || 1));
  const page = Math.floor(cursor / (THEMES.length * theme.queries.length)) % maxPage + 1;
  url.pathname = "/search/photos";
  url.searchParams.delete("count");
  url.searchParams.set("per_page", "30");
  url.searchParams.set("query", query);
  url.searchParams.set("page", String(page));
  url.searchParams.set("order_by", "relevant");
  return { url, theme: theme.id, query, cursor };
}

function suitablePhotos(images) {
  return images.filter((photo) => Number.isFinite(photo.width) && Number.isFinite(photo.height) &&
    photo.width >= 1920 && photo.height >= 1080 && photo.width > photo.height && photo.width / photo.height <= 2.5);
}

module.exports = { THEMES, DEFAULT_SOURCE, sourceId, discovery, suitablePhotos };
