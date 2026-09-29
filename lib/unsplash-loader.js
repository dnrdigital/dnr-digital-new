// Use Unsplash's image CDN directly and preserve its photo-view tracking parameters.
module.exports = function unsplashLoader({ src, width, quality }) {
  const url = new URL(src);
  url.searchParams.set("w", String(width));
  url.searchParams.set("q", String(quality || 75));
  url.searchParams.set("fit", "max");
  url.searchParams.set("auto", "format");
  return url.toString();
};
