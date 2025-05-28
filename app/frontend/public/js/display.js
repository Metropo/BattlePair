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
  async function buildMatchCardContent(card, match, globalParticipants, gameModes, allMatches, estimatedStartTime) {
    // Clear existing content
    card.innerHTML = '';
    
    // Add match ID as hidden element
    const matchIdElement = document.createElement('div');
    matchIdElement.classList.add('match-id');
    matchIdElement.textContent = `Match #${match.id}`;
    matchIdElement.style.display = 'none'; // Hidden by default
    card.appendChild(matchIdElement);
    
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

    // Info container for time and player count
    const infoContainer = document.createElement('div');
    infoContainer.classList.add('match-info-container');

    // Time remaining section
    if (estimatedStartTime) {
      const timeRemaining = common.formatTimeRemaining(estimatedStartTime);
      if (timeRemaining) {
        const timeContainer = document.createElement('div');
        timeContainer.classList.add('match-time');
        timeContainer.textContent = timeRemaining === "Match startet in Kürze" 
          ? timeRemaining 
          : `Start in ca. ${timeRemaining}`;
        infoContainer.appendChild(timeContainer);
      }
    }

    // Player count section
    const totalPlayers = common.calculateTotalPlayers(match, globalParticipants);
    const playerCountContainer = document.createElement('div');
    playerCountContainer.classList.add('match-player-count');
    let playerCountText = `${totalPlayers} Spieler`;
    if (lastState.settings.max_players_per_round > 0) {
      const availableSpots = lastState.settings.max_players_per_round - totalPlayers;
      playerCountText += ` (noch ${availableSpots} Plätze frei)`;
    }
    playerCountContainer.textContent = playerCountText;
    infoContainer.appendChild(playerCountContainer);

    card.appendChild(infoContainer);
  }

  // Helper function to update a single match card
  async function updateMatchCard(match, globalParticipants, gameModes, allMatches, lastMatchStartTime) {
    const matchKey = getMatchKey(match);
    const existingCard = document.querySelector(`[data-match-id="${match.id}"]`);
    
    if (existingCard) {
      // Check if the match has actually changed
      const oldMatch = lastState.matches.find(m => m.id === match.id);
      const hasChanged = hasMatchChanged(oldMatch, match);
      
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

      // Always update the time, even if nothing else changed
      const estimatedStartTime = common.calculateEstimatedStartTime(match, allMatches, lastState.settings, lastMatchStartTime);
      const timeContainer = existingCard.querySelector('.match-time');
      if (timeContainer) {
        const timeRemaining = common.formatTimeRemaining(estimatedStartTime);
        if (timeRemaining) {
          timeContainer.textContent = timeRemaining === "Match startet in Kürze" 
            ? timeRemaining 
            : `Start in ca. ${timeRemaining}`;
        }
      }

      // Only rebuild the entire card if the match data has changed
      if (hasChanged) {
        existingCard.style.opacity = '0';
        await buildMatchCardContent(existingCard, match, globalParticipants, gameModes, allMatches, estimatedStartTime);
        
        // Trigger reflow and fade in
        existingCard.offsetHeight;
        existingCard.style.opacity = '1';
      }
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
    const estimatedStartTime = common.calculateEstimatedStartTime(match, allMatches, lastState.settings, lastMatchStartTime);
    await buildMatchCardContent(matchCard, match, globalParticipants, gameModes, allMatches, estimatedStartTime);

    const container = document.getElementById('matches-container');
              container.appendChild(matchCard);

    // Trigger reflow and fade in
    matchCard.offsetHeight;
    matchCard.style.opacity = '1';
  }

  // Load and update matches
  async function loadMatches() {
    try {
      const [matchesResponse, settingsResponse, lastStartTimeResponse] = await Promise.all([
        fetch('/api/matches?is_started=0&sort=asc'),
        fetch('/api/settings'),
        fetch('/api/matches/last-start-time')
      ]);
      
      const matches = await matchesResponse.json();
      const settings = await settingsResponse.json();
      const { started_at: lastMatchStartTime } = await lastStartTimeResponse.json();
      
      lastState.settings = settings;
      const pendingMatches = matches;
      const container = document.getElementById('matches-container');

      if (pendingMatches.length === 0) {
        // Remove any existing match cards
        const existingCards = container.querySelectorAll('.match-card');
        existingCards.forEach(card => card.remove());
        // Add empty state class to show no-matches message
        container.classList.add('empty');
        return;
      }

      // Remove empty state to show match cards
      container.classList.remove('empty');

      // Load participants and game modes
      const [globalParticipants, gameModes] = await Promise.all([
        common.loadGlobalParticipants(),
        common.loadGameModes()
      ]);

      // Update or create match cards
      pendingMatches.forEach(match => {
        updateMatchCard(match, globalParticipants, gameModes, pendingMatches, lastMatchStartTime);
      });

      // Update last state
      lastState.matches = pendingMatches;
      lastState.participants = globalParticipants;
      lastState.gameModes = gameModes;

      // Remove any cards that no longer exist
      const existingCards = document.querySelectorAll('.match-card');
      existingCards.forEach(card => {
        const matchId = parseInt(card.getAttribute('data-match-id'));
        if (!pendingMatches.some(match => match.id === matchId)) {
          card.style.opacity = '0';
          setTimeout(() => card.remove(), 300);
        }
      });
    } catch (error) {
      console.error('Error loading matches:', error);
    }
  }

  // Initial load
  loadSettings();
  loadMatches();

  // Set up polling
  setInterval(() => {
    loadMatches();
  }, 5000); // Poll every 5 seconds
  });
  