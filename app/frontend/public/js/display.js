document.addEventListener('DOMContentLoaded', () => {
  // Store the last known state
  let lastState = {
    matches: [],
    participants: [],
    gameModes: [],
    settings: {
      display_matches_count: 4, // Default value
      max_players_per_round: 0 // Default value
    }
  };

  // Load settings
  async function loadSettings() {
    try {
      const response = await fetch('/api/settings');
      const settings = await response.json();
      lastState.settings = settings;
    } catch (error) {
      console.error('Error loading settings:', error);
    }
  }

  // Helper function to create a unique key for a match
  function getMatchKey(match) {
    return `${match.id}-${match.game_mode_id}-${match.participants.map(p => `${p.type}-${p.id}`).join('-')}`;
  }

  // Helper function to check if two matches are different
  function hasMatchChanged(oldMatch, newMatch) {
    if (!oldMatch) return true;
    return JSON.stringify(oldMatch) !== JSON.stringify(newMatch);
  }

  // Helper function to determine if a match is the next one
  function isNextMatch(match, allMatches) {
    // Find the match with the lowest ID
    const lowestIdMatch = allMatches.reduce((lowest, current) => {
      return current.id < lowest.id ? current : lowest;
    });
    return match.id === lowestIdMatch.id;
  }

  // Helper function to build match card content
  function buildMatchCardContent(card, match, globalParticipants, gameModes, allMatches) {
    // Clear existing content
    card.innerHTML = '';
    
    // Add next-match class if this is the next match
    const isNextMatchFlag = isNextMatch(match, allMatches);
    if (isNextMatchFlag) {
      card.classList.add('next-match');
    } else {
      card.classList.remove('next-match');
    }

    // Game mode section
    if (match.game_mode_id) {
      const gameMode = gameModes.find(gm => gm.id == match.game_mode_id);
      if (gameMode) {
        const gamemodeContainer = document.createElement('div');
        gamemodeContainer.classList.add('match-gamemode');
        
        if (gameMode.icon) {
          const iconImg = document.createElement('img');
          iconImg.src = gameMode.icon;
          iconImg.alt = gameMode.name;
          gamemodeContainer.appendChild(iconImg);
        }

        const detailsDiv = document.createElement('div');
        detailsDiv.classList.add('gamemode-details');
        const nameDiv = document.createElement('div');
        nameDiv.classList.add('gamemode-name');
        nameDiv.textContent = gameMode.name;
        detailsDiv.appendChild(nameDiv);

        if (gameMode.description) {
          const descDiv = document.createElement('div');
          descDiv.classList.add('gamemode-desc');
          descDiv.textContent = gameMode.description;
          detailsDiv.appendChild(descDiv);
        }

        gamemodeContainer.appendChild(detailsDiv);
        card.appendChild(gamemodeContainer);
      }
    }

    // Participants section
    const participantsContainer = document.createElement('div');
    participantsContainer.classList.add('match-participants');

    // Sort participants by ID
    const sortedParticipants = match.participants.sort((a, b) => {
      // First sort by type (tables before walkins)
      if (a.type !== b.type) {
        return a.type === 'table' ? -1 : 1;
      }
      // Then sort by ID within each type
      return a.id - b.id;
    });

    sortedParticipants.forEach(p => {
      const participant = globalParticipants.find(tp => tp.type === p.type && tp.id == p.id);
      if (participant) {
        const box = document.createElement('div');
        box.classList.add('participant-box');
        let html = `<div class="participant-main">${participant.displayMain}</div>`;
        if (participant.displaySub) {
          html += `<div class="participant-sub">${participant.displaySub}</div>`;
        }
        box.innerHTML = html;
        participantsContainer.appendChild(box);
      }
    });

    card.appendChild(participantsContainer);

    // Player count section
    let totalPersons = match.participants.reduce((sum, p) => {
      const participant = globalParticipants.find(tp => tp.type === p.type && tp.id == p.id);
      return sum + (participant ? participant.player_count : 0);
    }, 0);

    const infoContainer = document.createElement('div');
    infoContainer.classList.add('match-info');
    let playerCountText = `${totalPersons} Spieler`;
    if (lastState.settings.max_players_per_round > 0) {
      const availableSpots = lastState.settings.max_players_per_round - match.participants.length;
      playerCountText += ` (noch ${availableSpots} Plätze frei)`;
    }
    infoContainer.textContent = playerCountText;
    card.appendChild(infoContainer);
  }

  // Helper function to update a single match card
  function updateMatchCard(match, globalParticipants, gameModes, allMatches) {
    const matchKey = getMatchKey(match);
    const existingCard = document.querySelector(`[data-match-id="${match.id}"]`);
    
    if (existingCard) {
      // Check if the match has actually changed
      const oldMatch = lastState.matches.find(m => m.id === match.id);
      if (!hasMatchChanged(oldMatch, match)) {
        // Still need to check if this should be the next match
        const shouldBeNext = isNextMatch(match, allMatches);
        const isCurrentlyNext = existingCard.classList.contains('next-match');
        if (shouldBeNext !== isCurrentlyNext) {
          if (shouldBeNext) {
            existingCard.classList.add('next-match');
          } else {
            existingCard.classList.remove('next-match');
          }
        }
        return; // No other changes needed
      }

      // Update existing card content
      existingCard.style.opacity = '0';
      buildMatchCardContent(existingCard, match, globalParticipants, gameModes, allMatches);
      
      // Trigger reflow and fade in
      existingCard.offsetHeight;
      existingCard.style.opacity = '1';
      return;
    }

    // Create new card if it doesn't exist
    const matchCard = document.createElement('div');
    const isNextMatchFlag = isNextMatch(match, allMatches);
    matchCard.className = `match-card ${isNextMatchFlag ? 'next-match' : ''}`;
    matchCard.setAttribute('data-match-id', match.id);
    matchCard.style.opacity = '0';
    matchCard.style.transition = 'opacity 0.3s ease-in-out';

    // Build the card content
    buildMatchCardContent(matchCard, match, globalParticipants, gameModes, allMatches);

    const container = document.getElementById('matches-container');
    container.appendChild(matchCard);

    // Trigger reflow and fade in
    matchCard.offsetHeight;
    matchCard.style.opacity = '1';
  }

  // Load global participants
  function loadGlobalParticipants() {
    return Promise.all([
      fetch('/api/tables').then(res => res.json()),
      fetch('/api/walkins').then(res => res.json())
    ]).then(([tables, walkins]) => {
      const tableParticipants = tables.map(t => ({
        type: 'table',
        id: t.id,
        name: t.name,
        displayMain: t.temp_name ? t.temp_name : t.name,
        displaySub: t.temp_name ? t.name : '',
        player_count: parseInt(t.player_count) || 0
      }));
      const walkinParticipants = walkins.map(w => ({
        type: 'walkin',
        id: w.id,
        name: w.name,
        displayMain: w.name,
        displaySub: '',
        player_count: 1
      }));
      return [...tableParticipants, ...walkinParticipants];
    });
  }

  // Load game modes
  function loadGameModes() {
    return fetch('/api/gamemodes')
      .then(res => res.json())
      .catch(err => {
        console.error('Fehler beim Laden der Spielmodi:', err);
        return [];
      });
  }

  // Load and update matches
  async function loadMatches() {
    try {
      const [matchesResponse, settingsResponse] = await Promise.all([
        fetch('/api/matches'),
        fetch('/api/settings')
      ]);
      
      const matches = await matchesResponse.json();
      const settings = await settingsResponse.json();
      
      lastState.settings = settings;
      const pendingMatches = matches
        .filter(match => match.is_started == 0)
        .sort((a, b) => a.id - b.id); // Sort matches by ID in ascending order
      const container = document.getElementById('matches-container');

      if (pendingMatches.length === 0) {
        if (container.children.length === 0 || 
            (container.children.length === 1 && container.children[0].tagName === 'P')) {
          container.innerHTML = '<p style="font-size:1.5rem; text-align:center;">Derzeit sind keine Matches verfügbar.</p>';
        }
        return;
      }

      // Load participants and game modes
      const [globalParticipants, gameModes] = await Promise.all([
        loadGlobalParticipants(),
        loadGameModes()
      ]);

      // Remove matches that no longer exist
      const existingMatchIds = new Set(pendingMatches.map(m => m.id));
      document.querySelectorAll('.match-card').forEach(card => {
        const matchId = parseInt(card.getAttribute('data-match-id'));
        if (!existingMatchIds.has(matchId)) {
          card.style.opacity = '0';
          setTimeout(() => card.remove(), 300);
        }
      });

      // Update or add matches (limited by display_matches_count)
      const matchesToDisplay = pendingMatches.slice(0, settings.display_matches_count);
      matchesToDisplay.forEach(match => {
        updateMatchCard(match, globalParticipants, gameModes, matchesToDisplay);
      });

      // Update last state
      lastState = {
        matches: pendingMatches,
        participants: globalParticipants,
        gameModes: gameModes,
        settings: settings
      };
    } catch (err) {
      console.error('Fehler beim Laden der Matches:', err);
    }
  }

  // Initial load and periodic updates
  loadSettings().then(() => {
    loadMatches();
    setInterval(loadMatches, 10000);
  });
});
  