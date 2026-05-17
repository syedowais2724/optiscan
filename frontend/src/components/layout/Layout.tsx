import type { ReactNode } from "react";
import Header from "./Header";
import Sidebar from "./Sidebar";

function Layout({ children }: { children: ReactNode }) {
  return (
    <div className="app-shell min-h-screen">
      <Sidebar />
      <div className="app-main min-h-screen">
        <Header />
        <main className="content-panel px-7 py-7">{children}</main>
      </div>
    </div>
  );
}

export default Layout;
