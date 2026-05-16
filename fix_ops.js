const db = require('./backend/database.js');

db.serialize(() => {
  // Fix #30: receiver was 2 (Victor) but should be 1 (Alfonso)
  // The original insert did Victor(2)->Victor(2), balance was: Victor -9000, Victor +9000 = net 0
  // Correct: Victor(2)->Alfonso(1), so we need to move the +9000 from Victor to Alfonso
  db.run('UPDATE transactions SET receiver_id = 1 WHERE id = 30');
  db.run('UPDATE accounts SET balance = balance - 9000 WHERE id = 2'); // Remove the wrongly added +9000 from Victor
  db.run('UPDATE accounts SET balance = balance + 9000 WHERE id = 1'); // Give the +9000 to Alfonso

  // Fix #29: concept was truncated, missing interest_amount
  db.run("UPDATE transactions SET concept = 'Liquidación préstamo personal Bancoppel', interest_amount = 2162 WHERE id = 29");

  // Verify
  db.all('SELECT id, concept, sender_id, receiver_id, amount, interest_amount FROM transactions WHERE id IN (29,30)', (e, r) => {
    console.log('=== TRANSACCIONES CORREGIDAS ===');
    r.forEach(t => console.log(t));

    db.all('SELECT id, name, balance FROM accounts', (e2, a) => {
      console.log('\n=== BALANCES ===');
      a.forEach(x => console.log(`  ${x.name}: $${x.balance.toLocaleString()}`));
      process.exit();
    });
  });
});
