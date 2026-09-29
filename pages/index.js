import Head from "next/head";
import Main from "@components/Main";
import { getPool } from "../lib/image-cache";
import { toPageBackground } from "../lib/photo-props";

import { readHistory, choosePhoto, historyCookie } from "../lib/photo-rotation";

export async function getServerSideProps({ req, res }) {
  const { photo, history } = choosePhoto(await getPool(), readHistory(req.headers.cookie));
  res.setHeader("Cache-Control", "private, no-store");
  res.setHeader("Set-Cookie", historyCookie(history));
  return { props: { background: toPageBackground(photo) } };
}

export default function Home({ background }) {
  return (
    <>
      <Head>
        <title>DNR | Digital Consultancy</title>
        <meta name="description" content="Digital consulting, strategy, procurement and project management. Get in touch with DNR Digital." />
      </Head>
      <Main background={background} />
    </>
  );
}
