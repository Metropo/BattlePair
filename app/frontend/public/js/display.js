document.addEventListener('DOMContentLoaded', () => {
  // Lädt globale Teilnehmer (Tische und Laufkundschaft) inklusive Spieleranzahl und angepasster Anzeige
    function loadGlobalParticipants() {
      return Promise.all([
        fetch('/api/tables').then(res => res.json()),
        fetch('/api/walkins').then(res => res.json())
      ]).then(([tables, walkins]) => {
      const tableParticipants = tables.map(t => ({
            type: 'table',
            id: t.id,
            name: t.name,
        // Wenn ein optionaler Name (temp_name) vorhanden ist, wird dieser als Haupttext genutzt und der Originalname als Subtext.
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
  
  // Lädt alle Spielmodi
  function loadGameModes() {
    return fetch('/api/gamemodes')
      .then(res => res.json())
      .catch(err => {
        console.error('Fehler beim Laden der Spielmodi:', err);
        return [];
      });
  }

  // Lädt alle noch nicht gestarteten Matches und stellt diese ansprechend dar.
    function loadMatches() {
      fetch('/api/matches')
        .then(response => response.json())
        .then(matches => {
          // Zeige nur Matches, die noch nicht gestartet wurden
          const pendingMatches = matches.filter(match => match.is_started == 0);
          const container = document.getElementById('matches-container');
          container.innerHTML = '';
  
          if (pendingMatches.length === 0) {
            container.innerHTML = '<p style="font-size:1.5rem; text-align:center;">Derzeit sind keine Matches verfügbar.</p>';
            return;
          }
  
        // Lade Teilnehmer- und Spielmodus-Daten
        Promise.all([loadGlobalParticipants(), loadGameModes()]).then(([globalParticipants, gameModes]) => {
            pendingMatches.forEach(match => {
              const matchCard = document.createElement('div');
              matchCard.classList.add('match-card');
  
            // Wenn ein Spielmodus hinterlegt ist, wird dieser angezeigt.
            if (match.game_mode_id) {
              const gameMode = gameModes.find(gm => gm.id == match.game_mode_id);
              if (gameMode) {
                const gamemodeContainer = document.createElement('div');
                gamemodeContainer.classList.add('match-gamemode');
                // Wenn ein Icon vorhanden ist, anzeigen
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

            // Container für die Teilnehmer-Boxen
              const participantsContainer = document.createElement('div');
              participantsContainer.classList.add('match-participants');
  
              // Erstelle Teilnehmer-Boxen für jeden zugeordneten Teilnehmer
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
  
              // Berechne die Gesamtpersonenanzahl des Matches:
              let totalPersons = 0;
              match.participants.forEach(p => {
                const participant = globalParticipants.find(tp => tp.type === p.type && tp.id == p.id);
                if (participant) {
                  totalPersons += participant.player_count;
                }
              });
              const infoContainer = document.createElement('div');
              infoContainer.classList.add('match-info');
              infoContainer.textContent = `${totalPersons} Spieler`;
            matchCard.appendChild(infoContainer);
  
              container.appendChild(matchCard);
            });
          });
        })
        .catch(err => console.error('Fehler beim Laden der Matches:', err));
    }
  
    // Initial Matches laden und alle 10 Sekunden aktualisieren
    loadMatches();
    setInterval(loadMatches, 10000);
  });
  