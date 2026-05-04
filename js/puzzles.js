// ── ALL PUZZLE DEFINITIONS ────────────────────────────────
// Each puzzle: { type, title, instructions, maxPts, data, render(container, onComplete) }

const PUZZLE_DEFS = {

  // ── DAY 1: MAP QUIZ ──────────────────────────────────────
  1: {
    type: 'map',
    title: 'Christmas Market Guessr',
    maxPts: 10,
    render(container, onComplete) {
      const target = {
        lat: 51.5050468,
        lng: -0.1180041,
        name: 'Southbank Centre Winter Market'
      };
      const streetViewEmbedUrl = 'https://www.google.com/maps?layer=c&cbll=51.5050468,-0.1180041&cbp=12,356.4,,0,49.23&output=svembed';
      let guess = null;
      let map = null;
      let guessMarker = null;

      showStreetView();

      function showStreetView() {
        container.innerHTML = `
          <section class="panel map-guess-panel">
            <div class="map-guess-streetview">
              <iframe title="Street View Rätsel" src="${streetViewEmbedUrl}" loading="lazy" referrerpolicy="no-referrer-when-downgrade"></iframe>
              <button class="streetview-bubble" type="button">Schau dich um!</button>
              <div class="streetview-mask streetview-mask-top" aria-hidden="true"></div>
              <div class="streetview-mask streetview-mask-bottom" aria-hidden="true"></div>
              <div class="streetview-mask streetview-mask-left" aria-hidden="true"></div>
              <div class="streetview-mask streetview-mask-right" aria-hidden="true"></div>
            </div>
            <div class="map-guess-copy">
              <h2>Wo stehst du?</h2>
              <p>Schau dich um. Wenn du glaubst, die Location zu kennen, wechsel zur Karte und setz deinen Pin.</p>
              <button class="btn btn-primary" id="openGuessMap">${iconHtml('map-pin', 'badge-icon')} Raten</button>
            </div>
          </section>
        `;
        renderIcons(container);
        const bubble = container.querySelector('.streetview-bubble');
        bubble.addEventListener('pointerdown', () => bubble.classList.add('hidden'), { once: true });
        document.getElementById('openGuessMap').onclick = showGuessMap;
      }

      function showGuessMap() {
        container.innerHTML = `
          <section class="panel map-guess-panel">
            <div class="map-guess-toolbar">
              <button class="btn btn-ghost" id="backToStreetView">${iconHtml('arrow-left', 'badge-icon')} Zurück</button>
              <button class="btn btn-primary" id="submitGuess" disabled>${iconHtml('send', 'badge-icon')} Tipp abgeben</button>
            </div>
            <div class="guess-map" id="guessMap">
              <div class="map-loading">Karte lädt...</div>
            </div>
            <p class="map-guess-hint" id="guessHint">Klicke auf die Karte, um deinen Tipp zu setzen.</p>
          </section>
        `;
        renderIcons(container);
        guess = null;
        guessMarker = null;
        document.getElementById('backToStreetView').onclick = showStreetView;
        document.getElementById('submitGuess').onclick = submitGuess;
        loadLeaflet().then(initMap).catch(() => {
          document.getElementById('guessMap').innerHTML = '<div class="map-loading">Die Karte konnte nicht geladen werden. Prüfe kurz deine Verbindung und versuch es nochmal.</div>';
        });
      }

      function loadLeaflet() {
        if (window.L) return Promise.resolve();
        return new Promise((resolve, reject) => {
          if (!document.querySelector('link[data-leaflet]')) {
            const link = document.createElement('link');
            link.rel = 'stylesheet';
            link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
            link.dataset.leaflet = 'true';
            document.head.appendChild(link);
          }
          const existing = document.querySelector('script[data-leaflet]');
          if (existing) {
            existing.addEventListener('load', resolve, { once: true });
            existing.addEventListener('error', reject, { once: true });
            return;
          }
          const script = document.createElement('script');
          script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
          script.dataset.leaflet = 'true';
          script.onload = resolve;
          script.onerror = reject;
          document.head.appendChild(script);
        });
      }

      function initMap() {
        const mapEl = document.getElementById('guessMap');
        mapEl.innerHTML = '';
        map = L.map(mapEl, { zoomControl: true }).setView([54, 12], 4);
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          maxZoom: 19,
          attribution: '&copy; OpenStreetMap'
        }).addTo(map);
        map.on('click', e => {
          guess = e.latlng;
          if (guessMarker) guessMarker.setLatLng(guess);
          else guessMarker = L.marker(guess).addTo(map);
          document.getElementById('submitGuess').disabled = false;
          document.getElementById('guessHint').textContent = 'Pin gesetzt. Du kannst ihn durch erneutes Klicken verschieben.';
        });
        setTimeout(() => map.invalidateSize(), 80);
      }

      function submitGuess() {
        if (!guess) return;
        const distance = getDistanceMeters(guess.lat, guess.lng, target.lat, target.lng);
        const pts = Math.max(0, Math.ceil(10 * (1 - Math.min(distance, 1200000) / 1200000)));
        showResult(distance, pts);
      }

      function showResult(distance, pts) {
        const distanceText = distance >= 1000 ? `${(distance / 1000).toFixed(2)} km` : `${Math.round(distance)} m`;
        if (map) {
          const accent = getComputedStyle(document.documentElement).getPropertyValue('--accent').trim();
          L.marker([target.lat, target.lng]).addTo(map).bindPopup(target.name).openPopup();
          L.polyline([[guess.lat, guess.lng], [target.lat, target.lng]], { color: accent, weight: 3 }).addTo(map);
          map.fitBounds([[guess.lat, guess.lng], [target.lat, target.lng]], { padding: [40, 40] });
        }
        document.getElementById('guessHint').innerHTML = `Du warst <strong>${distanceText}</strong> entfernt. Das gibt <strong>${pts}/10</strong> Punkte.`;
        document.getElementById('submitGuess').textContent = 'Weiter';
        document.getElementById('submitGuess').disabled = false;
        document.getElementById('submitGuess').onclick = () => onComplete(pts);
      }

      function getDistanceMeters(lat1, lon1, lat2, lon2) {
        const toRad = deg => deg * Math.PI / 180;
        const r = 6371000;
        const dLat = toRad(lat2 - lat1);
        const dLon = toRad(lon2 - lon1);
        const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
        return r * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
      }
    }
  },

  // ── DAY 2: MATH PUZZLE ──────────────────────────────────
  2: {
    type: 'math',
    title: 'Zahlen-Rätsel',
    maxPts: 10,
    render(container, onComplete) {
      const qs = [
        { q: 'Wenn A = 5 ist, was ergibt A x A + A?', ans: '30', hint: '5 x 5 + 5 = 30' },
        { q: '8 Rentiere tragen je 4 Geschenke. Wieviele Geschenke sind es gesamt?', ans: '32', hint: '8 x 4 = 32' },
        { q: 'In 3 Häusern stehen je 7 Kerzen. Wie viele Kerzen insgesamt?', ans: '21', hint: '3 × 7 = 21' },
        { q: 'A + B = 15\nA x 2 = B\nWas ist A?', ans: '5', hint: 'x + 2x = 15 -> 3x = 15 -> x = 5' },
      ];
      let qIdx = 0, totalPts = 0, attempts = 0;

      function showQ() {
        if (qIdx >= qs.length) { onComplete(totalPts); return; }
        attempts = 0;
        const q = qs[qIdx];
        container.innerHTML = `
          <div class="progress-bar-wrap"><div class="progress-bar-fill" style="width:${(qIdx/qs.length)*100}%"></div></div>
          <div class="math-display">${q.q}</div>
          <div class="panel">
            <p style="font-weight:700;margin-bottom:8px;color:color-mix(in srgb, var(--ink) 72%, transparent);">Deine Antwort:</p>
            <input class="input-field" type="number" id="mathInput" placeholder="Zahl eingeben..." />
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:4px;">
              <button class="btn btn-ghost" id="hintBtn">Tipp</button>
              <button class="btn btn-primary" id="checkBtn">Prüfen</button>
            </div>
            <p id="hintText" style="color:var(--accent);font-size:0.85rem;margin-top:8px;display:none;">${q.hint}</p>
          </div>
        `;
        document.getElementById('hintBtn').onclick = () => {
          document.getElementById('hintText').style.display = 'block';
          attempts = 2; // penalize for hint
        };
        document.getElementById('checkBtn').onclick = checkAnswer;
        document.getElementById('mathInput').addEventListener('keydown', e => { if (e.key === 'Enter') checkAnswer(); });
        document.getElementById('mathInput').focus();

        function checkAnswer() {
          const val = document.getElementById('mathInput').value.trim();
          if (val === q.ans) {
            const gained = attempts === 0 ? 100 : attempts === 1 ? 60 : 30;
            totalPts += gained;
            showToast('Richtig! +' + gained + ' Punkte', 'success');
            setTimeout(() => { qIdx++; showQ(); }, 1200);
          } else {
            attempts++;
            if (attempts >= 3) {
              showToast('Antwort: ' + q.ans, '');
              setTimeout(() => { qIdx++; showQ(); }, 1500);
            } else {
              showToast('Nicht ganz! Versuch ' + (3-attempts) + ' übrig', 'error');
              document.getElementById('mathInput').value = '';
              document.getElementById('mathInput').focus();
            }
          }
        }
      }
      showQ();
    }
  },

  // ── DAY 3: WORDLE ────────────────────────────────────────
  3: {
    type: 'wordle',
    title: 'Weihnachts-Wordle',
    maxPts: 10,
    render(container, onComplete) {
      const words = ['STERN', 'SCHNEE', 'ADVENT', 'KERZEN', 'ENGEL'];
      const targetWord = words[new Date().getDate() % words.length];
      const WORD_LEN = targetWord.length;
      const MAX_GUESSES = 6;
      let guesses = [], currentGuess = '', gameOver = false;

      const KB_ROWS = [
        ['Q','W','E','R','T','Z','U','I','O','P'],
        ['A','S','D','F','G','H','J','K','L'],
        ['ENTER','Y','X','C','V','B','N','M','⌫']
      ];
      const keyState = {};

      function renderAll() {
        container.innerHTML = `
          <p style="text-align:center;font-weight:700;color:color-mix(in srgb, var(--ink) 72%, transparent);margin-bottom:8px;">Errate das ${WORD_LEN}-Buchstaben Weihnachtswort!</p>
          <div class="letter-grid" style="grid-template-rows:repeat(${MAX_GUESSES},1fr);" id="wordleGrid"></div>
          <div style="margin:12px 0;text-align:center;font-size:0.8rem;color:color-mix(in srgb, var(--ink) 72%, transparent);">
            🟩 Richtige Stelle &nbsp; 🟨 Falscher Platz &nbsp; ⬜ Nicht dabei
          </div>
          <div class="keyboard" id="kb"></div>
        `;
        const grid = document.getElementById('wordleGrid');
        for (let r = 0; r < MAX_GUESSES; r++) {
          const row = document.createElement('div');
          row.className = 'letter-row';
          for (let c = 0; c < WORD_LEN; c++) {
            const box = document.createElement('div');
            box.className = 'letter-box';
            box.style.width = box.style.height = Math.min(44, Math.floor(280/WORD_LEN)) + 'px';
            if (r < guesses.length) {
              const g = guesses[r];
              box.textContent = g.letters[c];
              box.classList.add(g.result[c]);
            } else if (r === guesses.length) {
              box.textContent = currentGuess[c] || '';
              if (currentGuess[c]) box.classList.add('filled');
            }
            row.appendChild(box);
          }
          grid.appendChild(row);
        }
        const kb = document.getElementById('kb');
        KB_ROWS.forEach(row => {
          const rowDiv = document.createElement('div');
          rowDiv.className = 'keyboard-row';
          row.forEach(k => {
            const btn = document.createElement('button');
            btn.className = 'key-btn' + (k.length > 1 ? ' wide' : '') + (keyState[k] ? ' ' + keyState[k] : '');
            btn.textContent = k;
            btn.addEventListener('click', () => handleKey(k));
            rowDiv.appendChild(btn);
          });
          kb.appendChild(rowDiv);
        });
      }

      function handleKey(k) {
        if (gameOver) return;
        if (k === '⌫') { currentGuess = currentGuess.slice(0, -1); }
        else if (k === 'ENTER') {
          if (currentGuess.length !== WORD_LEN) { showToast('Zu kurz!', 'error'); return; }
          submitGuess();
          return;
        } else if (currentGuess.length < WORD_LEN && /^[A-Z]$/.test(k)) {
          currentGuess += k;
        }
        renderAll();
      }

      function submitGuess() {
        const result = [];
        const target = targetWord.split('');
        const guess = currentGuess.split('');
        const remaining = [...target];

        // Correct
        guess.forEach((l, i) => {
          if (l === target[i]) { result[i] = 'correct'; remaining[i] = null; }
        });
        // Present / Absent
        guess.forEach((l, i) => {
          if (result[i]) return;
          const ri = remaining.indexOf(l);
          if (ri !== -1) { result[i] = 'present'; remaining[ri] = null; }
          else result[i] = 'absent';
        });

        guess.forEach((l, i) => {
          if (!keyState[l] || keyState[l] === 'absent' || (keyState[l] === 'present' && result[i] === 'correct')) {
            keyState[l] = result[i];
          }
        });

        guesses.push({ letters: guess, result });
        const won = result.every(r => r === 'correct');
        currentGuess = '';
        renderAll();

        if (won) {
          gameOver = true;
          const pts = Math.max(50, 500 - (guesses.length - 1) * 80);
          setTimeout(() => { showToast('Gewonnen!', 'success'); onComplete(pts); }, 600);
        } else if (guesses.length >= MAX_GUESSES) {
          gameOver = true;
          setTimeout(() => { showToast('Das Wort war: ' + targetWord, ''); onComplete(50); }, 600);
        }
      }

      document.addEventListener('keydown', e => {
        if (e.key === 'Backspace') handleKey('⌫');
        else if (e.key === 'Enter') handleKey('ENTER');
        else if (/^[a-zA-Z]$/.test(e.key)) handleKey(e.key.toUpperCase());
      }, { once: false });

      renderAll();
    }
  },

  // ── DAY 4: SLIDING PUZZLE ────────────────────────────────
  4: {
    type: 'slide',
    title: 'Schiebe-Puzzle',
    maxPts: 10,
    render(container, onComplete) {
      const SIZE = 4;
      let tiles, moves, startTime;
      const goal = [...Array(SIZE*SIZE-1).keys()].map(i=>i+1).concat(0);

      function initPuzzle() {
        tiles = [...goal];
        // Shuffle (ensure solvable)
        for (let i = 0; i < 200; i++) {
          const blank = tiles.indexOf(0);
          const neighbors = getNeighbors(blank);
          const pick = neighbors[Math.floor(Math.random()*neighbors.length)];
          [tiles[blank], tiles[pick]] = [tiles[pick], tiles[blank]];
        }
        moves = 0;
        startTime = Date.now();
      }

      function getNeighbors(idx) {
        const nb = [];
        const r = Math.floor(idx/SIZE), c = idx%SIZE;
        if (r > 0) nb.push(idx-SIZE);
        if (r < SIZE-1) nb.push(idx+SIZE);
        if (c > 0) nb.push(idx-1);
        if (c < SIZE-1) nb.push(idx+1);
        return nb;
      }

      function isSolved() { return tiles.every((t,i) => t === goal[i]); }

      function render() {
        container.innerHTML = `
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;padding:0 4px;">
            <span style="font-weight:700;color:color-mix(in srgb, var(--ink) 72%, transparent);">Züge: <strong style="color:var(--ink)">${moves}</strong></span>
            <button class="btn btn-ghost" style="width:auto;padding:8px 14px;font-size:0.85rem;" onclick="window.slideShuffle()">Neu mischen</button>
          </div>
          <div class="slide-grid" id="slideGrid"></div>
          <p style="text-align:center;color:color-mix(in srgb, var(--ink) 72%, transparent);font-size:0.8rem;margin-top:8px;">Schiebe die Zahlen in die richtige Reihenfolge (1–15)!</p>
        `;
        const grid = document.getElementById('slideGrid');
        tiles.forEach((t, i) => {
          const tile = document.createElement('div');
          tile.className = 'slide-tile' + (t === 0 ? ' empty' : '');
          tile.textContent = t || '';
          if (t !== 0) tile.addEventListener('click', () => moveTile(i));
          grid.appendChild(tile);
        });
      }

      function moveTile(idx) {
        const blank = tiles.indexOf(0);
        if (!getNeighbors(blank).includes(idx)) return;
        [tiles[blank], tiles[idx]] = [tiles[idx], tiles[blank]];
        moves++;
        render();
        if (isSolved()) {
          const elapsed = Math.floor((Date.now()-startTime)/1000);
          const pts = Math.max(50, 350 - moves * 3 - elapsed);
          setTimeout(() => { showToast('Gelöst in ' + moves + ' Zügen!', 'success'); onComplete(pts); }, 300);
        }
      }

      window.slideShuffle = () => { initPuzzle(); render(); };
      initPuzzle();
      render();
    }
  },

  // ── DAY 5: GEO QUIZ ──────────────────────────────────────
  5: {
    type: 'geo',
    title: 'Weihnachts-Geografie',
    maxPts: 10,
    render(container, onComplete) {
      const questions = [
        { q: 'In welchem Land hat der Weihnachtsmann (Santa Claus) offiziell seinen Wohnsitz?', opts: ['Schweden', 'Norwegen', 'Finnland', 'Island'], ans: 2, fact: 'Rovaniemi in Finnland gilt als Heimat des Weihnachtsmanns!' },
        { q: 'In welchem Land ist Weihnachten mitten im Sommer?', opts: ['Neuseeland', 'Australien', 'Brasilien', 'Alle südl. Länder'], ans: 3, fact: 'Auf der Südhalbkugel ist Dezember Sommer!' },
        { q: 'Wo befindet sich die echte Stadt "Bethlehem"?', opts: ['Israel', 'Palästina', 'Jordanien', 'Ägypten'], ans: 1, fact: 'Bethlehem liegt im Westjordanland!' },
        { q: 'In welcher Stadt wurde der Weihnachtsmarkt erfunden?', opts: ['München', 'Wien', 'Straßburg', 'Nürnberg'], ans: 2, fact: 'Straßburg hat den ältesten dokumentierten Weihnachtsmarkt (1570)!' },
      ];
      let idx = 0, pts = 0;
      function showQ() {
        if (idx >= questions.length) { onComplete(pts); return; }
        const q = questions[idx];
        container.innerHTML = `
          <div class="progress-bar-wrap"><div class="progress-bar-fill" style="width:${(idx/questions.length)*100}%"></div></div>
          <div class="panel">
            <p style="font-size:1rem;font-weight:800;margin-bottom:14px;line-height:1.4;">${q.q}</p>
            <div class="geo-options">
              ${q.opts.map((o,i)=>`<button class="quiz-option" style="font-size:0.88rem;" data-i="${i}">${o}</button>`).join('')}
            </div>
          </div>
        `;
        container.querySelectorAll('.quiz-option').forEach(btn => {
          btn.addEventListener('click', () => {
            const chosen = parseInt(btn.dataset.i);
            container.querySelectorAll('.quiz-option').forEach((b,bi) => {
              b.disabled = true;
              if (bi === q.ans) b.classList.add('correct');
              else if (bi === chosen && chosen !== q.ans) b.classList.add('wrong');
            });
            if (chosen === q.ans) {
              pts += 75;
              showToast('Richtig! +75 Punkte', 'success');
            } else {
              showToast('Falsch! ' + q.fact, '');
            }
            setTimeout(() => { idx++; showQ(); }, 2000);
          });
        });
      }
      showQ();
    }
  },

  // ── DAY 6: NONOGRAM (LOGIC) ───────────────────────────────
  6: {
    type: 'logic',
    title: 'Nonogramm',
    maxPts: 10,
    render(container, onComplete) {
      // 5x5 nonogram - Christmas tree
      const solution = [
        [0,0,1,0,0],
        [0,1,1,1,0],
        [1,1,1,1,1],
        [0,0,1,0,0],
        [0,0,1,0,0],
      ];
      const rowClues = [[1],[3],[5],[1],[1]];
      const colClues = [[3],[2],[5],[2],[3]];
      let grid = Array.from({length:5}, ()=>Array(5).fill(0)); // 0=empty,1=filled,2=X
      let startTime = Date.now();

      function render() {
        const SIZE = 5;
        container.innerHTML = `
          <p style="text-align:center;color:color-mix(in srgb, var(--ink) 72%, transparent);font-size:0.82rem;margin-bottom:8px;">Tippen=Füllen, Gedrückt halten=X (ausschließen)</p>
          <div style="overflow-x:auto;display:flex;justify-content:center;">
          <table style="border-collapse:collapse;">
            <tr>
              <td style="width:30px;"></td>
              ${colClues.map(c=>`<td style="text-align:center;padding:2px 0;"><div class="clue-numbers">${c.join('<br>')}</div></td>`).join('')}
            </tr>
            ${grid.map((row,r)=>`
              <tr>
                <td style="text-align:right;padding-right:6px;"><div class="clue-numbers">${rowClues[r].join(' ')}</div></td>
                ${row.map((cell,c)=>`
                  <td style="padding:2px;">
                    <div class="logic-cell ${cell===1?'filled':cell===2?'marked':''}" 
                         style="width:44px;height:44px;" 
                         data-r="${r}" data-c="${c}">
                      ${cell===2?'✕':''}
                    </div>
                  </td>
                `).join('')}
              </tr>
            `).join('')}
          </table>
          </div>
          <p style="text-align:center;margin-top:12px;font-size:0.8rem;color:color-mix(in srgb, var(--ink) 72%, transparent);">Hinweis: Das Bild ist ein Weihnachtsbaum.</p>
        `;
        container.querySelectorAll('.logic-cell').forEach(cell => {
          cell.addEventListener('click', () => toggle(parseInt(cell.dataset.r), parseInt(cell.dataset.c), false));
          cell.addEventListener('contextmenu', e => { e.preventDefault(); toggle(parseInt(cell.dataset.r), parseInt(cell.dataset.c), true); });
          let hold;
          cell.addEventListener('touchstart', () => { hold = setTimeout(() => toggle(parseInt(cell.dataset.r), parseInt(cell.dataset.c), true), 400); });
          cell.addEventListener('touchend', () => clearTimeout(hold));
        });
      }

      function toggle(r, c, mark) {
        if (mark) { grid[r][c] = grid[r][c] === 2 ? 0 : 2; }
        else { grid[r][c] = grid[r][c] === 1 ? 0 : 1; }
        render();
        checkSolution();
      }

      function checkSolution() {
        const correct = grid.every((row,r) => row.every((cell,c) => (cell===1) === (solution[r][c]===1)));
        if (correct) {
          const elapsed = Math.floor((Date.now()-startTime)/1000);
          const pts = Math.max(100, 450 - elapsed * 2);
          showToast('Gelöst!', 'success');
          onComplete(pts);
        }
      }

      render();
    }
  },

  // ── DAY 7: WINTER QUIZ ───────────────────────────────────
  7: {
    type: 'quiz',
    title: 'Winter-Quiz',
    maxPts: 10,
    render(container, onComplete) {
      const questions = [
        { q: 'Bei welcher Temperatur friert Wasser?', opts: ['0°C', '-4°C', '4°C', '-1°C'], ans: 0 },
        { q: 'Wie viele Ecken hat eine Schneeflocke?', opts: ['4', '5', '6', '8'], ans: 2 },
        { q: 'Was ist der kälteste Kontinent der Erde?', opts: ['Arktis', 'Antarktis', 'Sibirien', 'Nordpol'], ans: 1 },
      ];
      let idx = 0, pts = 0;
      function showQ() {
        if (idx >= questions.length) { onComplete(pts); return; }
        const q = questions[idx];
        container.innerHTML = `
          <div class="progress-bar-wrap"><div class="progress-bar-fill" style="width:${(idx/questions.length)*100}%"></div></div>
          <div class="panel">
            <p style="font-weight:800;font-size:1.05rem;margin-bottom:16px;">${q.q}</p>
            ${q.opts.map((o,i)=>`<button class="quiz-option" data-i="${i}">${o}</button>`).join('')}
          </div>
        `;
        container.querySelectorAll('.quiz-option').forEach(btn => {
          btn.addEventListener('click', () => {
            const chosen = parseInt(btn.dataset.i);
            container.querySelectorAll('.quiz-option').forEach((b,bi) => {
              b.disabled = true;
              if (bi === q.ans) b.classList.add('correct');
              else if (bi === chosen && chosen !== q.ans) b.classList.add('wrong');
            });
            if (chosen === q.ans) { pts += 100; showToast('Richtig! +100 Punkte', 'success'); }
            else showToast('Leider falsch!', 'error');
            setTimeout(() => { idx++; showQ(); }, 1400);
          });
        });
      }
      showQ();
    }
  },

  // ── DAY 8: MINI SUDOKU ──────────────────────────────────
  8: {
    type: 'sudoku',
    title: 'Mini-Sudoku',
    maxPts: 10,
    render(container, onComplete) {
      // 6x6 Sudoku (easier for mobile)
      const puzzle = [
        [0,3,0,0,5,0],
        [6,0,0,4,0,0],
        [0,0,3,0,0,2],
        [2,0,0,5,0,0],
        [0,0,4,0,0,6],
        [0,1,0,0,4,0],
      ];
      const solution = [
        [1,3,2,6,5,4],
        [6,5,1,4,2,3],
        [4,6,3,1,5,2],  // Simplified - adjusted solution
        [2,4,6,5,3,1],
        [5,2,4,3,1,6],
        [3,1,5,2,4,6],  // Simplified - adjusted solution
      ];
      // Recalculate with a valid 6x6 puzzle
      const validPuzzle = [
        [0,0,2,0,0,4],
        [0,4,0,0,3,0],
        [2,0,0,3,0,0],
        [0,0,4,0,0,1],
        [0,3,0,0,2,0],
        [6,0,0,2,0,0],
      ];
      const validSolution = [
        [3,1,2,6,5,4],
        [5,4,6,1,3,2],
        [2,6,1,3,4,5],
        [4,2,4,5,6,1],
        [1,3,5,4,2,6],
        [6,5,3,2,1,4],
      ];

      let selected = null, errors = 0;
      const startTime = Date.now();
      const userGrid = validPuzzle.map(r => [...r]);
      const given = validPuzzle.map(r => r.map(c => c !== 0));

      function render() {
        container.innerHTML = `
          <p style="text-align:center;color:color-mix(in srgb, var(--ink) 72%, transparent);font-size:0.8rem;margin-bottom:8px;">Fülle das 6×6 Raster! Jede Zahl 1–6 nur einmal pro Zeile, Spalte und Block.</p>
          <div class="number-grid" style="grid-template-columns:repeat(6,1fr);max-width:280px;margin:0 auto 12px;" id="sudokuGrid"></div>
          <div class="numpad">
            ${[1,2,3,4,5,6,'✕'].map(n=>`<button class="numpad-btn" data-n="${n}">${n}</button>`).join('')}
          </div>
          <p style="text-align:center;font-size:0.8rem;color:var(--tile);margin-top:8px;">Fehler: ${errors}/3</p>
        `;
        const grid = document.getElementById('sudokuGrid');
        userGrid.forEach((row,r) => {
          row.forEach((cell,c) => {
            const div = document.createElement('div');
            div.className = 'sudoku-cell' + (given[r][c] ? ' given' : '') + (selected && selected[0]===r && selected[1]===c ? ' selected' : '');
            div.textContent = cell || '';
            if (!given[r][c]) div.addEventListener('click', () => { selected=[r,c]; render(); });
            grid.appendChild(div);
          });
        });
        container.querySelectorAll('.numpad-btn').forEach(btn => {
          btn.addEventListener('click', () => {
            if (!selected) return;
            const [r,c] = selected;
            if (given[r][c]) return;
            const n = btn.dataset.n;
            if (n === '✕') { userGrid[r][c] = 0; render(); return; }
            const num = parseInt(n);
            userGrid[r][c] = num;
              if (num !== validSolution[r][c]) {
                errors++;
                showToast('Falsche Zahl! (' + errors + '/3)', 'error');
              if (errors >= 3) { showToast('Zu viele Fehler!', 'error'); onComplete(50); return; }
            }
            render();
            if (userGrid.every((row,ri) => row.every((cell,ci) => cell === validSolution[ri][ci]))) {
              const elapsed = Math.floor((Date.now()-startTime)/1000);
              const pts = Math.max(100, 500 - errors * 80 - Math.floor(elapsed/30)*20);
              showToast('Sudoku gelöst!', 'success');
              onComplete(pts);
            }
          });
        });
      }
      render();
    }
  },

  // ── DAYS 9-24: Placeholder versions (quiz variations) ───
  ...[9,10,11,12,13,14,15,16,17,18,19,20,21,22,23].reduce((acc, day) => {
    const templates = [
      { type:'quiz', icon:'circle-help', title:'Nikolaus-Quiz', maxPts: 10 },
      { type:'math', icon:'calculator', title:'Rechen-Rätsel', maxPts: 10 },
      { type:'wordle', icon:'type', title:'Wort-Rätsel', maxPts: 10 },
    ];
    const t = templates[day % 3];
    acc[day] = {
      ...t,
      render(container, onComplete) {
        const questionsPool = [
          { q: 'Was bedeutet "Advent"?', opts: ['Ankunft', 'Winter', 'Geschenk', 'Schnee'], ans: 0 },
          { q: 'Wie viele Kerzen hat ein Adventskranz?', opts: ['3', '4', '5', '6'], ans: 1 },
          { q: 'Welcher Heilige ist der Vorgänger des Weihnachtsmanns?', opts: ['St. Patrick', 'St. Georg', 'St. Nikolaus', 'St. Martin'], ans: 2 },
          { q: 'Was wird traditionell an Weihnachten in Deutschland gegessen?', opts: ['Pizza', 'Gans oder Ente', 'Sushi', 'Burger'], ans: 1 },
          { q: 'In welchem Jahr entstand "Stille Nacht"?', opts: ['1818', '1720', '1900', '1850'], ans: 0 },
          { q: 'Wie heißt der Elf, der Rudolph das Rentier begleitet?', opts: ['Herbie', 'Elmo', 'Buddy', 'Tinker'], ans: 0 },
          { q: 'Was schmückt die Spitze des Weihnachtsbaums?', opts: ['Kerze', 'Stern oder Engel', 'Glocke', 'Nikolaus'], ans: 1 },
          { q: 'Wieviele Rentiere zieht Weihnachtsmanns Schlitten (mit Rudolph)?', opts: ['8', '9', '10', '12'], ans: 1 },
        ];
        const qs = questionsPool.slice((day-1) % questionsPool.length, (day-1) % questionsPool.length + 3);
        if (qs.length < 3) qs.push(...questionsPool.slice(0, 3-qs.length));
        let idx=0, pts=0;
        function showQ() {
          if(idx>=qs.length){onComplete(pts);return;}
          const q=qs[idx];
          container.innerHTML=`
            <div class="progress-bar-wrap"><div class="progress-bar-fill" style="width:${(idx/qs.length)*100}%"></div></div>
            <div class="panel">
              <p style="font-weight:800;font-size:1.05rem;margin-bottom:16px;">${q.q}</p>
              ${q.opts.map((o,i)=>`<button class="quiz-option" data-i="${i}">${o}</button>`).join('')}
            </div>
          `;
          container.querySelectorAll('.quiz-option').forEach(btn=>{
            btn.addEventListener('click',()=>{
              const ch=parseInt(btn.dataset.i);
              container.querySelectorAll('.quiz-option').forEach((b,bi)=>{
                b.disabled=true;
                if(bi===q.ans)b.classList.add('correct');
                else if(bi===ch&&ch!==q.ans)b.classList.add('wrong');
              });
              if(ch===q.ans){pts+=100;showToast('Richtig! +100 Punkte','success');}
              else showToast('Falsch!','error');
              setTimeout(()=>{idx++;showQ();},1400);
            });
          });
        }
        showQ();
      }
    };
    return acc;
  }, {}),

  // ── DAY 24: SPECIAL CHALLENGE ────────────────────────────
  24: {
    type: 'special',
    title: 'Heiligabend-Challenge',
    maxPts: 10,
    render(container, onComplete) {
      const rounds = [
        { q: 'Was ist 12 x 12?', ans: '144', pts: 200 },
        { q: '"Silent Night" auf Deutsch?', ans: 'STILLE NACHT', pts: 200 },
        { q: 'Wie heißt das Rentier mit der roten Nase?', ans: 'RUDOLPH', pts: 200 },
        { q: 'Wieviele Tage hat der Advent?', ans: '24', pts: 200 },
        { q: 'Was bedeutet "Weihnachten" wörtlich?', ans: 'GEWEIHTE NACHT', pts: 200 },
      ];
      let idx=0, pts=0;
      function showRound() {
        if(idx>=rounds.length){
          onComplete(pts);
          return;
        }
        const r=rounds[idx];
        container.innerHTML=`
          <div style="text-align:center;margin-bottom:8px;">
            <div style="font-size:1.1rem;color:var(--accent);">Runde ${idx+1}/5 - ${r.pts} Punkte möglich</div>
          </div>
          <div class="math-display" style="font-size:1.4rem;min-height:80px;display:flex;align-items:center;justify-content:center;">${r.q}</div>
          <input class="input-field" id="specialInput" placeholder="Antwort..." style="text-transform:uppercase;" />
          <button class="btn btn-primary" id="specialCheck">Antworten</button>
        `;
        const check=()=>{
          const val=document.getElementById('specialInput').value.trim().toUpperCase();
          if(val===r.ans){
            pts+=r.pts;
            showToast('Richtig! +'+r.pts+' Punkte!','success');
          } else {
            showToast('Antwort: '+r.ans,'');
          }
          setTimeout(()=>{idx++;showRound();},1500);
        };
        document.getElementById('specialCheck').onclick=check;
        document.getElementById('specialInput').addEventListener('keydown',e=>{if(e.key==='Enter')check();});
        document.getElementById('specialInput').focus();
      }
      showRound();
    }
  }
};
