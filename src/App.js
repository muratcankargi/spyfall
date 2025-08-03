import './App.css';
import CreateRoom from './pages/CreateRoom';
import HomePage from './pages/HomePage';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/create-room" element={<CreateRoom />} />

      </Routes>
    </Router>
  );
}

export default App;