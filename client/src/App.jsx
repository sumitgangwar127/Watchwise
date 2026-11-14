import { useCallback, useEffect, useState } from "react";
import { AnimatePresence } from "framer-motion";
import { Loader2 } from "lucide-react";
import Onboarding from "./Onboarding.jsx";
import Dashboard from "./dashboard/Dashboard.jsx";
import TitlePage from "./dashboard/TitlePage.jsx";
import Intermission from "./components/Intermission.jsx";
import Intro from "./components/Intro.jsx";
import { Glow } from "./ui.jsx";
import { back, navigate, titlePath, usePath } from "./router.js";
import { useCatalog } from "./useCatalog.js";
import { useHistory } from "./useHistory.js";
import { useSaved } from "./useSaved.js";

const introSeen = () => {
  try {
    return sessionStorage.getItem("ww_intro") === "1";
  } catch {
    return false;
  }
};
// How long the app can sit idle before Intermission dims the house lights (0 = never)
function useIntermissionSetting() {
  const [minutes, setMinutes] = useState(() => {
    try {
      const v = localStorage.getItem("ww_intermission");
      return v === null ? 3 : Number(v);
    } catch {
      return 3;
    }
  });
  const set = useCallback((m) => {
    setMinutes(m);
    try {
      localStorage.setItem("ww_intermission", String(m));
    } catch {
      /* storage unavailable: setting lasts until reload */
    }
  }, []);
  return { minutes, set };
}

// Which trailer player to use: "showtime" (curtains, the original) or "theater" (wide screen + room, experimental)
function usePlayerStyle() {
  const [style, setStyle] = useState(() => {
    try {
      return localStorage.getItem("ww_player") === "theater" ? "theater" : "showtime";
    } catch {
      return "showtime";
    }
  });
  const set = useCallback((v) => {
    setStyle(v);
    try {
      localStorage.setItem("ww_player", v);
    } catch {
      /* storage unavailable: lasts until reload */
    }
  }, []);
  return { style, set };
}

const reducedMotion = () => window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

export default function App() {
  const [status, setStatus] = useState(null);
  const [error, setError] = useState(false);
  // The curtain-up intro plays once per browser session, and is skipped for reduced-motion users.
  const [intro, setIntro] = useState(() => !introSeen() && !reducedMotion());

  const path = usePath();
  const titleId = path.startsWith("/title/") ? decodeURIComponent(path.slice("/title/".length)) : null;

  const onboarded = Boolean(status?.onboarded);
  const catalogApi = useCatalog(onboarded);
  const saved = useSaved();
  const intermission = useIntermissionSetting();
  const playerStyle = usePlayerStyle();
  const hist = useHistory(onboarded, { onLearned: catalogApi.reload });

  const finishIntro = useCallback(() => {
    try {
      sessionStorage.setItem("ww_intro", "1");
    } catch {
      /* storage unavailable: intro may replay on reload */
    }
    setIntro(false);
    window.dispatchEvent(new Event("ww:intro-done")); // lets the banner bars start sliding away
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
  } else if (onboarded) {
    content = (
      <>
        {/* The dashboard stays mounted (hidden) on a title page, so its tab, search and scroll survive going back */}
        <div hidden={Boolean(titleId)}>
          <Dashboard
            status={status}
            saved={saved}
            hist={hist}
            catalogApi={catalogApi}
            intermission={intermission}
            playerStyle={playerStyle}
            onOpenTitle={(id) => navigate(titlePath(id))}
            onRestart={() => {
              setStatus(null);
              navigate("/", { replace: true });
              load();
            }}
          />
        </div>
        {titleId && (
          <TitlePage
            key={titleId}
            id={titleId}
            status={status}
            saved={saved}
            hist={hist}
            navigate={navigate}
            back={back}
            playerStyle={playerStyle.style}
          />
        )}
      </>
    );
  } else {
    content = (
      <Onboarding
        providers={status.providers}
        onComplete={() => {
          navigate("/", { replace: true });
          load();
        }}
      />
    );
  }

  return (
    <>
      <AnimatePresence>{intro && <Intro key="intro" onDone={finishIntro} />}</AnimatePresence>
      {content}
      <Intermission items={catalogApi.catalog?.items ?? []} minutes={intermission.minutes} enabled={onboarded && !intro} />
    </>
  );
}
