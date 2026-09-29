import { getBackground } from "../../lib/image-cache";

export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ error: "Method not allowed" });
  }

  const background = await getBackground();
  if (!background) {
    return res.status(503).json({ error: "No backgrounds available" });
  }
  return res.status(200).json({ data: background });
}
