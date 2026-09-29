import cache from "../../lib/image-cache.js";
import { getStore } from "@netlify/blobs";
export default async (_request, context) => {
  if (context.deploy.context !== "production" || !context.deploy.published) {
    return new Response(null, { status: 204 });
  }
  // Keep the SDK import visible to Netlify's native-function dependency tracer.
  const result = await cache.refreshPool({ store: cache.photoStore(getStore) });
  console.log("Unsplash pool refresh", JSON.stringify(result));
  return new Response(null, { status: 204 });
};
export const config = { schedule: "0 * * * *" };
