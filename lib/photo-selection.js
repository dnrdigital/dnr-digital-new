const COLLECTIONS = [
  { id: "11978287", name: "WEIRD", curator: "Tapage & Boldie" },
  { id: "1101855", name: "Surreal", curator: "Peter Broomfield" },
];
const ORIENTATIONS = ["landscape", "portrait"];
const DEFAULT_SOURCE = "curated-v1";
const LEGACY_TOPIC = "bo8jQKTaE0Y";
const BATCH_SIZE = 20;

function sourceId(env = process.env) {
  if (env.UNSPLASH_TOPIC_ID?.trim()) return `topic:${env.UNSPLASH_TOPIC_ID.trim()}`;
  const collection = env.UNSPLASH_COLLECTION_ID?.trim();
  return !collection || collection === LEGACY_TOPIC ? DEFAULT_SOURCE : collection;
}

function discovery(source) {
  const sources = source === DEFAULT_SOURCE ? COLLECTIONS.map(({ id }) => id) : [source];
  return sources.flatMap((id) => ORIENTATIONS.map((orientation) => {
    const url = new URL("https://api.unsplash.com/photos/random");
    url.search = new URLSearchParams({ count: "30", orientation, content_filter: "high" });
    url.searchParams.set(id.startsWith("topic:") ? "topics" : "collections", id.replace(/^topic:/, ""));
    return { id: `${id}:${orientation}`, orientation, url };
  }));
}

function photoOrientation(photo) {
  if (!Number.isFinite(photo?.width) || !Number.isFinite(photo?.height) || photo.width === photo.height) return null;
  return photo.width > photo.height ? "landscape" : "portrait";
}

function suitablePhotos(images, orientation) {
  return images.filter((photo) => photoOrientation(photo) === orientation &&
    Math.max(photo.width, photo.height) >= 1920 && Math.min(photo.width, photo.height) >= 1080 &&
    Math.max(photo.width, photo.height) / Math.min(photo.width, photo.height) <= 2.5);
}

module.exports = { COLLECTIONS, ORIENTATIONS, BATCH_SIZE, DEFAULT_SOURCE, sourceId, discovery, suitablePhotos, photoOrientation };
