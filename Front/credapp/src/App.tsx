import { BrowserRouter, Routes, Route } from "react-router-dom";
import CredApp from "./components/CredApp";


function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<CredApp/>} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;