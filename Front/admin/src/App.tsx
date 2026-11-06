
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import Admin from "./components/Admin";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Admin />} />

        {/* Redirect all unknown routes to the admin app */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
