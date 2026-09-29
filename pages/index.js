import Head from "next/head";
import Main from "@components/Main";
import { getPool } from "../lib/image-cache";
import { toPageBackground } from "../lib/photo-props";
import photoSrcSet from "../lib/photo-srcset";

import { readHistory, choosePhoto, historyCookie } from "../lib/photo-rotation";

export async function getServerSideProps({ req, res }) {
  const pool = await getPool();
  const landscape = choosePhoto(pool, readHistory(req.headers.cookie), "", Math.random, "landscape");
  const portrait = choosePhoto(pool, landscape.history, "", Math.random, "portrait");
  res.setHeader("Cache-Control", "private, no-store");
  res.setHeader("Set-Cookie", historyCookie(portrait.history));
  return { props: { backgrounds: { landscape: toPageBackground(landscape.photo), portrait: toPageBackground(portrait.photo) } } };
}

export default function Home({ backgrounds }) {
  return (
    <>
      <Head>
        <title>DNR | Digital Consultancy</title>
        <meta name="description" content="Digital consulting, strategy, procurement and project management. Get in touch with DNR Digital." />
        {Object.entries(backgrounds).map(([orientation, photo]) => photo &&
          <link key={orientation} rel="preload" as="image" media={`(orientation: ${orientation})`}
            imageSrcSet={photoSrcSet(photo.urls.full)} imageSizes="100vw" />)}
      </Head>
      <Main backgrounds={backgrounds} />
    </>
  );
}
