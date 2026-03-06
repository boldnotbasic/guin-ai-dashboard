import React, { useState, useEffect } from 'react';
import { Target, Plus, Minus, RotateCcw, Trophy, User, X, TrendingUp, Award } from 'lucide-react';

const CaveDartsPage = () => {
  const [players, setPlayers] = useState(() => {
    const saved = localStorage.getItem('cave-darts-players');
    return saved ? JSON.parse(saved) : [];
  });
  const [currentPlayerIndex, setCurrentPlayerIndex] = useState(() => {
    const saved = localStorage.getItem('cave-darts-current-player');
    return saved ? parseInt(saved) : 0;
  });
  const [gameStarted, setGameStarted] = useState(() => {
    const saved = localStorage.getItem('cave-darts-game-started');
    return saved === 'true';
  });
  const [showAddPlayer, setShowAddPlayer] = useState(false);
  const [newPlayerName, setNewPlayerName] = useState('');
  const [currentScore, setCurrentScore] = useState('');
  const [gameHistory, setGameHistory] = useState(() => {
    const saved = localStorage.getItem('cave-darts-history');
    return saved ? JSON.parse(saved) : [];
  });
  const [savedGames, setSavedGames] = useState(() => {
    const saved = localStorage.getItem('cave-darts-saved-games');
    return saved ? JSON.parse(saved) : [];
  });

  // Save game state to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('cave-darts-players', JSON.stringify(players));
  }, [players]);

  useEffect(() => {
    localStorage.setItem('cave-darts-current-player', currentPlayerIndex.toString());
  }, [currentPlayerIndex]);

  useEffect(() => {
    localStorage.setItem('cave-darts-game-started', gameStarted.toString());
  }, [gameStarted]);

  useEffect(() => {
    localStorage.setItem('cave-darts-history', JSON.stringify(gameHistory));
  }, [gameHistory]);

  useEffect(() => {
    localStorage.setItem('cave-darts-saved-games', JSON.stringify(savedGames));
  }, [savedGames]);

  // Checkout suggestions for common scores
  const checkoutSuggestions = {
    170: ['T20', 'T20', 'Bull'],
    167: ['T20', 'T19', 'Bull'],
    164: ['T20', 'T18', 'Bull'],
    161: ['T20', 'T17', 'Bull'],
    160: ['T20', 'T20', 'D20'],
    158: ['T20', 'T20', 'D19'],
    157: ['T20', 'T19', 'D20'],
    156: ['T20', 'T20', 'D18'],
    155: ['T20', 'T19', 'D19'],
    154: ['T20', 'T18', 'D20'],
    153: ['T20', 'T19', 'D18'],
    152: ['T20', 'T20', 'D16'],
    151: ['T20', 'T17', 'D20'],
    150: ['T20', 'T18', 'D18'],
    149: ['T20', 'T19', 'D16'],
    148: ['T20', 'T20', 'D14'],
    147: ['T20', 'T17', 'D18'],
    146: ['T20', 'T18', 'D16'],
    145: ['T20', 'T19', 'D14'],
    144: ['T20', 'T20', 'D12'],
    141: ['T20', 'T19', 'D12'],
    140: ['T20', 'T20', 'D10'],
    138: ['T20', 'T18', 'D12'],
    137: ['T20', 'T19', 'D10'],
    136: ['T20', 'T20', 'D8'],
    135: ['T20', 'T17', 'D12'],
    134: ['T20', 'T14', 'D16'],
    132: ['T20', 'T16', 'D12'],
    131: ['T20', 'T13', 'D16'],
    130: ['T20', 'T20', 'D5'],
    129: ['T19', 'T16', 'D12'],
    128: ['T18', 'T14', 'D16'],
    127: ['T20', 'T17', 'D8'],
    126: ['T19', 'T19', 'D6'],
    125: ['T18', 'T13', 'D16'],
    124: ['T20', 'T16', 'D8'],
    123: ['T19', 'T16', 'D9'],
    122: ['T18', 'T18', 'D7'],
    121: ['T20', 'T11', 'D14'],
    120: ['T20', 'S20', 'D20'],
    119: ['T19', 'T12', 'D13'],
    118: ['T20', 'S18', 'D20'],
    117: ['T20', 'S17', 'D20'],
    116: ['T20', 'S16', 'D20'],
    115: ['T20', 'S15', 'D20'],
    114: ['T20', 'S14', 'D20'],
    113: ['T20', 'S13', 'D20'],
    112: ['T20', 'S12', 'D20'],
    111: ['T20', 'S19', 'D16'],
    110: ['T20', 'S18', 'D16'],
    109: ['T20', 'S17', 'D16'],
    108: ['T20', 'S16', 'D16'],
    107: ['T19', 'S18', 'D16'],
    106: ['T20', 'S14', 'D16'],
    105: ['T20', 'S13', 'D16'],
    104: ['T18', 'S18', 'D16'],
    103: ['T19', 'S14', 'D16'],
    102: ['T20', 'S10', 'D16'],
    101: ['T17', 'S18', 'D16'],
    100: ['T20', 'D20'],
    98: ['T20', 'D19'],
    96: ['T20', 'D18'],
    94: ['T18', 'D20'],
    92: ['T20', 'D16'],
    90: ['T18', 'D18'],
    88: ['T16', 'D20'],
    86: ['T18', 'D16'],
    84: ['T20', 'D12'],
    82: ['T14', 'D20'],
    80: ['T20', 'D10'],
    78: ['T18', 'D12'],
    76: ['T20', 'D8'],
    74: ['T14', 'D16'],
    72: ['T16', 'D12'],
    70: ['T18', 'D8'],
    68: ['T20', 'D4'],
    66: ['T10', 'D18'],
    64: ['T16', 'D8'],
    62: ['T10', 'D16'],
    60: ['S20', 'D20'],
    58: ['S18', 'D20'],
    56: ['T16', 'D4'],
    54: ['S14', 'D20'],
    52: ['S12', 'D20'],
    50: ['S10', 'D20'],
    48: ['S16', 'D16'],
    46: ['S6', 'D20'],
    44: ['S12', 'D16'],
    42: ['S10', 'D16'],
    40: ['D20'],
    38: ['D19'],
    36: ['D18'],
    34: ['D17'],
    32: ['D16'],
    30: ['D15'],
    28: ['D14'],
    26: ['D13'],
    24: ['D12'],
    22: ['D11'],
    20: ['D10'],
    18: ['D9'],
    16: ['D8'],
    14: ['D7'],
    12: ['D6'],
    10: ['D5'],
    8: ['D4'],
    6: ['D3'],
    4: ['D2'],
    2: ['D1']
  };

  const addPlayer = () => {
    if (newPlayerName.trim()) {
      setPlayers([...players, {
        id: Date.now(),
        name: newPlayerName.trim(),
        score: 501,
        throws: [],
        average: 0,
        dartsThrown: 0
      }]);
      setNewPlayerName('');
      setShowAddPlayer(false);
    }
  };

  const startGame = () => {
    if (players.length >= 2) {
      setGameStarted(true);
      setCurrentPlayerIndex(0);
    }
  };

  const resetGame = () => {
    setPlayers(players.map(p => ({
      ...p,
      score: 501,
      throws: [],
      average: 0,
      dartsThrown: 0
    })));
    setCurrentPlayerIndex(0);
    setCurrentScore('');
    setGameStarted(false);
  };

  const saveGame = (winner, winnerData) => {
    const gameData = {
      id: Date.now(),
      winner: winner.name,
      date: new Date().toISOString(),
      players: players.map(p => ({
        name: p.name,
        finalScore: p.score,
        average: p.average,
        dartsThrown: p.dartsThrown,
        totalThrows: p.throws.length,
        isWinner: p.id === winner.id
      })),
      winnerAverage: winnerData.average,
      winnerDarts: winnerData.dartsThrown
    };
    
    setSavedGames([gameData, ...savedGames]);
    return gameData;
  };

  const submitScore = () => {
    const score = parseInt(currentScore);
    if (isNaN(score) || score < 0 || score > 180) return;

    const currentPlayer = players[currentPlayerIndex];
    const newScore = currentPlayer.score - score;

    // Check for bust (score goes below 0 or equals 1)
    if (newScore < 0 || newScore === 1) {
      alert('BUST! Score blijft hetzelfde.');
      setCurrentScore('');
      setCurrentPlayerIndex((currentPlayerIndex + 1) % players.length);
      return;
    }

    // Check for win
    if (newScore === 0) {
      const newDartsThrown = currentPlayer.dartsThrown + 3;
      const totalScore = currentPlayer.throws.reduce((a, b) => a + b, 0) + score;
      const finalAverage = (totalScore / newDartsThrown) * 3;
      
      const winnerData = {
        ...currentPlayer,
        score: 0,
        throws: [...currentPlayer.throws, score],
        dartsThrown: newDartsThrown,
        average: finalAverage
      };
      
      const updatedPlayers = [...players];
      updatedPlayers[currentPlayerIndex] = winnerData;
      setPlayers(updatedPlayers);
      
      // Save the game
      const savedGame = saveGame(currentPlayer, winnerData);
      
      setGameHistory([{
        winner: currentPlayer.name,
        date: new Date().toLocaleString(),
        average: finalAverage.toFixed(1),
        darts: newDartsThrown
      }, ...gameHistory]);
      
      alert(`🎯 ${currentPlayer.name} WINT!\nGemiddelde: ${finalAverage.toFixed(1)}\nDarts: ${newDartsThrown}\n\nGame opgeslagen in leaderboard!`);
      resetGame();
      return;
    }

    // Update player score
    const updatedPlayers = [...players];
    const newDartsThrown = currentPlayer.dartsThrown + 3;
    const totalScore = currentPlayer.throws.reduce((a, b) => a + b, 0) + score;
    const newAverage = (totalScore / newDartsThrown) * 3;

    updatedPlayers[currentPlayerIndex] = {
      ...currentPlayer,
      score: newScore,
      throws: [...currentPlayer.throws, score],
      average: newAverage,
      dartsThrown: newDartsThrown
    };

    setPlayers(updatedPlayers);
    setCurrentScore('');
    setCurrentPlayerIndex((currentPlayerIndex + 1) % players.length);
  };

  const removePlayer = (id) => {
    setPlayers(players.filter(p => p.id !== id));
  };

  const getCheckoutSuggestion = (score) => {
    if (score <= 170 && checkoutSuggestions[score]) {
      return checkoutSuggestions[score].join(' → ');
    }
    return null;
  };

  const quickScoreButtons = [26, 41, 45, 60, 81, 85, 100, 140, 180];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2 flex items-center space-x-3">
            <Target className="w-8 h-8 text-red-400" />
            <span>Cave Darts</span>
          </h1>
          <p className="text-white/70">Klassieke 501 Darts</p>
        </div>
        {gameStarted && (
          <button
            onClick={resetGame}
            className="flex items-center space-x-2 px-4 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-300 rounded-lg transition-colors"
          >
            <RotateCcw className="w-4 h-4" />
            <span>Reset Game</span>
          </button>
        )}
      </div>

      {!gameStarted ? (
        <>
          {/* Add Players Section */}
          <div className="gradient-card rounded-xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-white text-xl font-semibold flex items-center space-x-2">
                <User className="w-6 h-6 text-blue-300" />
                <span>Spelers ({players.length})</span>
              </h2>
              <button
                onClick={() => setShowAddPlayer(true)}
                className="btn-primary px-4 py-2 rounded-lg text-white flex items-center space-x-2"
              >
                <Plus className="w-4 h-4" />
                <span>Speler Toevoegen</span>
              </button>
            </div>

            {players.length === 0 ? (
              <div className="text-center py-12 text-white/50">
                <User className="w-16 h-16 mx-auto mb-4 text-white/30" />
                <p className="text-lg">Geen spelers toegevoegd</p>
                <p className="text-sm">Voeg minimaal 2 spelers toe om te starten</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {players.map((player) => (
                  <div key={player.id} className="bg-white/5 rounded-lg p-4 flex items-center justify-between group">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 rounded-full bg-gradient-blue-purple flex items-center justify-center">
                        <span className="text-white font-bold">{player.name.charAt(0).toUpperCase()}</span>
                      </div>
                      <span className="text-white font-medium">{player.name}</span>
                    </div>
                    <button
                      onClick={() => removePlayer(player.id)}
                      className="opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-300 transition-opacity"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {players.length >= 2 && (
              <button
                onClick={startGame}
                className="w-full mt-6 btn-primary px-6 py-4 rounded-lg text-white text-lg font-semibold flex items-center justify-center space-x-2"
              >
                <Trophy className="w-6 h-6" />
                <span>Start Game</span>
              </button>
            )}
          </div>

          {/* Game History */}
          {gameHistory.length > 0 && (
            <div className="gradient-card rounded-xl p-6">
              <h2 className="text-white text-xl font-semibold mb-4 flex items-center space-x-2">
                <Award className="w-6 h-6 text-yellow-400" />
                <span>Game History</span>
              </h2>
              <div className="space-y-2">
                {gameHistory.slice(0, 5).map((game, index) => (
                  <div key={index} className="bg-white/5 rounded-lg p-3 flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <Trophy className="w-5 h-5 text-yellow-400" />
                      <span className="text-white font-medium">{game.winner}</span>
                    </div>
                    <span className="text-white/50 text-sm">{game.date}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      ) : (
        <>
          {/* Game Board */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Players Scoreboard */}
            <div className="gradient-card rounded-xl p-6">
              <h2 className="text-white text-xl font-semibold mb-4">Scoreboard</h2>
              <div className="space-y-3">
                {players.map((player, index) => (
                  <div
                    key={player.id}
                    className={`rounded-lg p-4 transition-all ${
                      index === currentPlayerIndex
                        ? 'bg-gradient-blue-purple scale-105'
                        : 'bg-white/5'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center space-x-3">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                          index === currentPlayerIndex ? 'bg-white/20' : 'bg-white/10'
                        }`}>
                          <span className="text-white font-bold">{player.name.charAt(0).toUpperCase()}</span>
                        </div>
                        <span className="text-white font-semibold">{player.name}</span>
                      </div>
                      <div className="text-right">
                        <div className="text-3xl font-bold text-white">{player.score}</div>
                        {player.average > 0 && (
                          <div className="text-xs text-white/60">Avg: {player.average.toFixed(1)}</div>
                        )}
                      </div>
                    </div>
                    
                    {/* Checkout Suggestion */}
                    {player.score <= 170 && player.score > 1 && getCheckoutSuggestion(player.score) && (
                      <div className="mt-2 pt-2 border-t border-white/10">
                        <div className="text-xs text-white/50 mb-1">Checkout:</div>
                        <div className="text-sm text-green-400 font-mono">
                          {getCheckoutSuggestion(player.score)}
                        </div>
                      </div>
                    )}

                    {/* Last throws */}
                    {player.throws.length > 0 && (
                      <div className="mt-2 pt-2 border-t border-white/10">
                        <div className="text-xs text-white/50 mb-1">Laatste worpen:</div>
                        <div className="flex flex-wrap gap-1">
                          {player.throws.slice(-5).map((throwScore, i) => (
                            <span key={i} className="text-xs bg-white/10 px-2 py-1 rounded">
                              {throwScore}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Score Input */}
            <div className="gradient-card rounded-xl p-6">
              <h2 className="text-white text-xl font-semibold mb-4">
                Aan de beurt: <span className="text-blue-400">{players[currentPlayerIndex]?.name}</span>
              </h2>

              <div className="space-y-4">
                <div>
                  <label className="block text-white/70 text-sm mb-2">Score (0-180)</label>
                  <input
                    type="number"
                    value={currentScore}
                    onChange={(e) => setCurrentScore(e.target.value)}
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') submitScore();
                    }}
                    placeholder="Voer score in..."
                    className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white text-2xl text-center placeholder-white/40 focus:outline-none focus:border-blue-400"
                    min="0"
                    max="180"
                    autoFocus
                  />
                </div>

                <button
                  onClick={submitScore}
                  disabled={!currentScore}
                  className="w-full btn-primary px-6 py-4 rounded-lg text-white text-lg font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Bevestig Score
                </button>

                {/* Quick Score Buttons */}
                <div>
                  <div className="text-white/50 text-sm mb-2">Snelle scores:</div>
                  <div className="grid grid-cols-3 gap-2">
                    {quickScoreButtons.map((score) => (
                      <button
                        key={score}
                        onClick={() => setCurrentScore(score.toString())}
                        className="px-4 py-3 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-colors font-semibold"
                      >
                        {score}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Current Player Stats */}
                <div className="mt-6 pt-6 border-t border-white/20">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-white/5 rounded-lg p-3">
                      <div className="text-white/50 text-xs mb-1">Resterende</div>
                      <div className="text-white text-2xl font-bold">
                        {players[currentPlayerIndex]?.score}
                      </div>
                    </div>
                    <div className="bg-white/5 rounded-lg p-3">
                      <div className="text-white/50 text-xs mb-1">Gemiddelde</div>
                      <div className="text-white text-2xl font-bold">
                        {players[currentPlayerIndex]?.average.toFixed(1) || '0.0'}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Leaderboard */}
      {savedGames.length > 0 && (
        <div className="gradient-card rounded-xl p-6 mt-8">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-white text-2xl font-bold flex items-center space-x-3">
              <Trophy className="w-7 h-7 text-yellow-400" />
              <span>Leaderboard</span>
            </h2>
            <div className="text-white/50 text-sm">
              {savedGames.length} {savedGames.length === 1 ? 'game' : 'games'} gespeeld
            </div>
          </div>

          <div className="space-y-4">
            {savedGames.map((game, index) => (
              <div key={game.id} className="bg-white/5 rounded-lg p-4 hover:bg-white/10 transition-colors">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center space-x-3">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                      index === 0 ? 'bg-yellow-500' : 
                      index === 1 ? 'bg-gray-400' : 
                      index === 2 ? 'bg-orange-600' : 
                      'bg-white/10'
                    }`}>
                      {index < 3 ? (
                        <Trophy className="w-5 h-5 text-white" />
                      ) : (
                        <span className="text-white font-bold">#{index + 1}</span>
                      )}
                    </div>
                    <div>
                      <div className="text-white font-bold text-lg">{game.winner}</div>
                      <div className="text-white/50 text-xs">
                        {new Date(game.date).toLocaleDateString('nl-NL', { 
                          day: 'numeric', 
                          month: 'short', 
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-green-400 font-bold text-lg">
                      {game.winnerAverage.toFixed(1)}
                    </div>
                    <div className="text-white/50 text-xs">gemiddelde</div>
                  </div>
                </div>

                {/* Player Stats */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-3 pt-3 border-t border-white/10">
                  {game.players.map((player, pIndex) => (
                    <div 
                      key={pIndex} 
                      className={`bg-white/5 rounded-lg p-2 ${
                        player.isWinner ? 'ring-2 ring-green-400/50' : ''
                      }`}
                    >
                      <div className="flex items-center space-x-2 mb-1">
                        {player.isWinner && <Trophy className="w-3 h-3 text-yellow-400" />}
                        <span className="text-white text-sm font-medium truncate">
                          {player.name}
                        </span>
                      </div>
                      <div className="text-white/60 text-xs space-y-0.5">
                        <div>Avg: {player.average.toFixed(1)}</div>
                        <div>Darts: {player.dartsThrown}</div>
                        {!player.isWinner && player.finalScore > 0 && (
                          <div className="text-red-400">Rest: {player.finalScore}</div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Delete Game Button */}
                <button
                  onClick={() => {
                    if (window.confirm('Weet je zeker dat je deze game wilt verwijderen?')) {
                      setSavedGames(savedGames.filter(g => g.id !== game.id));
                    }
                  }}
                  className="mt-3 text-red-400 hover:text-red-300 text-xs flex items-center space-x-1"
                >
                  <X className="w-3 h-3" />
                  <span>Verwijder game</span>
                </button>
              </div>
            ))}
          </div>

          {/* Clear All Button */}
          {savedGames.length > 0 && (
            <button
              onClick={() => {
                if (window.confirm(`Weet je zeker dat je alle ${savedGames.length} games wilt verwijderen?`)) {
                  setSavedGames([]);
                }
              }}
              className="mt-6 w-full px-4 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-300 rounded-lg transition-colors text-sm"
            >
              Wis Alle Games
            </button>
          )}
        </div>
      )}

      {/* Add Player Modal */}
      {showAddPlayer && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="gradient-card rounded-xl p-6 w-full max-w-md">
            <h3 className="text-white text-xl font-semibold mb-4">Speler Toevoegen</h3>
            <input
              type="text"
              value={newPlayerName}
              onChange={(e) => setNewPlayerName(e.target.value)}
              onKeyPress={(e) => {
                if (e.key === 'Enter') addPlayer();
              }}
              placeholder="Naam..."
              className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/40 focus:outline-none focus:border-blue-400 mb-4"
              autoFocus
            />
            <div className="flex space-x-3">
              <button
                onClick={() => {
                  setShowAddPlayer(false);
                  setNewPlayerName('');
                }}
                className="flex-1 px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg text-white transition-colors"
              >
                Annuleren
              </button>
              <button
                onClick={addPlayer}
                disabled={!newPlayerName.trim()}
                className="flex-1 btn-primary px-4 py-2 rounded-lg text-white disabled:opacity-50"
              >
                Toevoegen
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CaveDartsPage;
