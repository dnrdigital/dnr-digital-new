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
  const [loadedUrl, setLoadedUrl] = useState(null);
  const [failedImage, setFailedImage] = useState(null);
  const activeRequest = useRef(null);
  const prepared = useRef(null);
  const recovered = useRef(false);
  const imageUrl = background?.urls?.full;
  const useFallback = !imageUrl || failedImage === imageUrl;
  const currentUrl = useFallback ? "/background.jpg" : imageUrl;
  const ready = loadedUrl === currentUrl;
  const visiblePhoto = ready ? (useFallback ? null : background) : previous;
  const creditedPhoto = visiblePhoto || (useFallback ? null : background);
  const photoCredit = creditedPhoto?.user?.username;

  useEffect(() => () => {
    activeRequest.current?.abort();
    prepared.current?.controller.abort();
  }, []);
  useEffect(() => {
    if (!ready || !previous) return;
    const duration = window.matchMedia("(prefers-reduced-motion: reduce)").matches ? 0 : 700;
    const timer = setTimeout(() => { setPrevious(null); setBusy(false); }, duration);
    return () => clearTimeout(timer);
  }, [ready, previous]);

  // Prepare just one next photo after the visible image has settled. This reads
  // our metadata cache; image bytes still come directly from Unsplash's CDN.
  useEffect(() => {
    const connection = navigator.connection;
    if (!ready || previous || useFallback || connection?.saveData || /(^|-)2g$/.test(connection?.effectiveType)) return;
    let candidate;
    const timer = setTimeout(() => {
      if (activeRequest.current) return;
      const controller = new AbortController();
      candidate = { controller, forId: background.id,
        promise: fetchCandidate(background.id, controller.signal).catch(() => null) };
      prepared.current = candidate;
    }, 750);
    return () => {
      clearTimeout(timer);
      candidate?.controller.abort();
      if (prepared.current === candidate) prepared.current = null;
    };
  }, [background?.id, ready, previous, useFallback]);

  async function fetchCandidate(exclude, signal) {
    const response = await fetch(`/api/background?exclude=${encodeURIComponent(exclude || "")}`, {
      cache: "no-store", signal: AbortSignal.any([signal, AbortSignal.timeout(5000)]),
    });
    if (!response.ok) throw new Error("Background unavailable");
    const { data } = await response.json();
    if (!data?.id || data.id === exclude) throw new Error("No alternative photo");
    return loadBackground(data, signal);
  }

  async function changeScenery(recovering = false) {
    if (activeRequest.current || (busy && !recovering)) return;
    const controller = new AbortController();
    activeRequest.current = controller;
    setBusy(true);
    setMessage("");
    let transitioning = false;
    const attempted = new Set([background?.id]);
    const candidate = prepared.current?.forId === background?.id ? prepared.current : null;
    prepared.current = null;
    try {
      for (let attempt = 0; attempt < 3; attempt++) {
        if (controller.signal.aborted) return;
        try {
          const data = attempt === 0 && candidate
            ? await candidate.promise : await fetchCandidate(background?.id, controller.signal);
          if (!data?.id || attempted.has(data.id)) continue;
          attempted.add(data.id);
          if (controller.signal.aborted) return;
          // Every layer includes its own opaque colour backing. Fading the whole
          // layer avoids two translucent images brightening/dimming each other.
          const old = ready && !useFallback ? background : null;
          setPrevious(old);
          transitioning = Boolean(old);
          setBackground(data);
          setFailedImage(null);
          return;
        } catch {
          if (controller.signal.aborted) return;
        }
      }
      setMessage("The scenery is taking a breather. Try again shortly.");
    } finally {
      if (!controller.signal.aborted && !transitioning) setBusy(false);
      activeRequest.current = null;
    }
  }

  return (
    <main
      className="min-h-dvh flex items-center relative group overflow-hidden"
      style={{ backgroundColor: "#10293a" }}
    >
      <div className="scenery-placeholder photo" aria-hidden="true" style={{
        backgroundColor: background?.color || "#10293a",
        backgroundImage: background?.placeholder ? `url("${background.placeholder}")` : undefined,
      }} />
      {previous && (
        <div key={previous.urls.full} className="scenery-layer" style={{ backgroundColor: previous.color }}>
          <Image key={previous.urls.full} alt="" src={previous.urls.full} fill sizes="100vw" quality={65}
            loader={unsplashLoader} style={{ objectFit: "cover" }} className="photo opacity-80" />
        </div>
      )}
      <div key={currentUrl} className={`scenery-layer scenery-current ${ready ? "scenery-ready" : ""}`}
        style={{ backgroundColor: useFallback ? "#10293a" : background.color }}>
        <Image
          key={currentUrl}
          alt=""
          src={currentUrl}
          priority
          fill
          sizes="100vw"
          quality={65}
          loader={useFallback ? undefined : unsplashLoader}
          unoptimized={useFallback}
          onLoad={() => requestAnimationFrame(() => requestAnimationFrame(() => setLoadedUrl(currentUrl)))}
          onError={() => {
            if (useFallback) { setLoadedUrl(currentUrl); return; }
            if (previous) {
              setBackground(previous);
              setLoadedUrl(previous.urls.full);
              setPrevious(null);
              setBusy(false);
              setMessage("The scenery is taking a breather. Try again shortly.");
              return;
            }
            setFailedImage(imageUrl);
            setBusy(false);
            if (!recovered.current) {
              recovered.current = true;
              changeScenery(true);
            }
          }}
          style={{ objectFit: "cover" }}
          className="photo opacity-80"
        />
      </div>
      <noscript><style>{`.scenery-current { opacity: 1; }`}</style></noscript>
      {photoCredit && (
        <div className="absolute top-2 right-2 z-10 font-sans text-white text-xs">
          Photo by{" "}
          <a
            className="credit underline"
            target="_blank"
            rel="noopener noreferrer"
            href={`https://unsplash.com/@${creditedPhoto.user.username}?utm_source=dnr_digital&utm_medium=referral`}
          >
            {creditedPhoto.user.name || creditedPhoto.user.username}
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
        className={`text-center w-4/5 mx-auto z-10 py-16 ${!visiblePhoto ? "text-white" : "mix-blend-plus-lighter"}`}
        style={{ color: visiblePhoto?.color }}
      >
        <h1 className="-my-4 md:-my-8 lg:-my-16 xl:-my-20 font-display font-bold group-hover:text-white group-focus-within:text-white group-hover:opacity-80 group-focus-within:opacity-80 transition duration-1000 scenery-text">
          <span className="text-fit">
            <span>
              <span>DNR.DIGITAL</span>
            </span>
            <span aria-hidden="true">DNR.DIGITAL</span>
          </span>
        </h1>
        <p className="mb-12 font-sans font-bold lowercase group-hover:text-white group-focus-within:text-white group-hover:opacity-80 group-focus-within:opacity-80 transition duration-1000 scenery-text">
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
        <p className="w-1/3 md:w-1/5 mx-auto font-sans font-bold group-hover:text-white group-focus-within:text-white transition duration-1000 scenery-text">
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
