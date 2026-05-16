const db = require('./backend/database.js');

const ops = [
  {
    date: '2026-05-10T12:00:00.000Z',
    amount: 1000,
    sender_id: 1, // Alfonso
    receiver_id: 2, // Víctor
    concept: 'Pago restaurante',
    credit_line_id: null,
    is_salary: 0,
    interest_amount: 0
  },
  {
    date: '2026-05-13T12:00:00.000Z',
    amount: 19400,
    sender_id: 1, // Alfonso
    receiver_id: 2, // Víctor
    concept: 'Efectivo para pagar TDC BBVA',
    credit_line_id: 71, // BBVA
    is_salary: 0,
    interest_amount: 0
  },
  {
    date: '2026-05-13T12:05:00.000Z',
    amount: 50000,
    sender_id: 1, // Alfonso
    receiver_id: 2, // Víctor
    concept: 'Liquidación préstamo personal Bancoppel',
    credit_line_id: 67, // P P COPPEL
    is_salary: 0,
    interest_amount: 2162  // Solo referencia, NO afecta balances
  },
  {
    date: '2026-05-13T12:10:00.000Z',
    amount: 9000,
    sender_id: 2, // Víctor
    receiver_id: 1, // Alfonso
    concept: 'Pago con TDC BBVA a Alfonso',
    credit_line_id: null,
    is_salary: 0,
    interest_amount: 0
  }
];

db.serialize(() => {
  db.run('BEGIN TRANSACTION');

  ops.forEach(op => {
    db.run(
      'INSERT INTO transactions (date, amount, sender_id, receiver_id, concept, credit_line_id, is_salary, interest_amount) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [op.date, op.amount, op.sender_id, op.receiver_id, op.concept, op.credit_line_id, op.is_salary, op.interest_amount]
    );

    // Actualizar balances (intereses NO afectan balance, solo el monto principal)
    if (op.sender_id && op.receiver_id) {
       db.run('UPDATE accounts SET balance = balance - ? WHERE id = ?', [op.amount, op.sender_id]);
       db.run('UPDATE accounts SET balance = balance + ? WHERE id = ?', [op.amount, op.receiver_id]);
    }
  });

  // Actualizar deudas de líneas de crédito
  // Mov 2: BBVA (71) se liquida con $19,400 (deuda actual: $19,399.14)
  db.run('UPDATE credit_lines SET current_debt = MAX(0, current_debt - 19400) WHERE id = 71');
  // Mov 3: P P COPPEL (67) se liquida con $50,000 (deuda actual: $6,591)
  db.run('UPDATE credit_lines SET current_debt = MAX(0, current_debt - 50000) WHERE id = 67');
  // Mov 4: Víctor usó TDC BBVA → la deuda BBVA sube $9,000
  db.run('UPDATE credit_lines SET current_debt = current_debt + 9000 WHERE id = 71');

  db.run('COMMIT', (err) => {
    if (err) {
      console.error('Error:', err);
    } else {
      // Verificar resultados
      db.all('SELECT id, name, balance FROM accounts', (e, accounts) => {
        console.log('\n=== BALANCES ACTUALIZADOS ===');
        accounts.forEach(a => console.log(`  ${a.name}: $${a.balance.toLocaleString()}`));

        db.all('SELECT id, name, current_debt FROM credit_lines WHERE id IN (67, 71)', (e2, lines) => {
          console.log('\n=== DEUDAS ACTUALIZADAS ===');
          lines.forEach(l => console.log(`  ${l.name}: $${l.current_debt.toLocaleString()}`));
          console.log('\n✅ 4 operaciones registradas exitosamente.');
          process.exit(0);
        });
      });
    }
  });
});
