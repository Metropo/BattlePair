document.addEventListener('DOMContentLoaded', () => {
  // ---------------------------
  // Tische-Verwaltung (Hauptbereich)
  // ---------------------------
  // Track last focused input
  let lastFocusedInput = null;

  // Function to count matches for a participant
  async function countParticipantMatches(participantId, participantType) {
    try {
      const response = await fetch(`/api/matches/stats/${participantType}/${participantId}`);
      const stats = await response.json();
      return {
        playedMatches: stats.played_matches || 0,
        plannedMatches: stats.planned_matches || 0
      };
    } catch (err) {
      console.error('Fehler beim Abrufen der Match-Statistiken:', err);
      return { playedMatches: 0, plannedMatches: 0 };
    }
  }

  function loadTables() {
    const tablesContainer = document.getElementById('tables-container');
    tablesContainer.innerHTML = ''; // Clear the container before loading
    
    fetch('/api/tables')
      .then(res => res.json())
      .then(tables => {
        // Load match stats for all tables
        const tablePromises = tables.map(async table => {
          const matchCounts = await countParticipantMatches(table.id, 'table');
          return { table, matchCounts };
        });

        Promise.all(tablePromises)
          .then(tableData => {
            tableData.forEach(({ table, matchCounts }) => {
              const card = createTableCard(table, matchCounts);
              tablesContainer.appendChild(card);

              // Get input elements
              const tempTempNameInput = card.querySelector('input[id^="table-temp-name-"]');
              const playerCountInput = card.querySelector('input[id^="table-players-"]');
              const saveButton = card.querySelector('.update-table-btn');
              const resetButton = card.querySelector('.reset-table-btn');

              // Store original values
              const originalValues = {
                tempName: table.temp_name || '',
                playerCount: table.player_count || 0
              };

              // Function to check for changes
              const checkForChanges = () => {
                const hasChanges = 
                  tempTempNameInput.value !== originalValues.tempName ||
                  parseInt(playerCountInput.value) !== parseInt(originalValues.playerCount);
                
                saveButton.classList.toggle('has-changes', hasChanges);
              };

              // Track focus
              tempTempNameInput.addEventListener('focus', () => {
                lastFocusedInput = { id: table.id, type: 'temp-temp-name' };
              });
              playerCountInput.addEventListener('focus', () => {
                lastFocusedInput = { id: table.id, type: 'player-count' };
              });

              // Check for changes on input
              tempTempNameInput.addEventListener('input', checkForChanges);
              playerCountInput.addEventListener('input', checkForChanges);

              // Function to save changes
              const saveChanges = () => {
                const id = table.id;
                const tempName = tempTempNameInput.value || null;
                const playerCount = playerCountInput.value;
                updateTable(id, undefined, tempName, playerCount);
                
                // Update original values after save
                originalValues.tempName = tempName || '';
                originalValues.playerCount = playerCount;
                checkForChanges();
              };

              // Function to reset table
              const resetTable = () => {
                tempTempNameInput.value = '';
                playerCountInput.value = '0';
                saveChanges();
              };

              // Save on button click
              saveButton.addEventListener('click', saveChanges);
              
              // Reset on button click
              resetButton.addEventListener('click', resetTable);

              // Add reset counter button event listener
              const resetCounterBtn = card.querySelector('.reset-counter-btn');
              resetCounterBtn.addEventListener('click', () => {
                if (confirm('Möchten Sie den Match-Zähler für diesen Tisch zurücksetzen?')) {
                  resetMatchCounter(table.id, 'table');
                }
              });
            });
          });
      })
      .catch(err => console.error('Fehler beim Laden der Tische:', err));
  }

  function createTableCard(table, matchCounts) {
    const card = document.createElement('div');
    card.className = 'table-card';
    card.dataset.tableId = table.id;
    card.innerHTML = `
      <h3>${table.name}</h3>
      <label for="table-temp-name-${table.id}">Temporärer Name:</label>
      <input type="text" id="table-temp-name-${table.id}" value="${table.temp_name || ''}" placeholder="Temporärer Name">
      <label for="table-players-${table.id}">Spieler:</label>
      <input type="number" id="table-players-${table.id}" value="${table.player_count || 0}" min="0">
      <div class="match-stats">
        <div class="match-stat">
          <span class="stat-label">Gespielte Matches:</span>
          <span class="stat-value">${matchCounts.playedMatches || 0}</span>
        </div>
        <div class="match-stat">
          <span class="stat-label">Geplante Matches:</span>
          <span class="stat-value">${matchCounts.plannedMatches || 0}</span>
        </div>
      </div>
      <div class="table-buttons">
        <button class="update-table-btn">Speichern</button>
        <div class="reset-dropdown">
          <button class="reset-trigger">Reset</button>
          <div class="reset-menu">
            <button class="reset-table-btn" onclick="resetTable(${table.id})">Tisch zurücksetzen</button>
            <button class="reset-counter-btn" onclick="resetTableCounter(${table.id})">Counter zurücksetzen</button>
          </div>
        </div>
      </div>
    `;
    return card;
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
        // Only reload tables if we're on the tables tab
        if (document.querySelector('.tab-btn.active').getAttribute('data-tab') === 'tables') {
          loadTables();
        }
        loadSettingsTables(); // Still need to update settings tables
      })
      .catch(err => console.error('Fehler beim Aktualisieren des Tisches:', err));
  }

  // ---------------------------
  // Laufkundschaft-Verwaltung
  // ---------------------------
  function loadWalkins() {
    fetch('/api/walkins')
      .then(res => res.json())
      .then(walkins => {
        const walkinList = document.getElementById('walkin-list');
        walkinList.innerHTML = '';
        
        // Load match stats for all walkins
        const walkinPromises = walkins.map(async walkin => {
          const matchCounts = await countParticipantMatches(walkin.id, 'walkin');
          return { walkin, matchCounts };
        });

        Promise.all(walkinPromises)
          .then(walkinData => {
            walkinData.forEach(({ walkin, matchCounts }) => {
              const li = document.createElement('li');
              li.dataset.id = walkin.id;
              li.innerHTML = `
                <span class="walkin-name">${walkin.name}</span>
                <div class="match-stats">
                  <div class="match-stat">
                    <span class="stat-label">Gespielt:</span>
                    <span class="stat-value">${matchCounts.playedMatches}</span>
                  </div>
                  <div class="match-stat">
                    <span class="stat-label">Geplant:</span>
                    <span class="stat-value">${matchCounts.plannedMatches}</span>
                  </div>
                </div>
                <div class="walkin-buttons">
                  <button class="delete-walkin-btn">Löschen</button>
                  <button class="reset-counter-btn">Counter Reset</button>
                </div>
              `;
              const deleteBtn = li.querySelector('.delete-walkin-btn');
              deleteBtn.addEventListener('click', () => deleteWalkin(walkin.id));
              
              const resetCounterBtn = li.querySelector('.reset-counter-btn');
              resetCounterBtn.addEventListener('click', () => {
                if (confirm('Möchten Sie den Match-Zähler für diese Laufkundschaft zurücksetzen?')) {
                  resetMatchCounter(walkin.id, 'walkin');
                }
              });
              
              walkinList.appendChild(li);
            });
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
  // Spielmodi-Verwaltung (Game Modes)
  // ---------------------------
  function loadGameModes() {
    return fetch('/api/gamemodes')
      .then(res => res.json())
      .catch(err => {
        console.error('Fehler beim Laden der Spielmodi:', err);
        return [];
      });
  }

  function addGameMode(name, description, icon) {
    fetch('/api/gamemodes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, description, icon })
    })
      .then(res => res.json())
      .then(result => {
        console.log('Spielmodus hinzugefügt:', result);
        loadSettingsGameModes();
      })
      .catch(err => console.error('Fehler beim Hinzufügen des Spielmodus:', err));
  }

  function deleteGameMode(id) {
    fetch('/api/gamemodes', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id })
    })
      .then(res => res.json())
      .then(result => {
        console.log('Spielmodus gelöscht:', result);
        loadSettingsGameModes();
      })
      .catch(err => console.error('Fehler beim Löschen des Spielmodus:', err));
  }

  function updateGameMode(id, name, description, icon) {
    fetch('/api/gamemodes', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, name, description, icon })
    })
      .then(res => res.json())
      .then(result => {
        console.log('Spielmodus aktualisiert:', result);
        loadSettingsGameModes();
      })
      .catch(err => console.error('Fehler beim Aktualisieren des Spielmodus:', err));
  }

  // ---------------------------
  // Match-Verwaltung
  // ---------------------------
  // Hier können Matches angelegt, bearbeitet und (über Dropdown) mit einem Spielmodus versehen werden.
  function loadMatches() {
    fetch('/api/matches')
      .then(res => res.json())
      .then(matches => {
        loadGlobalParticipants().then(globalParticipants => {
          loadGameModes().then(gameModes => {
          // Nur noch nicht gestartete Matches anzeigen
          const pendingMatches = matches.filter(m => m.is_started == 0);
          const matchesContainer = document.getElementById('matches-container');
          matchesContainer.innerHTML = '';
          pendingMatches.forEach(match => {
            const matchRow = document.createElement('div');
            matchRow.classList.add('match-row');
            matchRow.dataset.matchId = match.id;

              // Dropdown für Spielmodus
              const gameModeSelect = document.createElement('select');
              gameModeSelect.classList.add('match-gamemode');
              let optionsHtml = `<option value="">-- Kein Spielmodus --</option>`;
              gameModes.forEach(gm => {
                optionsHtml += `<option value="${gm.id}">${gm.name}</option>`;
              });
              gameModeSelect.innerHTML = optionsHtml;
              if (match.game_mode_id) {
                gameModeSelect.value = match.game_mode_id;
              }
              gameModeSelect.addEventListener('change', () => {
                const newGameModeId = gameModeSelect.value ? parseInt(gameModeSelect.value) : null;
                updateMatch(match.id, match.participants, newGameModeId);
              });
              matchRow.appendChild(gameModeSelect);
              
              // Container mit Rahmen für die Teilnehmer-Boxen
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
                updateMatch(match.id, newParticipants, match.game_mode_id);
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
      .catch(err => console.error('Fehler beim Laden der Participants:', err));
    })
    .catch(err => console.error('Fehler beim Laden der Matches:', err));
  }

  function createEmptyMatch() {
    fetch('/api/matches', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ participants: [], game_mode_id: null })
    })
      .then(res => res.json())
      .then(result => {
        console.log('Leeres Match angelegt:', result);
        loadMatches();
      })
      .catch(err => console.error('Fehler beim Anlegen des Matches:', err));
  }

  // Function to update match statistics for a specific element
  async function updateMatchStats(element, participantId, participantType) {
    try {
      const matchCounts = await countParticipantMatches(participantId, participantType);
      const statsContainer = element.querySelector('.match-stats');
      if (statsContainer) {
        statsContainer.innerHTML = `
          <div class="match-stat">
            <span class="stat-label">Gespielte Matches:</span>
            <span class="stat-value">${matchCounts.playedMatches}</span>
          </div>
          <div class="match-stat">
            <span class="stat-label">Geplante Matches:</span>
            <span class="stat-value">${matchCounts.plannedMatches}</span>
          </div>
        `;
      }
    } catch (err) {
      console.error('Fehler beim Aktualisieren der Match-Statistiken:', err);
    }
  }

  // Function to refresh all match statistics
  function refreshMatchStats() {
    // Update table stats
    document.querySelectorAll('.table-card').forEach(card => {
      const tableId = card.dataset.tableId;
      updateMatchStats(card, tableId, 'table');
    });

    // Update walk-in stats
    document.querySelectorAll('#walkin-list li').forEach(li => {
      const walkinId = li.dataset.id;
      updateMatchStats(li, walkinId, 'walkin');
    });
  }

  // Aktualisiert ein Match – jetzt mit Teilnehmern und optionalem Spielmodus
  function updateMatch(matchId, participants, game_mode_id) {
    fetch('/api/matches/update', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: matchId, participants, game_mode_id })
    })
      .then(res => res.json())
      .then(result => {
        console.log('Match aktualisiert:', result);
        loadMatches();
        refreshMatchStats(); // Only update stats, not the entire displays
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
        refreshMatchStats(); // Only update stats, not the entire displays
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
        refreshMatchStats(); // Only update stats, not the entire displays
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

  const globalStartMatchBtnHeader = document.getElementById('global-start-match-btn-header');
  globalStartMatchBtnHeader.addEventListener('click', startFirstMatch);

  const newMatchBtn = document.getElementById('new-match-btn');
  newMatchBtn.addEventListener('click', createEmptyMatch);

  loadMatches(); // Matches laden

  // ---------------------------
  // Einstellungen Modal inkl. Tisch- und Spielmodus-Verwaltung
  // ---------------------------
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

  // ---------------------------
  // Spielmodi-Verwaltung im Settings-Modal
  // ---------------------------
  function loadSettingsGameModes() {
    fetch('/api/gamemodes')
      .then(res => res.json())
      .then(modes => {
        const settingsModesList = document.getElementById('settings-gamemodes-list');
        settingsModesList.innerHTML = '';
        modes.forEach(mode => {
          const li = document.createElement('li');
          li.dataset.id = mode.id;
          
          // Create edit form
          const editForm = document.createElement('form');
          editForm.classList.add('gamemode-edit-form');
          editForm.style.display = 'none';
          
          const nameInput = document.createElement('input');
          nameInput.type = 'text';
          nameInput.value = mode.name;
          nameInput.placeholder = 'Name';
          
          const descInput = document.createElement('input');
          descInput.type = 'text';
          descInput.value = mode.description || '';
          descInput.placeholder = 'Beschreibung';
          
          const iconInput = document.createElement('input');
          iconInput.type = 'text';
          iconInput.value = mode.icon || '';
          iconInput.placeholder = 'Icon URL';
          
          const saveBtn = document.createElement('button');
          saveBtn.type = 'submit';
          saveBtn.textContent = 'Speichern';
          
          const cancelBtn = document.createElement('button');
          cancelBtn.type = 'button';
          cancelBtn.textContent = 'Abbrechen';
          
          editForm.appendChild(nameInput);
          editForm.appendChild(descInput);
          editForm.appendChild(iconInput);
          editForm.appendChild(saveBtn);
          editForm.appendChild(cancelBtn);
          
          // Create display div
          const displayDiv = document.createElement('div');
          displayDiv.classList.add('gamemode-display');
          displayDiv.innerHTML = `<strong>${mode.name}</strong> – ${mode.description || ''}`;
          
          // Create buttons
          const editBtn = document.createElement('button');
          editBtn.textContent = 'Bearbeiten';
          editBtn.style.marginLeft = '10px';
          
          const deleteBtn = document.createElement('button');
          deleteBtn.textContent = 'Löschen';
          deleteBtn.style.marginLeft = '10px';
          
          // Add event listeners
          editBtn.addEventListener('click', () => {
            displayDiv.style.display = 'none';
            editForm.style.display = 'block';
          });
          
          cancelBtn.addEventListener('click', () => {
            displayDiv.style.display = 'block';
            editForm.style.display = 'none';
          });
          
          editForm.addEventListener('submit', (e) => {
            e.preventDefault();
            updateGameMode(
              mode.id,
              nameInput.value.trim(),
              descInput.value.trim(),
              iconInput.value.trim()
            );
          });
          
          deleteBtn.addEventListener('click', () => deleteGameMode(mode.id));
          
          // Append elements
          displayDiv.appendChild(editBtn);
          displayDiv.appendChild(deleteBtn);
          li.appendChild(displayDiv);
          li.appendChild(editForm);
          settingsModesList.appendChild(li);
        });
      })
      .catch(err => console.error('Fehler beim Laden der Spielmodi im Settings-Modal:', err));
  }

  const addGameModeBtn = document.getElementById('add-gamemode-btn');
  addGameModeBtn.addEventListener('click', () => {
    const nameInput = document.getElementById('new-gamemode-name');
    const descInput = document.getElementById('new-gamemode-description');
    const iconInput = document.getElementById('new-gamemode-icon');
    const name = nameInput.value.trim();
    const description = descInput.value.trim();
    const icon = iconInput.value.trim();
    if (!name) return;
    addGameMode(name, description, icon);
    nameInput.value = '';
    descInput.value = '';
    iconInput.value = '';
  });

  // Function to refresh all match-related displays
  function refreshMatchDisplays() {
    // Only load if we're on the relevant tab
    if (document.querySelector('.tab-btn.active').getAttribute('data-tab') === 'tables') {
      loadTables();
    }
    if (document.querySelector('.tab-btn.active').getAttribute('data-tab') === 'walkins') {
      loadWalkins();
    }
  }

  // Function to reset match counter for a participant
  function resetMatchCounter(participantId, participantType) {
    fetch(`/api/${participantType}s/reset`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: participantId })
    })
      .then(res => res.json())
      .then(result => {
        console.log('Match counter reset:', result);
        // Only reload if we're on the relevant tab
        if (participantType === 'table' && document.querySelector('.tab-btn.active').getAttribute('data-tab') === 'tables') {
          loadTables();
        } else if (participantType === 'walkin' && document.querySelector('.tab-btn.active').getAttribute('data-tab') === 'walkins') {
          loadWalkins();
        }
        refreshMatchStats(); // Update the statistics display
      })
      .catch(err => console.error('Fehler beim Zurücksetzen des Match-Zählers:', err));
  }

  // Backup and Restore functionality
  function createBackup() {
    const includeWalkins = document.getElementById('include-walkins').checked;
    const includeMatches = document.getElementById('include-matches').checked;

    fetch('/api/backup/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ includeWalkins, includeMatches })
    })
      .then(res => res.json())
      .then(data => {
        if (data.error) {
          alert(data.error);
          return;
        }
        
        // Create download link
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `lasertag_backup_${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        alert('Backup erfolgreich erstellt');
      })
      .catch(err => {
        console.error('Fehler beim Erstellen des Backups:', err);
        alert('Fehler beim Erstellen des Backups');
      });
  }

  function restoreBackup() {
    const fileInput = document.getElementById('backup-file');
    const file = fileInput.files[0];
    
    if (!file) {
      alert('Bitte wählen Sie eine Backup-Datei aus');
      return;
    }

    if (!confirm('Sind Sie sicher, dass Sie das Backup wiederherstellen möchten? Alle aktuellen Daten werden überschrieben.')) {
      return;
    }

    const reader = new FileReader();
    reader.onload = function(e) {
      try {
        const backupData = JSON.parse(e.target.result);
        
        fetch('/api/backup/restore', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(backupData)
        })
          .then(res => res.json())
          .then(data => {
            if (data.error) {
              alert(data.error);
              return;
            }
            alert('Backup erfolgreich wiederhergestellt');
            location.reload(); // Reload the page to show updated data
          })
          .catch(err => {
            console.error('Fehler beim Wiederherstellen des Backups:', err);
            alert('Fehler beim Wiederherstellen des Backups');
          });
      } catch (err) {
        console.error('Fehler beim Lesen der Backup-Datei:', err);
        alert('Ungültiges Backup-Format');
      }
    };
    reader.readAsText(file);
  }

  // Backup and Restore buttons
  document.getElementById('create-backup-btn').addEventListener('click', createBackup);
  document.getElementById('restore-backup-btn').addEventListener('click', restoreBackup);

  // Tab switching functionality
  const tabButtons = document.querySelectorAll('.tab-btn');
  const tabContents = document.querySelectorAll('.tab-content');
  const settingsTabButtons = document.querySelectorAll('.settings-tab-btn');
  const settingsTabContents = document.querySelectorAll('.settings-tab-content');

  // Main tabs
  tabButtons.forEach(button => {
    button.addEventListener('click', () => {
      // Remove active class from all buttons and contents
      tabButtons.forEach(btn => btn.classList.remove('active'));
      tabContents.forEach(content => content.classList.remove('active'));

      // Add active class to clicked button and corresponding content
      button.classList.add('active');
      const tabId = button.getAttribute('data-tab');
      document.getElementById(`${tabId}-tab`).classList.add('active');

      // Load settings-related data only when settings tab is clicked
      if (tabId === 'settings') {
        loadSettingsTables();
        loadSettingsGameModes();
        loadSettings();
      } else if (tabId === 'tables') {
        loadTables();
      } else if (tabId === 'walkins') {
        loadWalkins();
      } else if (tabId === 'matches') {
        loadMatches();
      }
    });
  });

  // Settings tabs
  settingsTabButtons.forEach(button => {
    button.addEventListener('click', () => {
      // Remove active class from all buttons and contents
      settingsTabButtons.forEach(btn => btn.classList.remove('active'));
      settingsTabContents.forEach(content => content.classList.remove('active'));

      // Add active class to clicked button and corresponding content
      button.classList.add('active');
      const tabId = button.getAttribute('data-tab');
      document.getElementById(`${tabId}-tab`).classList.add('active');
    });
  });

  // Initial load - only load the active tab
  const activeTab = document.querySelector('.tab-btn.active').getAttribute('data-tab');
  if (activeTab === 'tables') {
    loadTables();
  } else if (activeTab === 'walkins') {
    loadWalkins();
  } else if (activeTab === 'matches') {
    loadMatches();
  } else if (activeTab === 'settings') {
    loadSettingsTables();
    loadSettingsGameModes();
    loadSettings();
  }

  async function loadSettings() {
    try {
      const response = await fetch('/api/settings');
      if (!response.ok) throw new Error('Failed to load settings');
      
      const settings = await response.json();
      
      // Update input fields with current settings
      document.getElementById('display-matches-count').value = settings.display_matches_count || 4;
      document.getElementById('match-length-minutes').value = settings.match_length_minutes || 15;
      document.getElementById('break-length-minutes').value = settings.break_length_minutes || 5;
    } catch (error) {
      console.error('Error loading settings:', error);
      alert('Fehler beim Laden der Einstellungen');
    }
  }

  async function saveSettings() {
    const settings = {
      display_matches_count: parseInt(document.getElementById('display-matches-count').value),
      match_length_minutes: parseInt(document.getElementById('match-length-minutes').value),
      break_length_minutes: parseInt(document.getElementById('break-length-minutes').value)
    };

    try {
      const response = await fetch('/api/settings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(settings)
      });

      if (!response.ok) throw new Error('Failed to save settings');
      
      alert('Einstellungen erfolgreich gespeichert');
    } catch (error) {
      console.error('Error saving settings:', error);
      alert('Fehler beim Speichern der Einstellungen');
    }
  }
});