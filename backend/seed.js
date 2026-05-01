const db = require('./database');

db.serialize(() => {
  // Limpiar tablas para repoblar
  db.run('DELETE FROM transactions');
  db.run('DELETE FROM credit_lines');
  db.run('DELETE FROM accounts');

  // Insertar Cuentas
  const stmtAccounts = db.prepare('INSERT INTO accounts (id, name, balance) VALUES (?, ?, ?)');
  stmtAccounts.run(1, 'Alfonso', -5510.74); 
  stmtAccounts.run(2, 'Víctor', 5510.74);
  stmtAccounts.finalize();

  // Insertar Líneas de Crédito (Basado en el 22 de Abril de 2026)
  const stmtCards = db.prepare('INSERT INTO credit_lines (name, type, credit_limit, cut_day, payment_day, current_debt) VALUES (?, ?, ?, ?, ?, ?)');
  
  // Extraído del PDF
  stmtCards.run('NU', 'TDC', 12000, 22, 4, 1961.00);
  stmtCards.run('P P COPPEL', 'PRESTAMO', 56591, null, 16, 56591.00);
  stmtCards.run('INFONAVIT', 'SERVICIO', 150231.79, null, 10, 150231.79);
  stmtCards.run('KLAR', 'TDC', 6000, 1, 11, 3999.78);
  stmtCards.run('NETFLIX', 'SERVICIO', 0, null, null, 0);
  stmtCards.run('BBVA', 'TDC', 19400, 23, 13, 19399.14); // Ojo, saldo inicial era 0 pero la deuda total en PDF dice 19399.14? Wait, PDF says "PAGO PARA NO GENERAR INTERESES = $0.00" but "DEUDA TOTAL = $19399.14". 
  stmtCards.run('BANCOPPEL', 'TDC', 9350.37, 20, 16, 9350.37);
  stmtCards.run('STORY', 'TDC', 1000, 27, 18, 1000);
  stmtCards.run('ROPA COPPEL', 'TDC', 8412, null, 20, 0); // Total debt 8412, pago no generar int 765
  stmtCards.run('PLATA', 'TDC', 11500, null, 22, 11457.81);
  stmtCards.run('INVEX', 'TDC', 5500, 5, 27, 1026.32);
  stmtCards.run('TOTAL PLAY', 'SERVICIO', 0, null, 28, 0);
  stmtCards.run('SUBURBIA', 'TDC', 9000, null, 29, 4125.57);

  stmtCards.finalize();

  console.log('Base de datos poblada con éxito con los saldos al 22 de Abril de 2026.');
});

db.close();
