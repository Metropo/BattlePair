document.addEventListener('DOMContentLoaded', () => {
  // Store the last known state
  let lastState = {
    matches: [],
    participants: [],
    gameModes: []
  };

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

  // Helper function to update a single match card
  function updateMatchCard(match, globalParticipants, gameModes, allMatches) {
    const matchKey = getMatchKey(match);
    const existingCard = document.querySelector(`[data-match-id="${match.id}"]`);
    
    if (existingCard) {
      // Check if the match has actually changed
      const oldMatch = lastState.matches.find(m => m.id === match.id);
      if (!hasMatchChanged(oldMatch, match)) {
        return; // No changes needed
      }
      existingCard.remove();
    }

    const matchCard = document.createElement('div');
    matchCard.classList.add('match-card');
    matchCard.setAttribute('data-match-id', match.id);
    matchCard.style.opacity = '0';
    matchCard.style.transition = 'opacity 0.3s ease-in-out';

    // Add next-match class if this is the next match
    if (isNextMatch(match, allMatches)) {
      matchCard.classList.add('next-match');
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
        matchCard.appendChild(gamemodeContainer);
      }
    }

    // Participants section
    const participantsContainer = document.createElement('div');
    participantsContainer.classList.add('match-participants');

    match.participants.forEach(p => {
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

    matchCard.appendChild(participantsContainer);

    // Player count section
    let totalPersons = match.participants.reduce((sum, p) => {
      const participant = globalParticipants.find(tp => tp.type === p.type && tp.id == p.id);
      return sum + (participant ? participant.player_count : 0);
    }, 0);

    const infoContainer = document.createElement('div');
    infoContainer.classList.add('match-info');
    infoContainer.textContent = `${totalPersons} Spieler`;
    matchCard.appendChild(infoContainer);

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
  function loadMatches() {
    fetch('/api/matches')
      .then(response => response.json())
      .then(matches => {
        const pendingMatches = matches.filter(match => match.is_started == 0);
        const container = document.getElementById('matches-container');

        if (pendingMatches.length === 0) {
          if (container.children.length === 0 || 
              (container.children.length === 1 && container.children[0].tagName === 'P')) {
            container.innerHTML = '<p style="font-size:1.5rem; text-align:center;">Derzeit sind keine Matches verfügbar.</p>';
          }
          return;
        }

        // Load participants and game modes
        Promise.all([loadGlobalParticipants(), loadGameModes()])
          .then(([globalParticipants, gameModes]) => {
            // Remove matches that no longer exist
            const existingMatchIds = new Set(pendingMatches.map(m => m.id));
            document.querySelectorAll('.match-card').forEach(card => {
              const matchId = parseInt(card.getAttribute('data-match-id'));
              if (!existingMatchIds.has(matchId)) {
                card.style.opacity = '0';
                setTimeout(() => card.remove(), 300);
              }
            });

            // Update or add matches
            pendingMatches.forEach(match => {
              updateMatchCard(match, globalParticipants, gameModes, pendingMatches);
            });

            // Update last state
            lastState = {
              matches: pendingMatches,
              participants: globalParticipants,
              gameModes: gameModes
            };
          });
      })
      .catch(err => console.error('Fehler beim Laden der Matches:', err));
  }

  // Initial load and periodic updates
  loadMatches();
  setInterval(loadMatches, 10000);
});
  