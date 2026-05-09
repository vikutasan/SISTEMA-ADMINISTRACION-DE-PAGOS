const db = require('./backend/database.js');

const ops = [
  {
    date: '2026-05-08T12:00:00.000Z',
    amount: 50000,
    sender_id: 1, // Alfonso
    receiver_id: 2, // Victor
    concept: 'Liquidación préstamo personal Bancoppel',
    credit_line_id: 67, // P P COPPEL
    is_salary: 0,
    interest_amount: 2162
  },
  {
    date: '2026-05-08T12:05:00.000Z',
    amount: 50000,
    sender_id: 2, // Victor
    receiver_id: 1, // Alfonso
    concept: 'Efectivo de Victor a Alfonso',
    credit_line_id: null,
    is_salary: 0,
    interest_amount: 0
  },
  {
    date: '2026-05-08T12:10:00.000Z',
    amount: 1500,
    sender_id: 1, // Alfonso
    receiver_id: 2, // Victor
    concept: 'Transferencia para pagar TDC INVEX WALMART',
    credit_line_id: 76, // INVEX
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

    if (op.sender_id && op.receiver_id) {
       db.run('UPDATE accounts SET balance = balance - ? WHERE id = ?', [op.amount, op.sender_id]);
       db.run('UPDATE accounts SET balance = balance + ? WHERE id = ?', [op.amount, op.receiver_id]);
    }
  });

  // Actualizar deudas de las líneas de crédito
  db.run('UPDATE credit_lines SET current_debt = MAX(0, current_debt - 50000) WHERE id = 67');
  db.run('UPDATE credit_lines SET current_debt = MAX(0, current_debt - 1500) WHERE id = 76');

  db.run('COMMIT', (err) => {
    if (err) {
      console.error('Error:', err);
    } else {
      console.log('3 operaciones registradas exitosamente.');
      process.exit(0);
    }
  });
});
