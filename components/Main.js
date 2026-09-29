// components/Main.js
import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import loadBackground from "../lib/load-background";
import unsplashLoader from "../lib/unsplash-loader";

export default function Main({ background: initialBackground }) {
  const [background, setBackground] = useState(initialBackground);
  const [previous, setPrevious] = useState(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const activeRequest = useRef(null);
  const recovered = useRef(false);
  useEffect(() => () => activeRequest.current?.abort(), []);
  useEffect(() => {
    if (!previous) return;
    const timer = setTimeout(() => setPrevious(null), 600);
    return () => clearTimeout(timer);
  }, [previous]);

  async function changeScenery(recovering = false) {
    if (activeRequest.current) return;
    const controller = new AbortController();
    activeRequest.current = controller;
    setBusy(true);
    setMessage("");
    const attempted = new Set([background?.id]);
    try {
      for (let attempt = 0; attempt < 3; attempt++) {
        if (controller.signal.aborted) return;
        try {
          const response = await fetch(`/api/background?exclude=${encodeURIComponent(background?.id || "")}`, {
            cache: "no-store", signal: AbortSignal.any([controller.signal, AbortSignal.timeout(5000)]),
          });
          if (!response.ok) throw new Error("Background unavailable");
          const { data } = await response.json();
          if (!data?.id || attempted.has(data.id)) continue;
          attempted.add(data.id);
          await loadBackground(data, controller.signal);
          if (controller.signal.aborted) return;
          setPrevious(recovering || useFallback ? null : background);
          setBackground(data);
          setFailedImage(null);
          setMessage(`New scenery. Photo by ${data.user.name}.`);
          return;
        } catch {
          if (controller.signal.aborted) return;
        }
      }
      setMessage("The scenery is taking a breather. Try again shortly.");
    } finally {
      if (!controller.signal.aborted) setBusy(false);
      activeRequest.current = null;
    }
  }
  const [failedImage, setFailedImage] = useState(null);
  const imageUrl = background?.urls?.full;
  const useFallback = !imageUrl || failedImage === imageUrl;
  const photoCredit = !useFallback && background?.user?.username;

  return (
    <main
      className="min-h-dvh flex items-center relative group overflow-hidden"
      style={{ backgroundColor: useFallback ? "#10293a" : background.color }}
    >
      {previous && (
        <Image alt="" src={previous.urls.full} fill sizes="100vw" quality={65}
          loader={unsplashLoader} style={{ objectFit: "cover" }} className="photo opacity-80" />
      )}
      <Image
        key={imageUrl || "fallback"}
        alt=""
        src={useFallback ? "/background.jpg" : imageUrl}
        priority
        fill
        sizes="100vw"
        quality={65}
        loader={useFallback ? undefined : unsplashLoader}
        unoptimized={useFallback}
        onError={() => {
          if (useFallback) return;
          setFailedImage(imageUrl);
          if (!recovered.current) {
            recovered.current = true;
            changeScenery(true);
          }
        }}
        style={{ objectFit: "cover" }}
        className={`photo opacity-80 transition duration-500 ${previous ? "photo-arriving" : ""}`}
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
      <div className="scenery-control">
        <button type="button" className="scenery-die" onClick={() => changeScenery()}
          aria-disabled={busy} aria-label="Change of scenery" aria-describedby="scenery-hint" aria-busy={busy}>
          <svg viewBox="0 0 32 32" width="32" height="32" aria-hidden="true" className={busy ? "die-tumbling" : ""}>
            <rect x="3" y="3" width="26" height="26" rx="6" fill="none" stroke="currentColor" strokeWidth="2" />
            {[ [10,10], [22,10], [16,16], [10,22], [22,22] ].map(([cx, cy]) =>
              <circle key={`${cx}-${cy}`} cx={cx} cy={cy} r="2" fill="currentColor" />)}
          </svg>
          <span id="scenery-hint">Change of scenery</span>
        </button>
        <span role="status" className="scenery-status">{message}</span>
      </div>
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
