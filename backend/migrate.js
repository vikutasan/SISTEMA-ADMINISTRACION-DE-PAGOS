const db = require('./database');

db.serialize(() => {
  // Ignoramos errores si las columnas ya existen
  db.run("ALTER TABLE credit_lines ADD COLUMN periodicity TEXT DEFAULT 'MENSUAL'", (err) => {});
  db.run("ALTER TABLE credit_lines ADD COLUMN payment_no_interest REAL DEFAULT 0", (err) => {});
  db.run("ALTER TABLE credit_lines ADD COLUMN available_credit REAL DEFAULT 0", (err) => {});
  db.run("ALTER TABLE credit_lines ADD COLUMN liquidation_amount REAL DEFAULT 0", (err) => {});
  
  console.log('Migración completada.');
});

setTimeout(() => db.close(), 1000);
