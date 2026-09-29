import Head from "next/head";
import Main from "@components/Main";
import { getBackground, toPageBackground } from "../lib/image-cache";

export async function getServerSideProps() {
  return { props: { background: toPageBackground(await getBackground()) } };
}

export default function Home({ background }) {
  return (
    <>
      <Head>
        <title>DNR | Digital Consultancy</title>
        <meta name="description" content="Digital consulting, strategy, procurement and project management. Get in touch with DNR Digital." />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <Main background={background} />
    </>
  );
}
