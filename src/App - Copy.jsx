import { HashRouter, Routes, Route, Link } from 'react-router-dom';
import './App.css';
import ModeratorDashboard from './ModeratorDashboard';
import Scoreboard from './Scoreboard';

// --- Placeholder Components ---
// Later, we will move these into their own separate files!


const Home = () => (
  <div style={{ padding: '2rem', fontFamily: 'sans-serif' }}>
    <h1>Spelling Bee Setup</h1>
    <p>Select your screen:</p>
    <div style={{ display: 'flex', gap: '10px' }}>
      <Link to="/mod">
        <button style={{ padding: '10px 20px', cursor: 'pointer' }}>Join as Moderator</button>
      </Link>
      <Link to="/board">
        <button style={{ padding: '10px 20px', cursor: 'pointer' }}>Open TV Scoreboard</button>
      </Link>
    </div>
  </div>
);

// --- The Main Router ---
function App() {
  return (
    <HashRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/mod" element={<ModeratorDashboard />} />
        <Route path="/board" element={<Scoreboard />} />
      </Routes>
    </HashRouter>
  );
}

export default App;