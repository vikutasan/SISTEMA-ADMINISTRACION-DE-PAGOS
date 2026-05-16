const db = require('./backend/database.js');

db.serialize(() => {
  // Give each May 13 transaction a slightly different time to preserve order
  db.run("UPDATE transactions SET date = '2026-05-13T12:00:00.000Z' WHERE id = 28"); // #2 first
  db.run("UPDATE transactions SET date = '2026-05-13T12:05:00.000Z' WHERE id = 29"); // #3 second
  db.run("UPDATE transactions SET date = '2026-05-13T12:10:00.000Z' WHERE id = 30"); // #4 third

  db.all('SELECT id, date, concept FROM transactions WHERE id >= 27 ORDER BY id', (e, r) => {
    r.forEach(t => console.log(t.id, t.date, t.concept));
    process.exit();
  });
});
