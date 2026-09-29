// components/Main.js
import Image from "next/image";
import { useState } from "react";
import unsplashLoader from "../lib/unsplash-loader";

export default function Main({ background }) {
  const [failedImage, setFailedImage] = useState(null);
  const imageUrl = background?.urls?.full;
  const useFallback = !imageUrl || failedImage === imageUrl;
  const photoCredit = !useFallback && background?.user?.username;

  return (
    <main
      className="min-h-dvh flex items-center relative group overflow-hidden"
      style={{ backgroundColor: useFallback ? "#10293a" : background.color }}
    >
      <Image
        alt=""
        src={useFallback ? "/background.jpg" : imageUrl}
        priority
        fill
        sizes="100vw"
        loader={useFallback ? undefined : unsplashLoader}
        unoptimized={useFallback}
        onError={() => setFailedImage(imageUrl)}
        style={{ objectFit: "cover" }}
        className="photo opacity-80 transition duration-500"
      />
      {photoCredit && (
        <div className="absolute top-2 right-2 z-10 font-sans text-white text-xs">
          Photo by{" "}
          <a
            className="credit underline"
            target="_blank"
            rel="noopener noreferrer"
            href={`https://unsplash.com/@${background.user.username}?utm_source=dnr_digital&utm_medium=referral`}
          >
            {background.user.name || background.user.username}
          </a>{" "}
          on{" "}
          <a
            className="credit underline"
            target="_blank"
            rel="noopener noreferrer"
            href="https://unsplash.com/?utm_source=dnr_digital&utm_medium=referral"
          >
            Unsplash
          </a>
        </div>
      )}
      <div
        className={`text-center w-4/5 mx-auto z-10 py-16 ${useFallback ? "text-white" : "mix-blend-plus-lighter"}`}
        style={{ color: useFallback ? undefined : background.color }}
      >
        <h1 className="-my-4 md:-my-8 lg:-my-16 xl:-my-20 font-display font-bold group-hover:text-white group-focus-within:text-white group-hover:opacity-80 group-focus-within:opacity-80 transition duration-1000 shadow-2xl">
          <span className="text-fit">
            <span>
              <span>DNR.DIGITAL</span>
            </span>
            <span aria-hidden="true">DNR.DIGITAL</span>
          </span>
        </h1>
        <p className="mb-12 font-sans font-bold lowercase group-hover:text-white group-focus-within:text-white group-hover:opacity-80 group-focus-within:opacity-80 transition duration-1000 shadow-2xl">
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
        <p className="w-1/3 md:w-1/5 mx-auto font-sans font-bold group-hover:text-white group-focus-within:text-white transition duration-1000 shadow-2xl">
          <span className="text-fit">
            <span>
              <span>
                <a href="mailto:duncan@dnr.digital">Get in touch.</a>
              </span>
            </span>
            <span aria-hidden="true">Get in touch.</span>
          </span>
        </p>
      </div>
    </main>
  );
}
