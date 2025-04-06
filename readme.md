# LaserTag BattlePair Webanwendung

Diese Webanwendung stellt eine übersichtliche Verwaltung und Anzeige von Matches für eine Lasertag-Halle bereit. Kunden können Matches auf einem Anzeigemonitor verfolgen, während das Personal eine Admin-Oberfläche zur Match-Verwaltung nutzt.

## Funktionen

- **Übersichtliche Kundenanzeige**: Darstellung der nächsten Matches und Teilnehmer.
- **Intuitive Admin-Oberfläche**: Matches und Teilnehmer (Tische & Laufkundschaft) komfortabel verwalten.
- **Modulares Backend**: Node.js mit SQLite für zuverlässige und effiziente Datenhaltung.
- **Responsive Design**: Optimiert für Anzeigemonitore.

## Projektstruktur

```
app/
├── backend/
│   ├── controllers/
│   ├── database/
│   └── routes/
├── frontend/
│   ├── css/
│   ├── js/
│   ├── images/
│   ├── admin.html
│   └── index.html
├── package.json
└── README.md
```

## Installation

Stelle sicher, dass [Node.js](https://nodejs.org/) installiert ist.

```bash
git clone https://github.com/Metropo/BattlePair.git
cd BattlePair/app
npm install
```

## Starten der Anwendung

```bash
npm start
```

Standardmäßig läuft der Server auf `http://localhost:3000`.

- **Kundenanzeige**: [`http://localhost:3000`](http://localhost:3000)
- **Admin-Oberfläche**: [`http://localhost:3000/admin.html`](http://localhost:3000/admin.html)

## Admin-Funktionen

- **Matches anlegen und starten**
- **Teilnehmer hinzufügen und verwalten**
- **Einstellungen wie Anzahl der Runden anpassen**

## Anpassungen

- Logo und Hintergrundbilder unter `frontend/images/` ersetzen.
- CSS-Anpassungen in `frontend/css/` vornehmen.

## Erweiterbarkeit

Die modularen API-Controller ermöglichen eine einfache Erweiterung der Anwendung und Integration in bestehende Systeme.
