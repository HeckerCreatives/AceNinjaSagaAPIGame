# PvP API Documentation

## Overview
Enhanced PvP system with support for ranked and normal matches, comprehensive statistics tracking, and season best performance tracking.

## Changes in controllers/pvp.js (API)
This project updated `controllers/pvp.js` to add ranked/normal match handling, MMR/rank updates, and richer stats. Below is a concise list of the concrete changes and behavioral impacts so you can quickly review what changed in the server code.

- Added helper: `updatePlayerStats(playerId, matchStatus, matchType, session)`
  - Creates a `PvpStats` document if missing and increments overall, ranked, and normal counters.
  - Saves within the provided MongoDB session.

- Added helper: `updateMMRAndRankings(playerId, opponentId, matchStatus, seasonId, session)`
  - Ensures `Rankings` rows exist for both players (initial MMR 1000).
  - Computes MMR delta with an ELO formula and dynamic K-factor (placement vs standard).
  - Applies minimum MMR change (1), updates both players' `mmr`, `seasonBestMMR`, and maps MMR -> `RankTier` to set `rank` and `seasonBestRank`.
  - Persists ranking updates inside the same transaction.

- `pvpmatchresult` (POST /api/pvp/pvpmatchresult)
  - Accepts `type` field (`"ranked" | "normal"`) in the request body; defaults to `"normal"`.
  - Runs inside a MongoDB transaction and writes two `PvP` documents (one per participant) including `type` and `season`.
  - Updates `PvpStats` for both players using `updatePlayerStats` (type-aware counters).
  - For `type === 'ranked'` calls `updateMMRAndRankings` and returns `mmrChange` in the response.
  - Updates quest/battlepass progress and commits/aborts transaction correctly.

- `getcharacterpvpstats` (GET /api/pvp/getcharacterpvpstats)
  - Loads current season `Rankings` and `PvpStats`.
  - Calculates true all-time best MMR by checking both current `Rankings` and `RankingHistory` (historical snapshots).
  - Loads `RankTier`s and maps MMR -> minimal rank object `{ id, name, icon }` for `currentSeason.rank`, `seasonBest.rank`, and `allTimeBest.rank`.
  - Returns consolidated object with `currentSeason`, `seasonBest`, `allTimeBest`, and grouped match stats (total / ranked / normal).

- Leaderboard and history
  - `getpvpleaderboard` returns paged rankings per season and now includes `seasonBestMMR` in output.
  - `getpvphistory` and `getpvphistorybyseason` expose match `type` and support season-scoped queries.

- Data model and collection impacts
  - `PvP` docs now include `type` (ranked|normal) — use this to filter histories.
  - `PvpStats` aggregates include separate ranked and normal counters and win rates (schema pre-save computes rates).
  - `Rankings` and `RankingHistory` are used together to compute all-time best values (prevents resets from hiding historical peaks).

- Behavior notes / caveats
  - All writes for a match run inside a transaction to keep both players' records consistent.
  - `seasonBestRank` computation uses `RankTier` requirements — ensure `RankTier` rows exist and `requiredmmr` values are correct.
  - Conditional / active companion effects, or other conditional game rules, remain the responsibility of gameplay logic and are not moved into these helpers.


## Models Updated

### PvP Model
- Added `type` field: `"ranked"` or `"normal"` (default: "normal")
- Fixed `owner` reference to point to `Characterdata` instead of `User`

### Rankings Model
- Added `seasonBestMMR`: Tracks highest MMR achieved in current season
- Added `seasonBestRank`: Tracks highest rank achieved in current season

### PvpStats Model
- Added ranked match statistics: `rankedWin`, `rankedLose`, `rankedTotalMatches`, `rankedWinRate`
- Added normal match statistics: `normalWin`, `normalLose`, `normalTotalMatches`, `normalWinRate`
- Updated pre-save hook to calculate all win rates automatically

## API Endpoints

### 1. Get Character PvP Stats
**GET** `/api/pvp/getcharacterpvpstats`

**Query Parameters:**
- `characterid` (required): Character ID to get stats for

**Response:**
```json
{
  "message": "success",
  "data": {
    "currentSeason": {
      "mmr": 1250,
      "rank": {
        "_id": "rank_id",
        "name": "Gold III",
        "icon": "gold3.png"
      },
      "rankPosition": 42
    },
    "seasonBest": {
      "mmr": 1350,
      "rank": {
        "_id": "rank_id",
        "name": "Gold II",
        "icon": "gold2.png"
      }
    },
    "allTimeBest": {
      "mmr": 1450
    },
    "totalMatches": {
      "wins": 25,
      "losses": 15,
      "total": 40,
      "winRate": 62.5
    },
    "rankedMatches": {
      "wins": 15,
      "losses": 8,
      "total": 23,
      "winRate": 65.22
    },
    "normalMatches": {
      "wins": 10,
      "losses": 7,
      "total": 17,
      "winRate": 58.82
    },
    "character": {
      "username": "PlayerName"
    }
  }
}
```

