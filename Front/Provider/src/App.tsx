import { BrowserRouter, Routes, Route } from "react-router-dom";

import Login from "./pages/Login";
import Register from "./pages/Register";
import PendingApproval from "./pages/PendingApproval";
import ProviderDashboard from "./pages/ProviderDashboard";
import ProviderLiveTracking from "./pages/ProviderLiveTracking";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/pending-approval" element={<PendingApproval />} />
        <Route path="/dashboard" element={<ProviderDashboard />} />
        <Route
          path="/provider/booking/:id/tracking" element={<ProviderLiveTracking/>}/>
      </Routes>
    </BrowserRouter>
  );
}

export default App;