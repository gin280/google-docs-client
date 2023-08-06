import { useEffect } from 'react';
import { Route, BrowserRouter as Router, Routes } from 'react-router-dom';
import { useNavigate } from 'react-router-dom';
import TextEditor from "./TextEditor";
import DiffView from "./DiffView";
import { v4 as uuidV4 } from "uuid";

function Redirector() {
  const navigate = useNavigate();
  
  useEffect(() => {
    navigate(`/documents/${uuidV4()}`);
  }, [navigate]);
  
  return null;
}

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Redirector />} />
        <Route path="/documents/:id" element={<TextEditor />} />
        <Route path="/diff/:id/*" element={<DiffView />} />
      </Routes>
    </Router>
  );
}

export default App;
