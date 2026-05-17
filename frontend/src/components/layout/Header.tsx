import { useEffect, useMemo, useState } from "react";
import { useLocation } from "react-router-dom";

const pageTitles: Record<string, string> = {
  "/": "Dashboard",
  "/upload": "Upload Documents",
  "/history": "History",
};

function getPageTitle(pathname: string) {
  if (pathname.startsWith("/review/")) {
    return "Record Review";
  }

  return pageTitles[pathname] ?? "OptiScan";
}

function Header() {
  const location = useLocation();
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      setNow(new Date());
    }, 1000);

    return () => window.clearInterval(intervalId);
  }, []);

  const pageTitle = useMemo(() => getPageTitle(location.pathname), [location.pathname]);
  const time = now.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });

  return (
    <header className="topbar flex items-center justify-between px-7 py-5">
      <div>
        <p className="topbar-kicker">Operations Console</p>
        <h1 className="topbar-title mt-1">{pageTitle}</h1>
      </div>

      <div className="flex items-center gap-5">
        <time className="topbar-clock">{time}</time>
        <div className="connection-status flex items-center gap-2">
          <span className="connection-dot" aria-hidden="true" />
          <span>Online</span>
        </div>
      </div>
    </header>
  );
}

export default Header;
