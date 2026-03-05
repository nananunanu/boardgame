// database.js
const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./game.db');

db.serialize(() => {
    // nickname TEXT 컬럼을 추가했습니다.
    db.run(`CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE,
        nickname TEXT, 
        password TEXT,
        game_money INTEGER DEFAULT 1000
    )`);
});

module.exports = db;