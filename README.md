# Quote Generator with History

Fetches random quotes from a public API (DummyJSON), falls back to local data if the API fails, and saves favorites to MongoDB.

**Stack:** Node.js, Express, MongoDB (Mongoose), vanilla JS

## Run locally
1. `npm install`
2. Copy `.env.example` to `.env` and set `MONGODB_URI`
3. `npm start` and open http://localhost:3000

## Features
- Random quote from external API with 5s timeout and offline fallback (`data/fallback-quotes.json`)
- Save, list, search and remove favorites (stored in MongoDB, duplicates blocked)
- Copy to clipboard for the current quote and for any favorite

## API
| Method | Path | Purpose |
|---|---|---|
| GET | `/api/quote` | Random quote (`source`: `api` or `fallback`) |
| GET | `/api/favorites?search=` | List / filter favorites |
| POST | `/api/favorites` | Save `{text, author}` |
| DELETE | `/api/favorites/:id` | Remove a favorite |

## Deploy (Render + MongoDB Atlas)
Build command `npm install`, start command `npm start`, environment variable `MONGODB_URI` = your Atlas string.
