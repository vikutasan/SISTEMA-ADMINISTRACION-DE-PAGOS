const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.resolve(__dirname, 'pagos.sqlite');
const db = new sqlite3.Database(dbPath);

db.serialize(() => {
  // Encontrar la transacción del 2 de mayo por $52,162
  db.all("SELECT * FROM transactions WHERE amount = 52162", [], (err, trans) => {
    if (err) console.error(err);
    console.log("Transacciones encontradas:", trans);
    
    // Encontrar ID del préstamo bancoppel
    db.all("SELECT id, name FROM credit_lines WHERE name LIKE '%Bancoppel%'", [], (err, lines) => {
      if (err) console.error(err);
      console.log("Tarjetas encontradas:", lines);
      
      const bancoppelId = lines.length > 0 ? lines[0].id : null;
      
      if (trans.length > 0) {
        const targetId = trans[0].id;
        console.log(`Actualizando transaccion ID ${targetId} con credit_line_id ${bancoppelId}`);
        
        db.run(`UPDATE transactions SET amount = 50000, interest_amount = 2162, credit_line_id = ? WHERE id = ?`, [bancoppelId, targetId], function(err) {
          if (err) console.error(err);
          console.log(`Filas actualizadas: ${this.changes}`);
          
          // Actualizar la cuenta de Alfonso porque se redujo el amount en 2162 (pasó de 52162 a 50000)
          // La transacción original le restó 52162 (a su favor). Ahora debería ser solo 50000.
          // Por lo que debemos sumarle 2162 a su balance para corregirlo.
          db.run(`UPDATE accounts SET balance = balance + 2162 WHERE id = 1`, function(err) {
             if (err) console.error(err);
             console.log(`Balance de Alfonso corregido`);
          });
        });
      }
    });
  });
});
