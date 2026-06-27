import React, { useState, useEffect } from 'react';
import { ref, onValue, set } from 'firebase/database';
import { db } from './firebase';
import wordData from './words.json';

const ModeratorDashboard = () => {
  const [currentWord, setCurrentWord] = useState(null);
  const [gameState, setGameState] = useState(null);
  const [players, setPlayers] = useState(null);
  const [undoStack, setUndoStack] = useState([]);

  // 1. LISTEN TO FIREBASE DATA
  useEffect(() => {
    const wordRef = ref(db, 'currentWord');
    onValue(wordRef, (snapshot) => snapshot.exists() && setCurrentWord(snapshot.val()));

    const stateRef = ref(db, 'gameState');
    onValue(stateRef, (snapshot) => snapshot.exists() && setGameState(snapshot.val()));

    const playersRef = ref(db, 'players');
    onValue(playersRef, (snapshot) => snapshot.exists() && setPlayers(snapshot.val()));
  }, []);

  // 2. CORE GAME ENGINE LOGIC
  const handleAnswer = (isCorrect) => {
    if (!gameState || !players || !currentWord) return;

    // A. Save snapshot for the Undo button
    const snapshot = {
      gameState: JSON.parse(JSON.stringify(gameState)),
      players: JSON.parse(JSON.stringify(players)),
      currentWord: JSON.parse(JSON.stringify(currentWord))
    };
    setUndoStack([...undoStack, snapshot]);

    const activeId = gameState.activePlayerId;
    const updatedPlayers = { ...players };
    
    // B. Update the active player's history and status
    if (!updatedPlayers[activeId].wordHistory) {
      updatedPlayers[activeId].wordHistory = [];
    }
    updatedPlayers[activeId].wordHistory.push({
      word: currentWord.word,
      correct: isCorrect
    });

    if (!isCorrect) {
      updatedPlayers[activeId].status = 'out';
    }

    // C. Calculate who goes next
    const playerIds = Object.keys(updatedPlayers);
    let nextPlayerId = null;
    let nextIndex = (playerIds.indexOf(activeId) + 1) % playerIds.length;
    let roundAdvanced = false;

    // If we wrapped around to index 0, we've completed a full round rotation
    if (nextIndex === 0) roundAdvanced = true;

    // Scan forward to find the next player still in the game
    for (let i = 0; i < playerIds.length; i++) {
      const inspectId = playerIds[nextIndex];
      if (updatedPlayers[inspectId].status === 'in') {
        nextPlayerId = inspectId;
        break;
      }
      nextIndex = (nextIndex + 1) % playerIds.length;
      if (nextIndex === 0) roundAdvanced = true;
    }

    // D. Track the used word
    const currentUsedWords = gameState.usedWords || [];
    if (currentWord && currentWord.word) {
      currentUsedWords.push(currentWord.word);
    }

    // E. Pick a random, unused word based on the current level
    let nextWord = null;
    const levelKey = `level${gameState.currentLevel}`; // e.g., "level1"
    
    // Check if the level actually exists in your JSON
    if (wordData[levelKey]) {
      // Filter out any words we've already used tonight
      const availableWords = wordData[levelKey].filter(w => !currentUsedWords.includes(w.word));

      if (availableWords.length > 0) {
        // Pick a random word from the available pool
        const randomIndex = Math.floor(Math.random() * availableWords.length);
        nextWord = availableWords[randomIndex];
      } else {
        // Fallback if you run out of words for this level
        nextWord = {
          word: "Level Complete!",
          definition: "No more words in this level. Please advance the level.",
          partOfSpeech: "System",
          origin: "N/A",
          exampleSentence: ""
        };
      }
    }

    // F. Update Game State Settings
    const updatedGameState = {
      ...gameState,
      activePlayerId: nextPlayerId || activeId,
      roundNumber: roundAdvanced ? gameState.roundNumber + 1 : gameState.roundNumber,
      usedWords: currentUsedWords // Save our used words list to Firebase
    };

    // G. Batch push everything to Firebase simultaneously
    set(ref(db, 'players'), updatedPlayers);
    set(ref(db, 'gameState'), updatedGameState);
    set(ref(db, 'currentWord'), nextWord);
  };

  // 3. THE UNDO HANDLER
  const handleUndo = () => {
    if (undoStack.length === 0) return;

    const previousStack = [...undoStack];
    const lastState = previousStack.pop(); // Grab the last saved snapshot

    // Overwrite Firebase with the past snapshot
    set(ref(db, 'players'), lastState.players);
    set(ref(db, 'gameState'), lastState.gameState);
    set(ref(db, 'currentWord'), lastState.currentWord);

    setUndoStack(previousStack); // Remove it from our local undo memory history
  };

// 4. GAME CONTROL HANDLERS
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
    if (!gameState) return;
    set(ref(db, 'gameState/showTimer'), !gameState.showTimer);
  };

  if (!gameState || !players || !currentWord) {
    return <div style={{ padding: '2rem', fontFamily: 'sans-serif' }}>Initializing Game Connection...</div>;
  }

  const activePlayerName = players[gameState.activePlayerId]?.name || "None";

  // 4. STYLES
  const styles = {
    container: { padding: '2rem', fontFamily: 'sans-serif', maxWidth: '800px', margin: '0 auto' },
    header: { display: 'flex', justifyContent: 'space-between', borderBottom: '2px solid #ccc', paddingBottom: '1rem', marginBottom: '2rem' },
    wordCard: { backgroundColor: '#f4f4f9', padding: '2rem', borderRadius: '8px', marginBottom: '2rem' },
    wordTitle: { fontSize: '3rem', margin: '0 0 0.5rem 0', textTransform: 'capitalize', color: '#111' },
    metaText: { color: '#666', fontStyle: 'italic', marginBottom: '1.5rem' },
    dataRow: { marginBottom: '1rem', lineHeight: '1.5', color: '#333' },
    buttonRow: { display: 'flex', gap: '1rem', marginBottom: '2rem' },
    btnCorrect: { backgroundColor: '#28a745', color: 'white', padding: '1rem 2rem', fontSize: '1.2rem', border: 'none', borderRadius: '4px', cursor: 'pointer', flex: 1 },
    btnIncorrect: { backgroundColor: '#dc3545', color: 'white', padding: '1rem 2rem', fontSize: '1.2rem', border: 'none', borderRadius: '4px', cursor: 'pointer', flex: 1 },
    btnUndo: { backgroundColor: '#6c757d', color: 'white', padding: '1rem', fontSize: '1rem', border: 'none', borderRadius: '4px', cursor: 'pointer', opacity: undoStack.length === 0 ? 0.5 : 1 },
    settingsPanel: { border: '1px solid #ddd', padding: '1rem', borderRadius: '8px' },
	btnActive: { backgroundColor: '#007bff', color: 'white', padding: '0.75rem 1.5rem', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' },
    btnInactive: { backgroundColor: '#e9ecef', color: '#333', padding: '0.75rem 1.5rem', border: 'none', borderRadius: '4px', cursor: 'pointer' }
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

      <div style={styles.wordCard}>
        <h1 style={styles.wordTitle}>{currentWord.word}</h1>
        <div style={styles.metaText}>{currentWord.partOfSpeech}</div>
        
        {/* Origin moved to its own line */}
        {currentWord.origin && (
          <div style={styles.dataRow}>
            <strong>Origin:</strong> {currentWord.origin}
          </div>
        )}
        
        <div style={styles.dataRow}>
          <strong>Definition:</strong> {currentWord.definition}
        </div>
        
        {/* Updated to use the correct .sentence key from your JSON */}
        {currentWord.sentence && (
          <div style={styles.dataRow}>
            <strong>Example:</strong> "{currentWord.sentence}"
          </div>
        )}
      </div>

      <div style={styles.buttonRow}>
        <button style={styles.btnCorrect} onClick={() => handleAnswer(true)}>Correct</button>
        <button style={styles.btnIncorrect} onClick={() => handleAnswer(false)}>Incorrect</button>
        <button style={styles.btnUndo} onClick={handleUndo} disabled={undoStack.length === 0}>
          Undo Last Action ({undoStack.length})
        </button>
      </div>

      <div style={styles.settingsPanel}>
        <h3>Game Controls</h3>
        
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', marginBottom: '1rem' }}>
          <strong style={{ minWidth: '80px' }}>Level:</strong>
          <button 
            style={gameState.currentLevel === 1 ? styles.btnActive : styles.btnInactive} 
            onClick={() => changeLevel(1)}
          >
            Level 1
          </button>
          <button 
            style={gameState.currentLevel === 2 ? styles.btnActive : styles.btnInactive} 
            onClick={() => changeLevel(2)}
          >
            Level 2
          </button>
          <button 
            style={gameState.currentLevel === 3 ? styles.btnActive : styles.btnInactive} 
            onClick={() => changeLevel(3)}
          >
            Level 3
          </button>
        </div>

        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
          <strong style={{ minWidth: '80px' }}>Timer:</strong>
          <button 
            style={gameState.showTimer ? styles.btnActive : styles.btnInactive} 
            onClick={toggleTimer}
          >
            {gameState.showTimer ? "Turn Timer OFF" : "Turn Timer ON"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ModeratorDashboard;