document.addEventListener('DOMContentLoaded', () => {
  // ---------------------------
  // Tische-Verwaltung (Hauptbereich)
  // ---------------------------
  function loadTables() {
    fetch('/api/tables')
      .then(res => res.json())
      .then(tables => {
        const tablesContainer = document.getElementById('tables-container');
        tablesContainer.innerHTML = '';
        tables.forEach(table => {
          const card = document.createElement('div');
          card.classList.add('table-card');
          card.dataset.tableId = table.id;
          card.innerHTML = `
            <h3>${table.name}</h3>
            <label>Temporärer Name:</label>
            <input type="text" class="temp-name" value="${table.temp_name || ''}" placeholder="Temporärer Name">
            <label>Spieleranzahl:</label>
            <input type="number" class="player-count" value="${table.player_count || 0}" placeholder="Anzahl Spieler">
            <button class="update-table-btn">Aktualisieren</button>
          `;
          tablesContainer.appendChild(card);
        });
        document.querySelectorAll('.update-table-btn').forEach(button => {
          button.addEventListener('click', (e) => {
            const card = e.target.closest('.table-card');
            const id = card.dataset.tableId;
            const name = card.querySelector('h3').textContent;
            const tempName = card.querySelector('.temp-name').value;
            const playerCount = card.querySelector('.player-count').value;
            updateTable(id, name, tempName, playerCount);
          });
        });
      })
      .catch(err => console.error('Fehler beim Laden der Tische:', err));
  }

  function updateTable(id, name, temp_name, player_count) {
    fetch('/api/tables', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, name, temp_name, player_count })
    })
      .then(res => res.json())
      .then(result => {
        console.log('Tisch aktualisiert:', result);
        loadTables();
        loadSettingsTables(); // Aktualisiere auch die Tabelle im Settings-Modal
      })
      .catch(err => console.error('Fehler beim Aktualisieren des Tisches:', err));
  }

  loadTables(); // Haupt-Tische laden

  // ---------------------------
  // Laufkundschaft-Verwaltung
  // ---------------------------
  function loadWalkins() {
    fetch('/api/walkins')
      .then(res => res.json())
      .then(walkins => {
        const walkinList = document.getElementById('walkin-list');
        walkinList.innerHTML = '';
        walkins.forEach(walkin => {
          const li = document.createElement('li');
          li.dataset.id = walkin.id;
          li.textContent = walkin.name;
          const deleteBtn = document.createElement('button');
          deleteBtn.textContent = 'Löschen';
          deleteBtn.style.marginLeft = '10px';
          deleteBtn.addEventListener('click', () => deleteWalkin(walkin.id));
          li.appendChild(deleteBtn);
          walkinList.appendChild(li);
        });
      })
      .catch(err => console.error('Fehler beim Laden der Laufkundschaft:', err));
  }

  function addWalkin(name) {
    fetch('/api/walkins', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name })
    })
      .then(res => res.json())
      .then(() => loadWalkins())
      .catch(err => console.error('Fehler beim Hinzufügen der Laufkundschaft:', err));
  }

  function deleteWalkin(id) {
    fetch('/api/walkins', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id })
    })
      .then(res => res.json())
      .then(() => loadWalkins())
      .catch(err => console.error('Fehler beim Löschen der Laufkundschaft:', err));
  }

  const walkinInput = document.getElementById('walkin-input');
  const addWalkinBtn = document.getElementById('add-walkin-btn');
  addWalkinBtn.addEventListener('click', () => {
    const playerName = walkinInput.value.trim();
    if (playerName) {
      addWalkin(playerName);
      walkinInput.value = '';
    }
  });

  loadWalkins(); // Laufkundschaft laden

  // ---------------------------
  // Globale Teilnehmer (Tische + Laufkundschaft) für Matches
  // ---------------------------
  function loadGlobalParticipants() {
    return Promise.all([
      fetch('/api/tables').then(res => res.json()),
      fetch('/api/walkins').then(res => res.json())
    ]).then(([tables, walkins]) => {
      const tableParticipants = tables.map(t => ({
        type: 'table',
        id: t.id,
        name: t.name,
        display: t.name + (t.temp_name ? ` (${t.temp_name})` : ''),
        player_count: parseInt(t.player_count) || 0
      }));
      const walkinParticipants = walkins.map(w => ({
        type: 'walkin',
        id: w.id,
        name: w.name,
        display: w.name,
        player_count: 1
      }));
      return [...tableParticipants, ...walkinParticipants];
    });
  }

  // ---------------------------
  // Match-Verwaltung
  // ---------------------------
  function loadMatches() {
    fetch('/api/matches')
      .then(res => res.json())
      .then(matches => {
        loadGlobalParticipants().then(globalParticipants => {
          // Nur noch nicht gestartete Matches anzeigen
          const pendingMatches = matches.filter(m => m.is_started == 0);
          const matchesContainer = document.getElementById('matches-container');
          matchesContainer.innerHTML = '';
          pendingMatches.forEach(match => {
            const matchRow = document.createElement('div');
            matchRow.classList.add('match-row');
            matchRow.dataset.matchId = match.id;

            // Container mit Rahmen für die Teilnehmer
            const participantsContainer = document.createElement('div');
            participantsContainer.classList.add('match-participants');
            globalParticipants.forEach(participant => {
              const partElem = document.createElement('span');
              partElem.classList.add('participant');
              partElem.textContent = participant.display;
              // Falls Teilnehmer bereits im Match ist, farblich markieren
              if (match.participants.some(p => p.type === participant.type && p.id == participant.id)) {
                partElem.classList.add('selected');
              }
              // Klick-Event: Toggle Teilnehmer im Match
              partElem.addEventListener('click', () => {
                let newParticipants = match.participants.slice();
                const idx = newParticipants.findIndex(p => p.type === participant.type && p.id == participant.id);
                if (idx > -1) {
                  newParticipants.splice(idx, 1);
                } else {
                  newParticipants.push({
                    type: participant.type,
                    id: participant.id,
                    name: participant.name
                  });
                }
                updateMatch(match.id, newParticipants);
              });
              participantsContainer.appendChild(partElem);
            });

            // Berechne Gesamtpersonenanzahl basierend auf Teilnehmern:
            let totalPersons = 0;
            match.participants.forEach(p => {
              if (p.type === 'table') {
                const tbl = globalParticipants.find(tp => tp.type === 'table' && tp.id == p.id);
                totalPersons += tbl ? tbl.player_count : 0;
              } else if (p.type === 'walkin') {
                totalPersons += 1;
              }
            });
            const infoContainer = document.createElement('div');
            infoContainer.classList.add('match-info');
            infoContainer.textContent = `Personen: ${totalPersons}`;

            // Löschen-Button für das Match
            const deleteBtn = document.createElement('button');
            deleteBtn.textContent = 'Löschen';
            deleteBtn.addEventListener('click', () => deleteMatch(match.id));

            matchRow.appendChild(participantsContainer);
            matchRow.appendChild(infoContainer);
            matchRow.appendChild(deleteBtn);
            matchesContainer.appendChild(matchRow);
          });
        });
      })
      .catch(err => console.error('Fehler beim Laden der Matches:', err));
  }

  function createEmptyMatch() {
    fetch('/api/matches', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ participants: [] })
    })
      .then(res => res.json())
      .then(result => {
        console.log('Leeres Match angelegt:', result);
        loadMatches();
      })
      .catch(err => console.error('Fehler beim Anlegen des Matches:', err));
  }

  function updateMatch(matchId, participants) {
    fetch('/api/matches/update', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: matchId, participants })
    })
      .then(res => res.json())
      .then(result => {
        console.log('Match aktualisiert:', result);
        loadMatches();
      })
      .catch(err => console.error('Fehler beim Aktualisieren des Matches:', err));
  }

  function startMatch(matchId) {
    fetch('/api/matches/start', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: matchId })
    })
      .then(res => res.json())
      .then(result => {
        console.log('Match gestartet:', result);
        loadMatches();
      })
      .catch(err => console.error('Fehler beim Starten des Matches:', err));
  }

  function deleteMatch(matchId) {
    fetch('/api/matches', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: matchId })
    })
      .then(res => res.json())
      .then(result => {
        console.log('Match gelöscht:', result);
        loadMatches();
      })
      .catch(err => console.error('Fehler beim Löschen des Matches:', err));
  }

  function startFirstMatch() {
    fetch('/api/matches')
      .then(res => res.json())
      .then(matches => {
        const pendingMatches = matches.filter(m => m.is_started == 0);
        if (pendingMatches.length === 0) {
          alert('Kein Match zum Starten vorhanden.');
          return;
        }
        const firstMatch = pendingMatches[0];
        startMatch(firstMatch.id);
      })
      .catch(err => console.error(err));
  }

  const globalStartMatchBtn = document.getElementById('global-start-match-btn');
  globalStartMatchBtn.addEventListener('click', startFirstMatch);

  const newMatchBtn = document.getElementById('new-match-btn');
  newMatchBtn.addEventListener('click', createEmptyMatch);

  loadMatches(); // Matches laden

  // ---------------------------
  // Einstellungen Modal inkl. Tischverwaltung
  // ---------------------------
  const settingsModal = document.getElementById('settings-modal');
  const openSettingsBtn = document.getElementById('open-settings');
  const closeSettingsBtn = document.getElementById('close-settings');
  const settingsForm = document.getElementById('settings-form');

  openSettingsBtn.addEventListener('click', () => {
    settingsModal.classList.remove('hidden');
    loadSettingsTables();
  });

  closeSettingsBtn.addEventListener('click', () => {
    settingsModal.classList.add('hidden');
  });

  settingsModal.addEventListener('click', (e) => {
    if (e.target === settingsModal) {
      settingsModal.classList.add('hidden');
    }
  });

  settingsForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const formData = new FormData(settingsForm);
    const settings = Object.fromEntries(formData.entries());
    console.log('Einstellungen gespeichert:', settings);
    settingsModal.classList.add('hidden');
  });

  // Laden der Tischliste für das Settings-Modal
  function loadSettingsTables() {
    fetch('/api/tables')
      .then(res => res.json())
      .then(tables => {
        const settingsTablesList = document.getElementById('settings-tables-list');
        settingsTablesList.innerHTML = '';
        tables.forEach(table => {
          const li = document.createElement('li');
          li.dataset.id = table.id;
          li.textContent = table.name;
          const deleteBtn = document.createElement('button');
          deleteBtn.textContent = 'Löschen';
          deleteBtn.style.marginLeft = '10px';
          deleteBtn.addEventListener('click', () => {
            deleteTableFromSettings(table.id);
          });
          li.appendChild(deleteBtn);
          settingsTablesList.appendChild(li);
        });
      })
      .catch(err => console.error('Fehler beim Laden der Tische im Settings-Modal:', err));
  }

  // Tisch hinzufügen über das Settings-Modal
  const addTableSettingsBtn = document.getElementById('add-table-settings-btn');
  addTableSettingsBtn.addEventListener('click', () => {
    const newTableNameInput = document.getElementById('new-table-name-settings');
    const name = newTableNameInput.value.trim();
    if (!name) return;
    fetch('/api/tables', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name })
    })
      .then(res => res.json())
      .then(result => {
        console.log('Tisch hinzugefügt:', result);
        newTableNameInput.value = '';
        loadSettingsTables();
        loadTables(); // Aktualisiere auch den Hauptbereich
      })
      .catch(err => console.error('Fehler beim Hinzufügen des Tisches:', err));
  });

  // Tisch löschen über das Settings-Modal
  function deleteTableFromSettings(id) {
    fetch('/api/tables', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id })
    })
      .then(res => res.json())
      .then(result => {
        console.log('Tisch gelöscht:', result);
        loadSettingsTables();
        loadTables(); // Aktualisiere auch den Hauptbereich
      })
      .catch(err => console.error('Fehler beim Löschen des Tisches:', err));
  }
});
