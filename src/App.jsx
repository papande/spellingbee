import { HashRouter, Routes, Route, Link } from 'react-router-dom';
import ModeratorDashboard from './ModeratorDashboard';
import Scoreboard from './Scoreboard';
import SetupLobby from './SetupLobby'; // Add this import
import './App.css';

const Home = () => (
  <div style={{ padding: '2rem', fontFamily: 'sans-serif', textAlign: 'center' }}>
    <h1>Spelling Bee App</h1>
    <p>Select your screen:</p>
    <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', marginTop: '2rem' }}>
      <Link to="/setup">
        <button style={{ padding: '10px 20px', cursor: 'pointer', backgroundColor: '#007bff', color: 'white', border: 'none', borderRadius: '4px', fontSize: '1.1rem' }}>
          New Game Setup
        </button>
      </Link>
      <Link to="/mod">
        <button style={{ padding: '10px 20px', cursor: 'pointer', backgroundColor: '#6c757d', color: 'white', border: 'none', borderRadius: '4px', fontSize: '1.1rem' }}>
          Rejoin as Moderator
        </button>
      </Link>
      <Link to="/board">
        <button style={{ padding: '10px 20px', cursor: 'pointer', backgroundColor: '#343a40', color: 'white', border: 'none', borderRadius: '4px', fontSize: '1.1rem' }}>
          Open TV Scoreboard
        </button>
      </Link>
    </div>
  </div>
);

function App() {
  return (
    <HashRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/setup" element={<SetupLobby />} />
        <Route path="/mod" element={<ModeratorDashboard />} />
        <Route path="/board" element={<Scoreboard />} />
      </Routes>
    </HashRouter>
  );
}

export default App;