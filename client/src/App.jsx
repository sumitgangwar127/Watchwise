import { useCallback, useEffect, useState } from "react";
import { AnimatePresence } from "framer-motion";
import { Loader2 } from "lucide-react";
import Onboarding from "./Onboarding.jsx";
import Dashboard from "./dashboard/Dashboard.jsx";
import Intro from "./components/Intro.jsx";
import { Glow } from "./ui.jsx";

const introSeen = () => {
  try {
    return sessionStorage.getItem("ww_intro") === "1";
  } catch {
    return false;
  }
};
const reducedMotion = () => window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

export default function App() {
  const [status, setStatus] = useState(null);
  const [error, setError] = useState(false);
  // The curtain-up intro plays once per browser session, and is skipped for reduced-motion users.
  const [intro, setIntro] = useState(() => !introSeen() && !reducedMotion());

  const finishIntro = useCallback(() => {
    try {
      sessionStorage.setItem("ww_intro", "1");
    } catch {
      /* storage unavailable: intro may replay on reload */
    }
    setIntro(false);
  }, []);

  const load = useCallback(() => {
    setError(false);
    fetch("/api/status")
      .then((r) => r.json())
      .then(setStatus)
      .catch(() => setError(true));
  }, []);

  useEffect(load, [load]);

  let content;
  if (!status) {
    content = (
      <div className="relative grid min-h-dvh place-items-center px-5 text-center">
        <Glow />
        {error ? (
          <div className="relative">
            <p className="text-white/70">Can't reach the Watchwise server.</p>
            <button onClick={load} className="mt-3 text-sm text-accent underline">
              Retry
            </button>
          </div>
        ) : (
          <Loader2 className="relative animate-spin text-accent" />
        )}
      </div>
    );
  } else if (status.onboarded) {
    content = (
      <Dashboard
        status={status}
        onRestart={() => {
          setStatus(null);
          load();
        }}
      />
    );
  } else {
    content = <Onboarding providers={status.providers} onComplete={load} />;
  }

  return (
    <>
      <AnimatePresence>{intro && <Intro key="intro" onDone={finishIntro} />}</AnimatePresence>
      {content}
    </>
  );
}
