import cache from "../../lib/image-cache.js";
import { getStore } from "@netlify/blobs";
export default async (request, context) => {
  const deploy = context?.deploy || {};
  let scheduled = false;
  // Cron invocations can omit the HTTP deployment headers. Netlify only sends
  // scheduled events to the published deploy; these functions have no public URL.
  // Manual runs with deployment metadata must still pass the production check.
  if ((!deploy.context || deploy.context === "production") && !request?.headers.has("x-nf-deploy-published")) {
    const event = await request?.json().catch(() => null);
    scheduled = typeof event?.next_run === "string" && Number.isFinite(Date.parse(event.next_run));
  }
  if (!scheduled && (deploy.context !== "production" || !deploy.published)) {
    console.log("Unsplash pool refresh", JSON.stringify({ status: "skipped-deploy",
      context: deploy.context || null, published: deploy.published ?? null }));
    return new Response(null, { status: 204 });
  }
  // Keep the SDK import visible to Netlify's native-function dependency tracer.
  const result = await cache.refreshPool({ store: cache.photoStore(getStore) });
  console.log("Unsplash pool refresh", JSON.stringify(result));
  return new Response(null, { status: 204 });
};
export const config = { schedule: "0 * * * *" };
