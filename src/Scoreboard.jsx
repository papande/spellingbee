import React, { useState, useEffect } from 'react';
import { ref, onValue } from 'firebase/database';
import { db } from './firebase';

const Scoreboard = () => {
  const [gameState, setGameState] = useState({ activePlayerId: "", showTimer: false });
  const [players, setPlayers] = useState({});

  useEffect(() => {
    const stateRef = ref(db, 'gameState');
    const unsubscribeState = onValue(stateRef, (snapshot) => {
      setGameState(snapshot.exists() ? snapshot.val() : { activePlayerId: "", showTimer: false });
    });

    const playersRef = ref(db, 'players');
    const unsubscribePlayers = onValue(playersRef, (snapshot) => {
      setPlayers(snapshot.exists() ? snapshot.val() : {});
    });

    return () => { unsubscribeState(); unsubscribePlayers(); };
  }, []);

  const activePlayerName = (players && gameState.activePlayerId && players[gameState.activePlayerId]) 
    ? players[gameState.activePlayerId].name 
    : "Waiting...";
    
  const playerArray = players ? Object.keys(players).map(key => ({ id: key, ...players[key] })) : [];

  // DYNAMIC CARD STYLER
  const getCardStyle = (player, isActive, totalPlayers) => {
    // If more than 5 players, shrink the cards dynamically
    const shrinkFactor = totalPlayers > 5 ? 0.8 : 1;
    
    const baseStyle = {
      borderRadius: '12px',
      padding: `${1.5 * shrinkFactor}rem`, // Less padding
      minWidth: `${200 * shrinkFactor}px`, // Smaller cards
      textAlign: 'center',
      transition: 'all 0.5s cubic-bezier(0.4, 0, 0.2, 1)',
      border: '2px solid'
    };

    // 2. The Eliminated Style
    if (player.status === 'out') {
      return {
        ...baseStyle,
        backgroundColor: '#121212',
        borderColor: '#222',
        opacity: 0.3,
        transform: 'scale(0.95)' // Shrinks back slightly
      };
    }

    // 3. The Active Spotlight Style
    if (isActive) {
      return {
        ...baseStyle,
        backgroundColor: '#1a1a1a',
        borderColor: '#f39c12', // Gold border
        boxShadow: '0 0 30px rgba(243, 156, 18, 0.3)', // Soft gold glow
        opacity: 1,
        transform: 'scale(1.05)' // Pops forward slightly
      };
    }

    // 4. The Waiting Style (In, but not their turn)
    return {
      ...baseStyle,
      backgroundColor: '#161616',
      borderColor: '#333',
      opacity: 0.7,
      transform: 'scale(1)'
    };
  };

  // STATIC STYLES
  const styles = {
    wrapper: { backgroundColor: '#0a0a0a', color: '#ffffff', minHeight: '100vh', padding: '2rem', transition: 'background-color 0.5s ease' },
    header: { textAlign: 'center', borderBottom: '1px solid #222', paddingBottom: '1rem', marginBottom: '3rem' },
    title: { fontSize: '2.5rem', margin: 0, letterSpacing: '4px', textTransform: 'uppercase', color: '#f39c12' },
    stage: { textAlign: 'center', marginBottom: '4rem' },
    stageLabel: { fontSize: '1.2rem', color: '#666', textTransform: 'uppercase', letterSpacing: '2px', marginBottom: '0.5rem' },
    activeName: { fontSize: '6rem', margin: '1rem 0 0 0', lineHeight: 1, fontWeight: 'bold', textShadow: '0 4px 20px rgba(0,0,0,0.5)', transition: 'all 0.3s ease' },
    rosterGrid: { 
      display: 'grid', 
      gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
      gap: '1rem', 
      width: '95%',
      margin: '0 auto' 
    },
    playerName: { fontSize: '2.5rem', margin: '0 0 1.5rem 0', transition: 'color 0.3s ease' },
    historyContainer: { display: 'flex', flexDirection: 'column', gap: '8px', alignItems: 'center' },
    wordCorrect: { color: '#4caf50', fontSize: '1.5rem', fontWeight: 'bold' },
    wordIncorrect: { color: '#f44336', fontSize: '1.5rem', textDecoration: 'line-through', opacity: 0.8 },
    noPlayers: { fontSize: '1.5rem', color: '#666', fontStyle: 'italic' }
  };

  // RENDER UI
  if (gameState.winnerId && players && players[gameState.winnerId] && !gameState.viewFinalBoard) {
    const winner = players[gameState.winnerId];
    return (
      <div style={{ ...styles.wrapper, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', backgroundColor: '#050505' }}>
        <h2 style={{ color: '#f39c12', fontSize: '3rem', letterSpacing: '6px', textTransform: 'uppercase', marginBottom: '1rem', animation: 'fadeIn 1s ease-in' }}>
          Champion
        </h2>
        <h1 style={{ fontSize: '10rem', margin: '1rem 0 2rem 0', lineHeight: 1, fontWeight: 'bold', textShadow: '0 0 40px rgba(243, 156, 18, 0.4)' }}>
          {winner.name}
        </h1>
        <div style={{ fontSize: '2rem', color: '#888' }}>
          Spelled {winner.wordHistory ? winner.wordHistory.filter(w => w.correct).length : 0} words correctly!
        </div>
      </div>
    );
  }

  return (
    <div style={styles.wrapper}>
      <div style={styles.header}>
        <h1 style={styles.title}>Spelling Bee</h1>
		<div style={{ color: '#f39c12', fontSize: '1.2rem', marginTop: '0.5rem' }}>Level {gameState.currentLevel}</div>
      </div>

      <div style={styles.stage}>
        <div style={styles.stageLabel}>Current Speller</div>
        <div style={styles.activeName}>{activePlayerName}</div>
      </div>

      <div style={styles.rosterGrid}>
        {playerArray.length > 0 ? (
          playerArray.map((player) => {
            const isActive = player.id === gameState.activePlayerId;
            return (
              <div key={player.id} style={getCardStyle(player, isActive)}>
                <h2 style={{...styles.playerName, color: isActive ? '#fff' : player.status === 'out' ? '#555' : '#ccc'}}>
                  {player.name}
                </h2>
                
                <div style={styles.historyContainer}>
                  {player.wordHistory && player.wordHistory.map((item, index) => (
                    <div key={index} style={item.correct ? styles.wordCorrect : styles.wordIncorrect}>
                       {item.word}
                    </div>
                  ))}
                </div>
              </div>
            );
          })
        ) : (
          <div style={styles.noPlayers}>Waiting for players to join the session...</div>
        )}
      </div>
    </div>
  );
};

export default Scoreboard;