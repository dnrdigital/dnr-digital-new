import cache from "../../lib/image-cache.js";
export default async (_request, context) => {
  if (context.deploy.context !== "production" || !context.deploy.published) {
    return new Response(null, { status: 204 });
  }
  const result = await cache.refreshPool({ store: cache.photoStore() });
  console.log("Unsplash pool refresh", JSON.stringify(result));
  return new Response(null, { status: 204 });
};
export const config = { schedule: "0 * * * *" };
