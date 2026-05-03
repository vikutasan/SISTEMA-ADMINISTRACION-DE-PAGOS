const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.resolve(__dirname, 'pagos.sqlite');
const db = new sqlite3.Database(dbPath);

db.serialize(() => {
  // Encontrar todas las líneas de crédito para ver cuáles existen
  db.all("SELECT id, name, type FROM credit_lines", [], (err, lines) => {
    if (err) console.error(err);
    console.log("Todas las fichas disponibles:");
    console.log(lines);
    
    // Buscar la que coincida con "Coppel" pero que no sea "Bancoppel" o fijarnos bien en los nombres.
    const coppelLines = lines.filter(l => l.name.toLowerCase().includes('coppel') && !l.name.toLowerCase().includes('ban'));
    console.log("Coincidencias probables para 'Prestamo departamental Coppel':", coppelLines);
    
    if (coppelLines.length > 0) {
      const coppelId = coppelLines[0].id;
      // Actualizar la transacción (sabemos que es la de amount = 50000 e interest_amount = 2162)
      db.run(`UPDATE transactions SET credit_line_id = ? WHERE amount = 50000 AND interest_amount = 2162`, [coppelId], function(err) {
        if (err) console.error(err);
        console.log(`Transacción corregida, vinculada al ID: ${coppelId} (${coppelLines[0].name})`);
      });
    } else {
      console.log("No se encontró ninguna ficha de Coppel. Tal vez el nombre sea otro.");
    }
  });
});
