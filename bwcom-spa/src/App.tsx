import React from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import NavBar from "./components/NavBar";
import Footer from "./components/Footer";
import AboutMe from "./components/AboutMe";
import TrainingLog from "./components/TrainingLog";
import RaceHistory from "./components/RaceHistory";
import Media from "./components/Media";
import AdminPage from "./pages/AdminPage";

function Wrapped({ children }: { children: React.ReactNode }) {
  return <div style={{ maxWidth: 1100, margin: "0 auto", width: "100%" }}>{children}</div>;
}

const App: React.FC = () => {
  return (
    <>
      <NavBar />
      <main>
        <Routes>
          <Route path="/" element={<Wrapped><AboutMe /></Wrapped>} />
          <Route path="/about-me" element={<Navigate to="/" replace />} />
          <Route path="/training-log" element={<Wrapped><TrainingLog /></Wrapped>} />
          <Route path="/race-history" element={<Wrapped><RaceHistory /></Wrapped>} />
          <Route path="/media" element={<Wrapped><Media /></Wrapped>} />
          <Route path="/admin" element={<AdminPage />} />
        </Routes>
      </main>
      <Footer />
    </>
  );
};

export default App;
