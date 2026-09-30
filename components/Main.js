// components/Main.js
import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import loadBackground from "../lib/load-background";
import unsplashLoader from "../lib/unsplash-loader";

// Keep draft navigation and placeholder copy out of the live release.
const serviceSlidesEnabled = false;

const services = [
  { id: "strategy", label: "strategy" },
  { id: "procurement", label: "procurement" },
  { id: "project-management", label: "project\u00a0management" },
  { id: "delivery", label: "delivery" },
];

function contrastingText(color) {
  const channels = color.slice(1).match(/.{2}/g).map((hex) => {
    const value = parseInt(hex, 16) / 255;
    return value <= .04045 ? value / 12.92 : ((value + .055) / 1.055) ** 2.4;
  });
  const luminance = channels[0] * .2126 + channels[1] * .7152 + channels[2] * .0722;
  return luminance > .179 ? "#000000" : "#ffffff";
}

export default function Main({ backgrounds }) {
  const titleSlide = useRef(null);
  const [awayFromTitle, setAwayFromTitle] = useState(false);
  const [background, setBackground] = useState(null);
  const [orientation, setOrientation] = useState(null);
  const [displayOrientation, setDisplayOrientation] = useState(null);
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
  const currentPhotoUrl = useRef(currentUrl);
  currentPhotoUrl.current = currentUrl;
  const ready = loadedUrl === currentUrl;
  const visiblePhoto = ready ? (useFallback ? null : background) : previous;
  const creditedPhoto = visiblePhoto || (useFallback ? null : background);
  const photoCredit = creditedPhoto?.user?.username;
  const photoColor = useFallback ? null : (visiblePhoto?.color || background.color);
  const slideColor = /^#[0-9a-f]{6}$/i.test(photoColor) ? photoColor : "#10293a";

  useEffect(() => {
    if (!serviceSlidesEnabled) return;
    const observer = new IntersectionObserver(([entry]) => {
      setAwayFromTitle(entry.intersectionRatio < .5);
    }, { threshold: .5 });
    observer.observe(titleSlide.current);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const media = window.matchMedia("(orientation: portrait)");
    const update = () => setOrientation(media.matches ? "portrait" : "landscape");
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);
  useEffect(() => {
    if (!orientation) return;
    activeRequest.current?.abort();
    activeRequest.current = null;
    prepared.current?.controller.abort();
    prepared.current = null;
    setBusy(false);
    setMessage("");
    if (!displayOrientation) {
      // Media-qualified head preloads already fetched only the matching photo.
      setBackground(backgrounds[orientation]);
      setDisplayOrientation(orientation);
    } else if (displayOrientation !== orientation) {
      changeScenery(true, orientation);
    }
    // React only to a viewport orientation change, not every photo transition.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orientation]);

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
    if (!ready || previous || useFallback || orientation !== displayOrientation || connection?.saveData || /(^|-)2g$/.test(connection?.effectiveType)) return;
    let candidate;
    const timer = setTimeout(() => {
      if (activeRequest.current) return;
      const controller = new AbortController();
      candidate = { controller, forId: background.id, orientation,
        promise: fetchCandidate(background.id, controller.signal, orientation).catch(() => null) };
      prepared.current = candidate;
    }, 750);
    return () => {
      clearTimeout(timer);
      candidate?.controller.abort();
      if (prepared.current === candidate) prepared.current = null;
    };
  }, [background?.id, ready, previous, useFallback, orientation, displayOrientation]);

  async function fetchCandidate(exclude, signal, targetOrientation) {
    const response = await fetch(`/api/background?orientation=${targetOrientation}&exclude=${encodeURIComponent(exclude || "")}`, {
      cache: "no-store", signal: AbortSignal.any([signal, AbortSignal.timeout(5000)]),
    });
    if (!response.ok) throw new Error("Background unavailable");
    const { data } = await response.json();
    if (!data?.id || data.id === exclude) throw new Error("No alternative photo");
    return loadBackground(data, signal);
  }

  async function changeScenery(recovering = false, targetOrientation = orientation) {
    if (!targetOrientation || activeRequest.current || (busy && !recovering)) return;
    const controller = new AbortController();
    activeRequest.current = controller;
    setBusy(true);
    setMessage("");
    let transitioning = false;
    const attempted = new Set([background?.id]);
    const candidate = prepared.current?.forId === background?.id && prepared.current?.orientation === targetOrientation ? prepared.current : null;
    if (!candidate) prepared.current?.controller.abort();
    controller.signal.addEventListener("abort", () => candidate?.controller.abort(), { once: true });
    prepared.current = null;
    try {
      for (let attempt = 0; attempt < 3; attempt++) {
        if (controller.signal.aborted) return;
        try {
          const data = attempt === 0 && candidate
            ? await candidate.promise : await fetchCandidate(background?.id, controller.signal, targetOrientation);
          if (!data?.id || attempted.has(data.id)) continue;
          attempted.add(data.id);
          if (controller.signal.aborted) return;
          // Every layer includes its own opaque colour backing. Fading the whole
          // layer avoids two translucent images brightening/dimming each other.
          const old = ready && !useFallback ? background : null;
          setPrevious(old);
          transitioning = Boolean(old);
          setBackground(data);
          setDisplayOrientation(targetOrientation);
          setFailedImage(null);
          return;
        } catch {
          if (controller.signal.aborted) return;
        }
      }
      setMessage("The scenery is taking a breather. Try again shortly.");
    } finally {
      if (!controller.signal.aborted && !transitioning) setBusy(false);
      if (activeRequest.current === controller) activeRequest.current = null;
    }
  }

  return (
    <main style={{ "--slide-color": slideColor, "--slide-text": contrastingText(slideColor) }}>
    <section
      id="title"
      ref={titleSlide}
      tabIndex={-1}
      aria-labelledby="site-title"
      className="min-h-dvh flex items-center relative group overflow-hidden"
      style={{ backgroundColor: "#10293a" }}
    >
      {!displayOrientation && Object.entries(backgrounds).map(([kind, photo]) =>
        <div key={kind} className={`scenery-placeholder photo initial-${kind}`} aria-hidden="true" style={{
          backgroundColor: photo?.color || "#10293a",
          backgroundImage: photo?.placeholder ? `url("${photo.placeholder}")` : undefined,
        }} />)}
      {displayOrientation && <div className="scenery-placeholder photo" aria-hidden="true" style={{
        backgroundColor: background?.color || "#10293a",
        backgroundImage: background?.placeholder ? `url("${background.placeholder}")` : undefined,
      }} />}
      {previous && (
        <div key={previous.urls.full} className="scenery-layer" style={{ backgroundColor: previous.color }}>
          <Image key={previous.urls.full} alt="" src={previous.urls.full} fill sizes="100vw" quality={65}
            loader={unsplashLoader} style={{ objectFit: "cover" }} className="photo opacity-80" />
        </div>
      )}
      {displayOrientation && <div key={currentUrl} className={`scenery-layer scenery-current ${ready ? "scenery-ready" : ""}`}
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
          onLoad={() => requestAnimationFrame(() => requestAnimationFrame(() => {
            if (currentPhotoUrl.current === currentUrl) setLoadedUrl(currentUrl);
          }))}
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
      </div>}
      <noscript><style>{`.scenery-placeholder { background-image: url('/background.jpg') !important; } .scenery-control { display: none; }`}</style></noscript>
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
      <div
        className={`text-center w-4/5 mx-auto z-10 py-16 ${!visiblePhoto ? "text-white" : "mix-blend-plus-lighter"}`}
        style={{ color: visiblePhoto?.color }}
      >
        <h1 id="site-title" className="-my-4 md:-my-8 lg:-my-16 xl:-my-20 font-display font-bold group-hover:text-white group-focus-within:text-white group-hover:opacity-80 group-focus-within:opacity-80 transition duration-1000 scenery-text intro-heading">
          <span className="text-fit">
            <span>
              <span>DNR.DIGITAL</span>
            </span>
            <span aria-hidden="true">DNR.DIGITAL</span>
          </span>
        </h1>
        <p className="mb-12 font-sans font-bold lowercase group-hover:text-white group-focus-within:text-white group-hover:opacity-80 group-focus-within:opacity-80 transition duration-1000 scenery-text intro-subtitle">
          <span className="text-fit">
            <span>
              <span>
                {services.map(({ id, label }, index) => (
                  <span key={id}>
                    {index > 0 && <span className="service-separator" aria-hidden="true">·</span>}
                    {serviceSlidesEnabled
                      ? <a className="contact-link service-link" href={`#${id}`}>{label}</a>
                      : <span className="contact-link service-link">{label}</span>}
                  </span>
                ))}
              </span>
            </span>
            <span aria-hidden="true">
              {services.map(({ id, label }, index) => (
                <span key={id}>
                  {index > 0 && <span className="service-separator">·</span>}
                  {label}
                </span>
              ))}
            </span>
          </span>
        </p>
        <p className="w-1/3 md:w-1/5 mx-auto font-sans font-bold group-hover:text-white group-focus-within:text-white transition duration-1000 scenery-text intro-contact">
          <span className="text-fit">
            <span>
              <span>
                <a className="contact-link" href="mailto:duncan@dnr.digital">Get in touch.</a>
              </span>
            </span>
            <span aria-hidden="true">Get in touch.</span>
          </span>
        </p>
      </div>
    </section>
    {serviceSlidesEnabled && services.map(({ id, label }) => (
      <section key={id} id={id} className="service-slide" tabIndex={-1} aria-labelledby={`${id}-heading`}>
        <div className="service-content">
          <h2 id={`${id}-heading`} className="font-display">{label.replace("\u00a0", " ")}</h2>
          <p>Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.</p>
        </div>
      </section>
    ))}
    <div className="scenery-control">
      {awayFromTitle ? (
        <a className="scenery-die" href="#title" onClick={() => titleSlide.current.focus({ preventScroll: true })}>
          <svg viewBox="0 0 32 32" width="32" height="32" aria-hidden="true">
            <rect x="3" y="3" width="26" height="26" rx="6" fill="none" stroke="currentColor" strokeWidth="2" />
            <path d="M16 23V9m-6 6 6-6 6 6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <span className="scenery-label">Back to top</span>
        </a>
      ) : (
        <button type="button" className="scenery-die" onClick={() => changeScenery()}
          aria-disabled={busy} aria-label="Want a new perspective?" aria-busy={busy}>
          <svg viewBox="0 0 32 32" width="32" height="32" aria-hidden="true" className={busy ? "die-tumbling" : ""}>
            <rect x="3" y="3" width="26" height="26" rx="6" fill="none" stroke="currentColor" strokeWidth="2" />
            {[ [10,10], [22,10], [16,16], [10,22], [22,22] ].map(([cx, cy]) =>
              <circle key={`${cx}-${cy}`} cx={cx} cy={cy} r="2" fill="currentColor" />)}
          </svg>
          <span className="scenery-label">Want a new perspective?</span>
        </button>
      )}
      <span role="status" className="scenery-status">{!awayFromTitle && message}</span>
    </div>
    </main>
  );
}
