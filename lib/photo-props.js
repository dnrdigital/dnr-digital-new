const photoPlaceholder = require("./photo-placeholder");
const { photoOrientation } = require("./photo-selection");

function toPageBackground(image) {
  if (!image) return null;
  return { id: image.id, orientation: photoOrientation(image), color: image.color ?? "#10293a", placeholder: photoPlaceholder(image.blur_hash), urls: { full: image.urls.full },
    user: { name: image.user?.name ?? null, username: image.user?.username ?? null } };
}
module.exports = { toPageBackground };
