const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.resolve(__dirname, 'pagos.sqlite');
const db = new sqlite3.Database(dbPath);

db.serialize(() => {
  db.run(`ALTER TABLE transactions ADD COLUMN interest_amount REAL DEFAULT 0`, (err) => {
    if (err) {
      if (err.message.includes('duplicate column name')) {
        console.log('Column interest_amount already exists. Skipping.');
      } else {
        console.error('Migration failed:', err.message);
      }
    } else {
      console.log('Migration successful: added interest_amount to transactions.');
    }
  });
});

db.close();
