// components/Main.js
import Image from "next/image";
import React from "react";

export default function Main({ background }) {
  if (!background) {
    return <p>Loading data...</p>; // Display loading message if there's no data
  }

  if (typeof window !== "undefined") {
    const dimensions = getWindowDimensions();
    console.log(dimensions.width, dimensions.height, dimensions.dpr);
  }

  //const urlQuery = width > height ? `&w=${width}` : `&h=${height}`;

  return (
    <div
      className="h-dvh flex items-center relative group"
      style={{ backgroundColor: `${background.color}` }}
    >
      <Image
        alt={`${background.alt_description}|${background.blur_hash}`}
        src={`${background.urls.full}`}
        priority
        fill
        placeholder="blur"
        blurDataURL={`${background.blur_hash}`}
        style={{ objectFit: "cover" }}
        className="photo opacity-80 transition duration-500"
      />
      <div className="absolute top-2 right-2">
        <a
          className="credit font-sans text-white text-xs"
          target="_blank"
          href={`https://unsplash.com/@${background.user.username}`}
        >
          Photo credit
        </a>
      </div>
      <div
        className="text-center w-4/5 mx-auto z-50 mix-blend-plus-lighter"
        style={{ color: `${background.color}` }}
      >
        <h1 className="-my-4 md:-my-8 lg:-my-16 xl:-my-20 font-display font-bold group-hover:text-white group-hover:opacity-80 transition duration-1000 shadow-2xl">
          <span className="text-fit">
            <span>
              <span>DNR.DIGITAL</span>
            </span>
            <span aria-hidden="true">DNR.DIGITAL</span>
          </span>
        </h1>
        <p className="mb-12 font-sans font-bold lowercase group-hover:text-white group-hover:opacity-80 transition duration-1000 shadow-2xl">
          <span className="text-fit">
            <span>
              <span>
                Consulting | strategy | procurement | project&nbsp;management
              </span>
            </span>
            <span aria-hidden="true">
              Consulting | strategy | procurement | project&nbsp;management
            </span>
          </span>
        </p>
        <p className="w-1/3 md:w-1/5 mx-auto font-sans font-bold group-hover:text-white transition duration-1000 shadow-2xl">
          <span className="text-fit">
            <span>
              <span>
                <a href="mailto:duncan@dnr.digital">Get in touch.</a>
              </span>
            </span>
            <span aria-hidden="true">Get in touch</span>
          </span>
        </p>
      </div>
    </div>
  );
}

function getWindowDimensions() {
  const {
    innerWidth: width,
    innerHeight: height,
    devicePixelRatio: dpr,
  } = window;
  return {
    width,
    height,
    dpr,
  };
}
