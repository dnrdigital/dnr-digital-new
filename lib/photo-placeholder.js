const { decode } = require("blurhash");

// Generate a tiny inline preview on the server. No extra image request or client decoder.
function photoPlaceholder(hash) {
  if (typeof hash !== "string" || hash.length > 100) return null;
  try {
    const width = 8, height = 5;
    const pixels = decode(hash, width, height);
    let cells = "";
    for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4;
      const color = Array.from(pixels.slice(i, i + 3), (v) => v.toString(16).padStart(2, "0")).join("");
      cells += `<path fill="#${color}" d="M${x} ${y}h1v1H${x}z"/>`;
    }
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 8 5" preserveAspectRatio="none"><filter id="b"><feGaussianBlur stdDeviation=".5"/></filter><g filter="url(#b)">${cells}</g></svg>`;
    return `data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`;
  } catch { return null; }
}

module.exports = photoPlaceholder;
