import './App.css';
import CreateRoom from './pages/CreateRoom';
import HomePage from './pages/HomePage';
import GameRoom from './pages/GameRoom';
import JoinRoom from './pages/JoinRoom';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/create-room" element={<CreateRoom />} />
        <Route path="/rooms/:roomId" element={<GameRoom />} />
        <Route path="/join-room" element={<JoinRoom />} />

      </Routes>
    </Router>
  );
}

export default App;