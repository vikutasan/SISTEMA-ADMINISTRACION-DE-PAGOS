const db = require('./database');

db.serialize(() => {
  // Limpiar tablas para repoblar
  db.run('DELETE FROM transactions');
  db.run('DELETE FROM credit_lines');
  db.run('DELETE FROM accounts');
  db.run('DELETE FROM salaries');

  // Insertar Cuentas (Empezamos en 0 para que las transacciones calculen el balance real)
  const stmtAccounts = db.prepare('INSERT INTO accounts (id, name, balance) VALUES (?, ?, ?)');
  stmtAccounts.run(1, 'Alfonso', 0); 
  stmtAccounts.run(2, 'Víctor', 0);
  stmtAccounts.finalize();

  // Insertar Transacciones Históricas (Alfonso -> Víctor)
  const stmtTrans = db.prepare('INSERT INTO transactions (date, amount, sender_id, receiver_id, concept) VALUES (?, ?, ?, ?, ?)');
  
  // Aportaciones Alfonso
  stmtTrans.run('2026-03-16 12:00:00', 9900.00, 1, 2, 'Pago TDC Bancoppel');
  stmtTrans.run('2026-03-17 12:00:00', 19700.00, 1, 2, 'Efectivo para TDC BBVA');
  stmtTrans.run('2026-03-28 12:00:00', 5000.00, 1, 2, 'Préstamo Suburbia y otras');
  stmtTrans.run('2026-04-13 12:00:00', 9000.00, 1, 2, 'Efectivo BBVA y Bancoppel');
  stmtTrans.run('2026-04-25 12:00:00', 50860.00, 1, 2, 'Liquidación deuda Coppel');
  stmtTrans.run('2026-04-26 12:00:00', 1500.00, 1, 2, 'Efectivo para Erika');

  // Aportaciones Víctor
  stmtTrans.run('2026-04-14 12:00:00', 6250.00, 2, 1, 'Pago en efectivo');
  stmtTrans.run('2026-04-18 12:00:00', 631.26, 2, 1, 'Pedidos equipo Amazon');
  stmtTrans.run('2026-04-25 15:00:00', 50000.00, 2, 1, 'Nuevo Préstamo Coppel (Efec.)');

  stmtTrans.finalize();

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

  // Insertar Semanalidades de Víctor
  const stmtSalaries = db.prepare('INSERT INTO salaries (week_number, date, status) VALUES (?, ?, ?)');
  stmtSalaries.run(11, '2026-03-11', 'PAGADO');
  stmtSalaries.run(12, '2026-03-19', 'PENDIENTE');
  stmtSalaries.run(13, '2026-03-26', 'PENDIENTE');
  stmtSalaries.run(14, '2026-04-02', 'PENDIENTE');
  stmtSalaries.run(15, '2026-04-09', 'PENDIENTE');
  stmtSalaries.run(16, '2026-04-16', 'PENDIENTE');
  stmtSalaries.run(17, '2026-04-23', 'PENDIENTE');
  stmtSalaries.run(18, '2026-04-30', 'PENDIENTE');
  stmtSalaries.finalize();

  console.log('Base de datos poblada con éxito con los saldos al 2 de Mayo de 2026.');
});

db.close();
