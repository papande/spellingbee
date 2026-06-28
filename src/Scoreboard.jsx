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
      padding: `${1.5 * shrinkFactor}rem`, 
      minWidth: `${200 * shrinkFactor}px`, 
      textAlign: 'center',
      transition: 'all 0.5s cubic-bezier(0.4, 0, 0.2, 1)',
      border: '2px solid',
      // ADD THESE FOUR LINES:
      display: 'flex',
      flexDirection: 'column',
      minHeight: 0, 
      overflow: 'hidden'
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
    // 1. WRAPPER: Changed to an exact height, flex column, and hidden overflow
    wrapper: { 
      backgroundColor: '#0a0a0a', 
      color: '#ffffff', 
      height: '100vh',        // CHANGED: Strict height instead of minHeight
      padding: '2rem', 
      transition: 'background-color 0.5s ease',
      display: 'flex',          // ADDED
      flexDirection: 'column',  // ADDED
      overflow: 'hidden',       // ADDED: Absolutely forbids page scrolling
      boxSizing: 'border-box'   // ADDED: Ensures the 2rem padding doesn't push it past 100vh
    },
    header: { textAlign: 'center', borderBottom: '1px solid #222', paddingBottom: '1rem', marginBottom: '2rem' },
    title: { fontSize: '2.5rem', margin: 0, letterSpacing: '4px', textTransform: 'uppercase', color: '#f39c12' },
    
    // 2. STAGE: Protected from shrinking so the active player is always large
    stage: { 
      textAlign: 'center', 
      marginBottom: '2rem', 
      flexShrink: 0           // ADDED: Prevents the grid below from squishing this area
    },
    stageLabel: { fontSize: '1.2rem', color: '#666', textTransform: 'uppercase', letterSpacing: '2px', marginBottom: '0.5rem' },
    activeName: { fontSize: '6rem', margin: '1rem 0 0 0', lineHeight: 1, fontWeight: 'bold', textShadow: '0 4px 20px rgba(0,0,0,0.5)', transition: 'all 0.3s ease' },
    
    // 3. ROSTER GRID: Forced to absorb remaining space but NEVER exceed it
    rosterGrid: { 
      display: 'grid', 
      gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
      gap: '1rem', 
      width: '95%',
      margin: '0 auto',
      flex: 1,              // ADDED: Tells grid to take all remaining vertical space
      minHeight: 0,         // CRITICAL: Tells Firefox it is allowed to shrink this container
      overflow: 'hidden'    // CRITICAL: Hides bottom overflow
    },

    // 4. PLAYER CARD: I added this. You must wrap each individual player inside the grid with this!
    playerCard: {           
      display: 'flex',
      flexDirection: 'column',
      minHeight: 0,         // CRITICAL: Tells Firefox the cards can shrink too
      overflow: 'hidden'
    },

    playerName: { fontSize: '2.5rem', margin: '0 0 1rem 0', transition: 'color 0.3s ease' },
    
    // 5. HISTORY: Also locked down so a long list of words doesn't break the layout
    historyContainer: { 
      display: 'flex', 
      flexDirection: 'column', 
      gap: '8px', 
      alignItems: 'center',
      minHeight: 0,         // ADDED
      overflow: 'hidden'    // ADDED: Clips off older words if the list gets too long for the TV
    },
    
    wordCorrect: { color: '#4caf50', fontSize: '1.5rem', fontWeight: 'bold' },
    wordIncorrect: { color: '#f44336', fontSize: '1.5rem', textDecoration: 'line-through', opacity: 0.8 },
    noPlayers: { fontSize: '1.5rem', color: '#666', fontStyle: 'italic' }
  };
  
  // DYNAMIC WORD STYLER
  const getWordStyle = (isCorrect, totalWords) => {
    // Default sizes for short lists
    let size = '1.5rem';
    let space = '8px';

    // As the list grows, shrink the text and margins
    if (totalWords >= 16) {
      size = '0.85rem'; space = '1px';
    } else if (totalWords >= 12) {
      size = '1rem'; space = '3px';
    } else if (totalWords >= 8) {
      size = '1.2rem'; space = '5px';
    }

    return {
      color: isCorrect ? '#4caf50' : '#f44336',
      fontSize: size,
      fontWeight: isCorrect ? 'bold' : 'normal',
      textDecoration: isCorrect ? 'none' : 'line-through',
      opacity: isCorrect ? 1 : 0.8,
      margin: `0 0 ${space} 0`, // Replaces the gap in the container
      transition: 'all 0.3s ease'
    };
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
            const historyLength = player.wordHistory ? player.wordHistory.length : 0; // Get the count!

            return (
              <div key={player.id} style={getCardStyle(player, isActive, playerArray.length)}>
                <h2 style={{...styles.playerName, color: isActive ? '#fff' : player.status === 'out' ? '#555' : '#ccc'}}>
                  {player.name}
                </h2>
                
                {/* Removed the gap from here, as our new function handles margin! */}
                <div style={{ ...styles.historyContainer, gap: '0px' }}>
                  {player.wordHistory && player.wordHistory.map((item, index) => (
                    
                    // Apply the dynamic word style here!
                    <div key={index} style={getWordStyle(item.correct, historyLength)}>
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