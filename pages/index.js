// pages/index.js
import Head from "next/head";
import Main from "@components/Main";

export async function getServerSideProps() {
  try {
    const res = await fetch(`api/imageCache`);
    const json = await res.json();

    return {
      props: {
        background: json.data || null, // Pass the data to the component
      },
    };
  } catch (error) {
    console.error("Error fetching data in getServerSideProps:", error);
    return {
      props: {
        background: null, // Pass null if there's an error
      },
    };
  }
}

export default function Home({ background }) {
  return (
    <>
      <Head>
        <title>DNR | Digital Consultancy</title>
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <Main background={background} />{" "}
      {/* Pass the data to the Main component */}
    </>
  );
}
