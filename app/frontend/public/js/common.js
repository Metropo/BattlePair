// Common functions used by both admin and display screens

// Load global participants (tables + walkins)
async function loadGlobalParticipants() {
  return Promise.all([
    fetch('/api/tables').then(res => res.json()),
    fetch('/api/walkins').then(res => res.json())
  ]).then(([tables, walkins]) => {
    const tableParticipants = tables.map(t => ({
      type: 'table',
      id: t.id,
      name: t.name,
      display: t.name + (t.temp_name ? ` (${t.temp_name})` : ''),
      displayMain: t.temp_name ? t.temp_name : t.name,
      displaySub: t.temp_name ? t.name : '',
      player_count: parseInt(t.player_count) || 0
    }));
    const walkinParticipants = walkins.map(w => ({
      type: 'walkin',
      id: w.id,
      name: w.name,
      display: w.name,
      displayMain: w.name,
      displaySub: '',
      player_count: 1
    }));
    return [...tableParticipants, ...walkinParticipants];
  });
}

// Load game modes
async function loadGameModes() {
  return fetch('/api/gamemodes')
    .then(res => res.json())
    .catch(err => {
      console.error('Fehler beim Laden der Spielmodi:', err);
      return [];
    });
}

// Format date to German locale
function formatDate(date) {
  return new Date(date).toLocaleString('de-DE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

// Calculate total players in a match
function calculateTotalPlayers(match, globalParticipants) {
  return match.participants.reduce((sum, p) => {
    const participant = globalParticipants.find(tp => tp.type === p.type && tp.id == p.id);
    return sum + (participant ? participant.player_count : 0);
  }, 0);
}

// Create participant list string
function createParticipantList(match, globalParticipants) {
  return match.participants.map(p => {
    const participant = globalParticipants.find(tp => tp.type === p.type && tp.id == p.id);
    return participant ? participant.display : p.name;
  }).join(', ');
}

// Get game mode name
function getGameModeName(match, gameModes) {
  const gameMode = gameModes.find(gm => gm.id === match.game_mode_id);
  return gameMode ? gameMode.name : 'Kein Spielmodus';
}

// Calculate estimated start time for a match
function calculateEstimatedStartTime(match, allMatches, settings, lastMatchStartTime) {
  if (!lastMatchStartTime) {
    return null; // No matches have been started yet
  }

  // Find all matches that should start before this one
  const matchesBefore = allMatches
    .filter(m => m.id < match.id)
    .sort((a, b) => a.id - b.id);

  const matchLengthPlusBreakMs = (settings.match_length_minutes + settings.break_length_minutes) * 60000;
  const totalTimeBeforeMs = matchesBefore.length * matchLengthPlusBreakMs;

  // Calculate minimum start time based on current time
  const now = new Date();
  const minimumStartTime = new Date(now.getTime() + totalTimeBeforeMs);

  // Calculate estimated start time based on last match
  // Convert the last match start time to local time
  const lastStartTime = new Date(lastMatchStartTime); // Add 'Z' to indicate UTC
  const estimatedStartTime = new Date(lastStartTime.getTime() + matchLengthPlusBreakMs /* the match that is currently being played */ + totalTimeBeforeMs);

  // Return the later of the two times
  return estimatedStartTime > minimumStartTime ? estimatedStartTime : minimumStartTime;
}

// Format time remaining until a date
function formatTimeRemaining(targetDate) {
  if (!targetDate) return null;
  
  const now = new Date();
  const diffMs = targetDate - now;
  
  if (diffMs <= 0) return "Match startet in Kürze"; // Show message for negative times
  
  const diffMinutes = Math.ceil(diffMs / 60000);
  const hours = Math.floor(diffMinutes / 60);
  const minutes = diffMinutes % 60;
  
  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  } else {
    return `${minutes}m`;
  }
}

// Export functions
window.common = {
  loadGlobalParticipants,
  loadGameModes,
  formatDate,
  calculateTotalPlayers,
  createParticipantList,
  getGameModeName,
  calculateEstimatedStartTime,
  formatTimeRemaining
}; 