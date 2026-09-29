const unsplashLoader = require("./unsplash-loader");
const photoSrcSet = require("./photo-srcset");

// Use the same responsive candidates as next/image, so preparing a transition
// does not fetch a second, oversized copy of the photo.
function loadBackground(photo, signal) {
  return new Promise((resolve, reject) => {
    const image = new window.Image();
    let settled = false;
    const timer = setTimeout(() => finish(new Error("Photo timed out")), 8000);
    function finish(error) {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      signal.removeEventListener("abort", abort);
      image.onload = image.onerror = null;
      if (error) {
        image.removeAttribute("srcset");
        image.removeAttribute("src");
        reject(error);
      } else resolve(photo);
    }
    function abort() { finish(new Error("Photo cancelled")); }
    signal.addEventListener("abort", abort, { once: true });
    if (signal.aborted) return abort();
    image.onload = async () => {
      try { await image.decode(); finish(); }
      catch { finish(new Error("Photo could not be decoded")); }
    };
    image.onerror = () => finish(new Error("Photo unavailable"));
    image.sizes = "100vw";
    image.srcset = photoSrcSet(photo.urls.full);
    image.src = unsplashLoader({ src: photo.urls.full, width: 3840, quality: 65 });
  });
}
module.exports = loadBackground;
