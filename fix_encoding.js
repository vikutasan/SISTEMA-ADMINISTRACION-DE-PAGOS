const db = require('./backend/database.js');

db.serialize(() => {
  db.run("UPDATE transactions SET concept = 'Liquidación Préstamo Bancoppel (Total)' WHERE id = 19");
  db.run("UPDATE transactions SET concept = 'Nuevo Préstamo Bancoppel (Efectivo)' WHERE id = 20");

  db.all('SELECT id, concept FROM transactions WHERE id IN (19, 20)', (e, r) => {
    console.log('=== CORREGIDOS ===');
    r.forEach(t => console.log(t.id, t.concept));
    process.exit();
  });
});
