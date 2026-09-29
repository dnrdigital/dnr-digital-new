import { getPool } from "../../lib/image-cache";
import { toPageBackground } from "../../lib/photo-props";
import { readHistory, choosePhoto, historyCookie } from "../../lib/photo-rotation";
export default async function handler(req, res) {
  res.setHeader("Cache-Control", "private, no-store");
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ error: "Method not allowed" });
  }
  const exclude = typeof req.query.exclude === "string" ? req.query.exclude.slice(0, 40) : "";
  const orientation = req.query.orientation;
  if (orientation !== "landscape" && orientation !== "portrait") {
    return res.status(400).json({ error: "Choose landscape or portrait" });
  }
  const { photo, history } = choosePhoto(await getPool(), readHistory(req.headers.cookie), exclude, Math.random, orientation);
  if (!photo) return res.status(503).json({ error: "No alternative background available" });
  res.setHeader("Set-Cookie", historyCookie(history));
  return res.status(200).json({ data: toPageBackground(photo) });
}
