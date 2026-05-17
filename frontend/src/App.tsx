import { Route, Routes } from "react-router-dom";
import Layout from "./components/layout/Layout";
import ErrorBoundary from "./components/ui/ErrorBoundary";
import { AppProvider } from "./context/AppContext";
import { ToastProvider } from "./context/ToastContext";
import Dashboard from "./pages/Dashboard";
import History from "./pages/History";
import Review from "./pages/Review";
import Upload from "./pages/Upload";

function App() {
  return (
    <ErrorBoundary>
      <ToastProvider>
        <AppProvider>
          <Layout>
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/upload" element={<Upload />} />
              <Route path="/review/:id" element={<Review />} />
              <Route path="/history" element={<History />} />
            </Routes>
          </Layout>
        </AppProvider>
      </ToastProvider>
    </ErrorBoundary>
  );
}

export default App;
