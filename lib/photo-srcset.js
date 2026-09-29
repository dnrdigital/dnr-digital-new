const unsplashLoader = require("./unsplash-loader");
// Keep initial media preloads and decoded next-photo preloads aligned with next/image.
module.exports = (src) => [640, 750, 828, 1080, 1200, 1920, 2048, 3840]
  .map((width) => `${unsplashLoader({ src, width, quality: 65 })} ${width}w`).join(", ");