### 2. Record Match Result
**POST** `/api/pvp/pvpmatchresult`

**Request Body:**
```json
{
  "opponent": "character_id",
  "status": 1,
  "characterid": "player_character_id",
  "totaldamage": 1500,
  "selfheal": 300,
  "skillsused": 8,
  "type": "ranked"
}
```

**Parameters:**
- `opponent` (required): Opponent's character ID
- `status` (required): 1 for win, 0 for loss
- `characterid` (required): Player's character ID
- `type` (optional): "ranked" or "normal" (default: "normal")
- `totaldamage`, `selfheal`, `skillsused`: For quest/battlepass progress

**Response:**
```json
{
  "message": "success",
  "data": {
    "winner": "character_id",
    "mmrChange": 32,
    "matchType": "ranked"
  }
}
```

### 3. Get PvP Leaderboard
**GET** `/api/pvp/getpvpleaderboard`

**Query Parameters:**
- `page` (optional): Page number (default: 0)
- `limit` (optional): Results per page (default: 50, max: 100)
- `seasonid` (optional): Specific season ID (default: current active season)

**Response:**
```json
{
  "message": "success",
  "data": {
    "leaderboard": [
      {
        "position": 1,
        "character": {
          "id": "character_id",
          "username": "TopPlayer"
        },
        "mmr": 2150,
        "seasonBestMMR": 2200,
        "rank": {
          "_id": "rank_id",
          "name": "Diamond I",
          "icon": "diamond1.png"
        },
        "lastUpdated": "2024-01-15T10:30:00.000Z"
      }
    ],
    "season": {
      "id": "season_id",
      "name": "Season 3",
      "isActive": true
    },
    "pagination": {
      "currentPage": 0,
      "totalPages": 5,
      "totalPlayers": 250
    }
  }
}
```

### 4. Get PvP History (Enhanced)
**GET** `/api/pvp/getpvphistory`

**Query Parameters:**
- `characterid` (required): Character ID
- `page` (optional): Page number
- `limit` (optional): Results per page
- `datefilter` (optional): Filter by specific date

**Response:** Same format as before, but now includes match type

### 5. Get PvP History by Season
**GET** `/api/pvp/getpvphistorybyseason`

**Query Parameters:**
- `seasonid` (optional): Season ID
- `page`, `limit`, `datefilter`: Same as above

## Key Features

### Match Types
- **Normal Matches**: Casual games that don't affect MMR or ranking
- **Ranked Matches**: Competitive games that affect MMR, rankings, and season progress

### MMR System
- ELO-based rating system with dynamic K-factors
- Higher K-factor (64) for placement matches (first 10 ranked games)
- Standard K-factor (32) for regular matches
- Minimum MMR change of 1 point to prevent stagnation

### Season Tracking
- Current season MMR and rank
- Season best MMR and rank (highest achieved this season)
- All-time best MMR across all seasons

### Statistics
- Separate win/loss tracking for ranked and normal matches
- Automatic win rate calculations
- Total match statistics combining both types

## Migration

Run the migration script to update existing data:

```bash
node data/migrate-pvp-updates.js
```

This will:
1. Add `type: "normal"` to all existing PvP matches
2. Set `seasonBestMMR` and `seasonBestRank` based on current values
3. Initialize type-specific stats (assuming existing matches were normal)
4. Provide guidance on fixing owner references

## Usage Examples

### Starting a Ranked Match
```javascript
// Record ranked match result
const response = await fetch('/api/pvp/pvpmatchresult', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    opponent: 'opponent_character_id',
    status: 1, // Won
    characterid: 'player_character_id',
    type: 'ranked',
    totaldamage: 1200,
    selfheal: 150,
    skillsused: 6
  })
});
```

### Getting Comprehensive Stats
```javascript
// Get all stats for a character
const stats = await fetch('/api/pvp/getcharacterpvpstats?characterid=char_id');
const data = await stats.json();

console.log(`Current MMR: ${data.data.currentSeason.mmr}`);
console.log(`Season Best: ${data.data.seasonBest.mmr}`);
console.log(`Ranked Win Rate: ${data.data.rankedMatches.winRate}%`);
```

### Viewing Leaderboards
```javascript
// Get top 20 players for current season
const leaderboard = await fetch('/api/pvp/getpvpleaderboard?limit=20');
const data = await leaderboard.json();

data.data.leaderboard.forEach(player => {
  console.log(`#${player.position}: ${player.character.username} (${player.mmr} MMR)`);
});
```
