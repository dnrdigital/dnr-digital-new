import unsplashLoader from "./unsplash-loader";

// Use the same responsive candidates as next/image, so preparing a transition
// does not fetch a second, oversized copy of the photo.
export default function loadBackground(photo, signal) {
  return new Promise((resolve, reject) => {
    const image = new window.Image();
    const timer = setTimeout(() => finish(new Error("Photo timed out")), 8000);
    function finish(error) {
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
    image.onload = () => finish();
    image.onerror = () => finish(new Error("Photo unavailable"));
    image.sizes = "100vw";
    image.srcset = [640, 750, 828, 1080, 1200, 1920, 2048, 3840].map((width) =>
      `${unsplashLoader({ src: photo.urls.full, width, quality: 65 })} ${width}w`).join(", ");
    image.src = unsplashLoader({ src: photo.urls.full, width: 3840, quality: 65 });
  });
}
