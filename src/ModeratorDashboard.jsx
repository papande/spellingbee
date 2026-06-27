import React, { useState, useEffect } from 'react';
import { ref, onValue, set } from 'firebase/database';
import { db } from './firebase';
import wordData from './words.json';

const ModeratorDashboard = () => {
  const [currentWord, setCurrentWord] = useState(null);
  const [gameState, setGameState] = useState(null);
  const [players, setPlayers] = useState(null);
  const [undoStack, setUndoStack] = useState([]);

  useEffect(() => {
    const wordRef = ref(db, 'currentWord');
    onValue(wordRef, (snapshot) => snapshot.exists() && setCurrentWord(snapshot.val()));

    const stateRef = ref(db, 'gameState');
    onValue(stateRef, (snapshot) => snapshot.exists() && setGameState(snapshot.val()));

    const playersRef = ref(db, 'players');
    onValue(playersRef, (snapshot) => snapshot.exists() && setPlayers(snapshot.val()));
  }, []);

  const handleAnswer = (isCorrect) => {
    if (!gameState || !players || !currentWord) return;

    // A. Save snapshot for Undo
    const snapshot = {
      gameState: JSON.parse(JSON.stringify(gameState)),
      players: JSON.parse(JSON.stringify(players)),
      currentWord: JSON.parse(JSON.stringify(currentWord))
    };
    setUndoStack([...undoStack, snapshot]);

    const activeId = gameState.activePlayerId;
    const updatedPlayers = { ...players };
    const playerIds = Object.keys(updatedPlayers);
    
    // B. Record answer and preliminary elimination
    if (!updatedPlayers[activeId].wordHistory) updatedPlayers[activeId].wordHistory = [];
    updatedPlayers[activeId].wordHistory.push({ word: currentWord.word, correct: isCorrect });
    
    if (!isCorrect) {
      updatedPlayers[activeId].status = 'out';
    }

    // C. Calculate turn advancement and round completion
    let roundAdvanced = false;
    let nextIndex = (playerIds.indexOf(activeId) + 1) % playerIds.length;
    if (nextIndex === 0) roundAdvanced = true; // Natural wrap around

    let nextPlayerId = null;
    let scanCount = 0;

    // Scan for the next active player
    while (scanCount < playerIds.length) {
      const inspectId = playerIds[nextIndex];
      if (updatedPlayers[inspectId].status === 'in') {
        nextPlayerId = inspectId;
        break;
      }
      nextIndex = (nextIndex + 1) % playerIds.length;
      if (nextIndex === 0) roundAdvanced = true; // Wrap around during the scan
      scanCount++;
    }

    const updatedGameState = { ...gameState };

    // D. Evaluate Round-End Conditions (The Wipeout Rule)
    if (roundAdvanced) {
      const activePlayers = playerIds.filter(id => updatedPlayers[id].status === 'in');

      if (activePlayers.length === 0) {
        // WIPEOUT: Everyone missed. Reinstate players who missed THIS round.
        playerIds.forEach(id => {
          const hist = updatedPlayers[id].wordHistory;
          // If they went out on the current round number, bring them back
          if (updatedPlayers[id].status === 'out' && hist.length === gameState.roundNumber && !hist[hist.length - 1].correct) {
            updatedPlayers[id].status = 'in';
          }
        });
        // Recalculate who goes first in the reinstated round
        nextPlayerId = playerIds.find(id => updatedPlayers[id].status === 'in');
        updatedGameState.roundNumber += 1;

      } else if (activePlayers.length === 1) {
        // PENDING WINNER: Only one person survived the round!
        updatedGameState.pendingWinnerId = activePlayers[0];
        nextPlayerId = activePlayers[0]; // Keep them at the mic
      } else {
        // Normal round advance
        updatedGameState.roundNumber += 1;
      }
    }

    // E. Fetch Next Word
    const currentUsedWords = gameState.usedWords || [];
    currentUsedWords.push(currentWord.word);
    
    let nextWord = { word: "Level Complete", definition: "Advance the level to continue.", partOfSpeech: "", origin: "", sentence: "" };
    const levelKey = `level${gameState.currentLevel}`;
    
    if (wordData[levelKey]) {
      const availableWords = wordData[levelKey].filter(w => !currentUsedWords.includes(w.word));
      if (availableWords.length > 0) {
        const randomIndex = Math.floor(Math.random() * availableWords.length);
        nextWord = availableWords[randomIndex];
      }
    }

    // F. Finalize State
    updatedGameState.activePlayerId = nextPlayerId || activeId;
    updatedGameState.usedWords = currentUsedWords;

    set(ref(db, 'players'), updatedPlayers);
    set(ref(db, 'gameState'), updatedGameState);
    set(ref(db, 'currentWord'), nextWord);
  };

  const handleUndo = () => {
    if (undoStack.length === 0) return;
    const previousStack = [...undoStack];
    const lastState = previousStack.pop();
    set(ref(db, 'players'), lastState.players);
    set(ref(db, 'gameState'), lastState.gameState);
    set(ref(db, 'currentWord'), lastState.currentWord);
    setUndoStack(previousStack);
  };

  const confirmVictory = () => {
    set(ref(db, 'gameState/winnerId'), gameState.pendingWinnerId);
  };

  const changeLevel = (newLevel) => {
    if (!gameState || !wordData) return;

    const currentUsedWords = gameState.usedWords || [];
    const levelKey = `level${newLevel}`;
    let nextWord = null;

    // Fetch a fresh word from the new level
    if (wordData[levelKey]) {
      const availableWords = wordData[levelKey].filter(w => !currentUsedWords.includes(w.word));
      if (availableWords.length > 0) {
        const randomIndex = Math.floor(Math.random() * availableWords.length);
        nextWord = availableWords[randomIndex];
      }
    }

    if (!nextWord) {
      nextWord = { word: "No words left!", definition: "Level exhausted.", partOfSpeech: "", origin: "", sentence: "" };
    }

    // Push the new level and the new word to Firebase
    set(ref(db, 'gameState/currentLevel'), newLevel);
    set(ref(db, 'currentWord'), nextWord);
  };
  const toggleTimer = () => {
    set(ref(db, 'gameState/showTimer'), !gameState.showTimer);
  };

  if (!gameState || !players || !currentWord) {
    return <div style={{ padding: '2rem' }}>Initializing Game Connection...</div>;
  }

  const activePlayerName = players[gameState.activePlayerId]?.name || "None";

  // STYLES
  const styles = {
    container: { padding: '2rem', maxWidth: '600px', margin: '0 auto', textAlign: 'center' },
    header: { display: 'flex', justifyContent: 'space-between', borderBottom: '2px solid #ccc', paddingBottom: '1rem', marginBottom: '2rem' },
    wordCard: { backgroundColor: '#f4f4f9', padding: '2rem', borderRadius: '8px', marginBottom: '2rem' },
    wordTitle: { fontSize: '3rem', margin: '0 0 0.5rem 0', textTransform: 'capitalize', color: '#111' },
    dataRow: { marginBottom: '1rem', lineHeight: '1.5', color: '#333' },
    buttonRow: { display: 'flex', gap: '1rem', marginBottom: '2rem' },
    btnCorrect: { backgroundColor: '#28a745', color: 'white', padding: '1rem 2rem', fontSize: '1.2rem', border: 'none', borderRadius: '4px', cursor: 'pointer', flex: 1 },
    btnIncorrect: { backgroundColor: '#dc3545', color: 'white', padding: '1rem 2rem', fontSize: '1.2rem', border: 'none', borderRadius: '4px', cursor: 'pointer', flex: 1 },
    btnUndo: { backgroundColor: '#6c757d', color: 'white', padding: '1rem', fontSize: '1rem', border: 'none', borderRadius: '4px', cursor: 'pointer', opacity: undoStack.length === 0 ? 0.5 : 1, width: '100%', marginTop: '1rem' },
    btnConfirm: { backgroundColor: '#f39c12', color: 'white', padding: '2rem', fontSize: '2rem', border: 'none', borderRadius: '8px', cursor: 'pointer', width: '100%', fontWeight: 'bold', marginBottom: '1rem' },
    settingsPanel: { border: '1px solid #ddd', padding: '1rem', borderRadius: '8px' }
  };
return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h2>Moderator Controls</h2>
        <div style={{ textAlign: 'right' }}>
          <div>Level: {gameState.currentLevel} | Round: {gameState.roundNumber}</div>
          <div style={{ fontWeight: 'bold', marginTop: '0.5rem' }}>Current Speller: {activePlayerName}</div>
        </div>
      </div>

      {/* 1. PENDING APPROVAL SCREEN */}
      {gameState.pendingWinnerId && !gameState.winnerId ? (
        <div style={{ textAlign: 'center', backgroundColor: '#fff3cd', padding: '2rem', borderRadius: '8px', marginBottom: '2rem', border: '2px solid #ffeeba' }}>
          <h2 style={{ color: '#856404', marginBottom: '2rem' }}>
            {players[gameState.pendingWinnerId].name} is the last speller standing!
          </h2>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <button style={styles.btnConfirm} onClick={confirmVictory}>
              Confirm & Show Champion Screen
            </button>
            <p style={{ color: '#856404', margin: '0.5rem 0' }}>Wait, was that a mistake?</p>
            <button style={styles.btnUndo} onClick={handleUndo}>
              Undo Last Action
            </button>
          </div>
        </div>
      ) : gameState.winnerId ? (
        /* 2. CONFIRMED GAME OVER SCREEN */
        <div style={{ textAlign: 'center', backgroundColor: '#d4edda', padding: '3rem', borderRadius: '8px', marginBottom: '2rem', border: '2px solid #c3e6cb' }}>
          <h2 style={{ color: '#155724', fontSize: '2rem', marginBottom: '2rem' }}>
            Game Over! {players[gameState.winnerId].name} is the Champion.
          </h2>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <button 
              style={{ ...styles.btnUndo, backgroundColor: '#17a2b8', padding: '1.5rem', fontSize: '1.2rem', fontWeight: 'bold' }} 
              onClick={() => set(ref(db, 'gameState/viewFinalBoard'), !gameState.viewFinalBoard)}
            >
              {gameState.viewFinalBoard ? "Show Champion Screen on TV" : "Show Final Grid on TV"}
            </button>
            
            <button 
              style={{ ...styles.btnUndo, backgroundColor: '#dc3545', padding: '1.5rem', fontSize: '1.2rem', fontWeight: 'bold' }} 
              onClick={() => window.location.href = '/#/setup'}
            >
              Start a New Game
            </button>
          </div>
        </div>
      ) : (
        /* 3. NORMAL GAME UI */
        <>
          <div style={styles.wordCard}>
            <h1 style={styles.wordTitle}>{currentWord.word}</h1>
            <div style={{ color: '#666', fontStyle: 'italic', marginBottom: '1.5rem' }}>{currentWord.partOfSpeech}</div>
            {currentWord.origin && <div style={styles.dataRow}><strong>Origin:</strong> {currentWord.origin}</div>}
            <div style={styles.dataRow}><strong>Definition:</strong> {currentWord.definition}</div>
            {currentWord.sentence && <div style={styles.dataRow}><strong>Example:</strong> "{currentWord.sentence}"</div>}
          </div>

          <div style={styles.buttonRow}>
            <button style={styles.btnCorrect} onClick={() => handleAnswer(true)}>Correct</button>
            <button style={styles.btnIncorrect} onClick={() => handleAnswer(false)}>Incorrect</button>
          </div>
          <button style={styles.btnUndo} onClick={handleUndo} disabled={undoStack.length === 0} style={{...styles.btnUndo, width: '100%', marginTop: '1rem', marginBottom: '2rem'}}>
            Undo Last Action ({undoStack.length})
          </button>
        </>
      )}

      {/* Game Controls */}
      <div style={styles.settingsPanel}>
        <h3>Game Controls</h3>
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', marginBottom: '1rem' }}>
          <strong>Level:</strong>
          {[1, 2, 3].map(lvl => (
            <button 
              key={lvl}
              style={gameState.currentLevel === lvl ? styles.btnActive : styles.btnInactive} 
              onClick={() => changeLevel(lvl)}
            >
              Level {lvl}
            </button>
          ))}
        </div>
        <button style={styles.btnInactive} onClick={toggleTimer}>
          {gameState.showTimer ? "Turn Timer OFF" : "Turn Timer ON"}
        </button>
      </div>
    </div>
  );
};

export default ModeratorDashboard;