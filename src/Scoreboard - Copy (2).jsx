import React, { useState, useEffect } from 'react';
import { ref, onValue } from 'firebase/database';
import { db } from './firebase';

const Scoreboard = () => {
  const [gameState, setGameState] = useState({ activePlayerId: "", showTimer: false });
  const [players, setPlayers] = useState({});

  useEffect(() => {
    const stateRef = ref(db, 'gameState');
    // Safety Update: If snapshot doesn't exist, provide a safe fallback instead of crashing
    const unsubscribeState = onValue(stateRef, (snapshot) => {
      setGameState(snapshot.exists() ? snapshot.val() : { activePlayerId: "", showTimer: false });
    });

    const playersRef = ref(db, 'players');
    // Safety Update: Default to empty object if players are being wiped
    const unsubscribePlayers = onValue(playersRef, (snapshot) => {
      setPlayers(snapshot.exists() ? snapshot.val() : {});
    });

    return () => { unsubscribeState(); unsubscribePlayers(); };
  }, []);

  // Safety Update: Ensure players object exists before trying to access it
  const activePlayerName = (players && gameState.activePlayerId && players[gameState.activePlayerId]) 
    ? players[gameState.activePlayerId].name 
    : "Waiting...";
    
  const playerArray = players ? Object.keys(players).map(key => ({ id: key, ...players[key] })) : [];

  // STYLES
  const styles = {
    wrapper: { backgroundColor: '#121212', color: '#ffffff', minHeight: '100vh', fontFamily: 'sans-serif', padding: '2rem' },
    header: { textAlign: 'center', borderBottom: '2px solid #333', paddingBottom: '1rem', marginBottom: '3rem' },
    title: { fontSize: '2.5rem', margin: 0, letterSpacing: '2px', textTransform: 'uppercase', color: '#f39c12' },
    stage: { textAlign: 'center', marginBottom: '4rem' },
    stageLabel: { fontSize: '1.5rem', color: '#888', textTransform: 'uppercase', letterSpacing: '1px' },
    activeName: { fontSize: '6rem', margin: '0.5rem 0', fontWeight: 'bold' },
    rosterGrid: { display: 'flex', justifyContent: 'center', gap: '2rem', flexWrap: 'wrap' },
    cardIn: { backgroundColor: '#1e1e1e', border: '2px solid #333', borderRadius: '12px', padding: '2rem', minWidth: '250px', textAlign: 'center' },
    cardOut: { backgroundColor: '#121212', border: '2px solid #222', borderRadius: '12px', padding: '2rem', minWidth: '250px', textAlign: 'center', opacity: 0.5 },
    playerName: { fontSize: '2.5rem', margin: '0 0 1.5rem 0' },
    historyContainer: { display: 'flex', flexDirection: 'column', gap: '8px', alignItems: 'center' },
    wordCorrect: { color: '#4caf50', fontSize: '1.5rem', fontWeight: 'bold' },
    wordIncorrect: { color: '#f44336', fontSize: '1.5rem', textDecoration: 'line-through', opacity: 0.8 },
    noPlayers: { fontSize: '1.5rem', color: '#888', fontStyle: 'italic' }
  };

  // RENDER UI
  // The TV will now only show the Winner screen if viewFinalBoard is NOT true
  if (gameState.winnerId && players && players[gameState.winnerId] && !gameState.viewFinalBoard) {
    const winner = players[gameState.winnerId];
    return (
      <div style={{ ...styles.wrapper, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', backgroundColor: '#000' }}>
        <h2 style={{ color: '#f39c12', fontSize: '3rem', letterSpacing: '4px', textTransform: 'uppercase', marginBottom: '1rem' }}>
          Champion
        </h2>
        <h1 style={{ fontSize: '8rem', margin: '0 0 2rem 0', fontWeight: 'bold' }}>
          {winner.name}
        </h1>
        <div style={{ fontSize: '1.5rem', color: '#888' }}>
          Spelled {winner.wordHistory ? winner.wordHistory.filter(w => w.correct).length : 0} words correctly!
        </div>
      </div>
    );
  }

  // Normal Scoreboard UI
  return (
    <div style={styles.wrapper}>
      <div style={styles.header}>
        <h1 style={styles.title}>Spelling Bee</h1>
      </div>

      <div style={styles.stage}>
        <div style={styles.stageLabel}>Current Speller</div>
        <div style={styles.activeName}>{activePlayerName}</div>
      </div>

      <div style={styles.rosterGrid}>
        {playerArray.length > 0 ? (
          playerArray.map((player) => (
            <div key={player.id} style={player.status === 'in' ? styles.cardIn : styles.cardOut}>
              <h2 style={styles.playerName}>
                {player.name} {player.status === 'out' && "(OUT)"}
              </h2>
              
              <div style={styles.historyContainer}>
                {player.wordHistory && player.wordHistory.map((item, index) => (
                  <div key={index} style={item.correct ? styles.wordCorrect : styles.wordIncorrect}>
                     {item.word}
                  </div>
                ))}
              </div>
            </div>
          ))
        ) : (
          <div style={styles.noPlayers}>Waiting for players to join the session...</div>
        )}
      </div>
    </div>
  );
};

export default Scoreboard;