import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ref, set } from 'firebase/database';
import { db } from './firebase';
import wordData from './words.json';

const SetupLobby = () => {
  const [playerName, setPlayerName] = useState('');
  const [playerList, setPlayerList] = useState([]);
  const navigate = useNavigate(); // Used to redirect to the mod panel after setup

  const handleAddPlayer = (e) => {
    e.preventDefault();
    if (playerName.trim() === '') return;
    setPlayerList([...playerList, playerName.trim()]);
    setPlayerName(''); // Clear the input field
  };

  const handleRemovePlayer = (indexToRemove) => {
    setPlayerList(playerList.filter((_, index) => index !== indexToRemove));
  };

  const handleStartGame = () => {
    if (playerList.length === 0) {
      alert("Please add at least one player to start the game.");
      return;
    }

    // 1. Format the players object for Firebase
    const newPlayers = {};
    playerList.forEach((name, index) => {
      newPlayers[`player_${index + 1}`] = {
        name: name,
        status: 'in',
        wordHistory: []
      };
    });

    // 2. Grab a starting word from Level 1
    let firstWord = { word: "No words found", definition: "", partOfSpeech: "", origin: "", sentence: "" };
    if (wordData.level1 && wordData.level1.length > 0) {
      const randomIndex = Math.floor(Math.random() * wordData.level1.length);
      firstWord = wordData.level1[randomIndex];
    }

    // 3. Set the fresh Game State
    const initialGameState = {
      currentLevel: 1,
      roundNumber: 1,
      activePlayerId: "player_1",
      showTimer: false,
      usedWords: [firstWord.word],
      pendingWinnerId: null, // Awaiting your approval
      winnerId: null,         // The official champion
	  viewFinalBoard: false // Ensures the TV resets properly
    };

    // 4. Batch push the clean slate to Firebase
    set(ref(db, 'players'), newPlayers);
    set(ref(db, 'gameState'), initialGameState);
    set(ref(db, 'currentWord'), firstWord);

    // 5. Instantly redirect the moderator to the control panel
    navigate('/mod');
  };

  // Styles
  const styles = {
    container: { padding: '2rem', maxWidth: '600px', margin: '0 auto', textAlign: 'center' },
    title: { fontSize: '2.5rem', marginBottom: '2rem' },
    form: { display: 'flex', gap: '1rem', marginBottom: '2rem', justifyContent: 'center' },
    input: { padding: '0.75rem', fontSize: '1.2rem', flex: 1, borderRadius: '4px', border: '1px solid #ccc' },
    btnAdd: { backgroundColor: '#28a745', color: 'white', padding: '0.75rem 1.5rem', fontSize: '1.2rem', border: 'none', borderRadius: '4px', cursor: 'pointer' },
    list: { listStyle: 'none', padding: 0, marginBottom: '2rem', textAlign: 'left' },
    listItem: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem', backgroundColor: '#f4f4f9', marginBottom: '0.5rem', borderRadius: '4px', fontSize: '1.2rem' },
    btnRemove: { backgroundColor: '#dc3545', color: 'white', padding: '0.5rem 1rem', border: 'none', borderRadius: '4px', cursor: 'pointer' },
    btnStart: { backgroundColor: '#007bff', color: 'white', padding: '1rem 2rem', fontSize: '1.5rem', border: 'none', borderRadius: '4px', cursor: 'pointer', width: '100%', fontWeight: 'bold' }
  };

  return (
    <div style={styles.container}>
      <h1 style={styles.title}>Game Setup</h1>
      
      <form style={styles.form} onSubmit={handleAddPlayer}>
        <input 
          style={styles.input}
          type="text" 
          value={playerName} 
          onChange={(e) => setPlayerName(e.target.value)} 
          placeholder="Enter player name..." 
        />
        <button type="submit" style={styles.btnAdd}>Add Player</button>
      </form>

      <ul style={styles.list}>
        {playerList.map((player, index) => (
          <li key={index} style={styles.listItem}>
            <span>{index + 1}. {player}</span>
            <button style={styles.btnRemove} onClick={() => handleRemovePlayer(index)}>Remove</button>
          </li>
        ))}
      </ul>

      {playerList.length > 0 && (
        <button style={styles.btnStart} onClick={handleStartGame}>
          Initialize & Start Game
        </button>
      )}
    </div>
  );
};

export default SetupLobby;