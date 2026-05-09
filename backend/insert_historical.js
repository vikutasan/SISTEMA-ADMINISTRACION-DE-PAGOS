const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('pagos.sqlite');

const transactions = [
  {
    date: '2026-05-03T12:00:00.000Z',
    amount: 1100,
    sender_id: 1, // Alfonso
    receiver_id: 2, // Víctor
    concept: 'PAGO DE TDC NU Y COMPRAS EN SAMS',
    credit_line_id: 66, // NU
    is_salary: 0,
    interest_amount: 0
  },
  {
    date: '2026-05-04T12:00:00.000Z',
    amount: 126,
    sender_id: 1, // Alfonso
    receiver_id: 2, // Víctor
    concept: 'COMPLETAR PAGO TDC NU',
    credit_line_id: 66, // NU
    is_salary: 0,
    interest_amount: 0
  }
];

db.serialize(() => {
  db.run('BEGIN TRANSACTION');

  const stmt = db.prepare('INSERT INTO transactions (date, amount, sender_id, receiver_id, concept, credit_line_id, is_salary, interest_amount) VALUES (?, ?, ?, ?, ?, ?, ?, ?)');
  
  transactions.forEach(t => {
    stmt.run(t.date, t.amount, t.sender_id, t.receiver_id, t.concept, t.credit_line_id, t.is_salary, t.interest_amount);
    
    // El que envía resta, el que recibe suma
    if (t.sender_id && t.receiver_id) {
       db.run('UPDATE accounts SET balance = balance - ? WHERE id = ?', [t.amount, t.sender_id]);
       db.run('UPDATE accounts SET balance = balance + ? WHERE id = ?', [t.amount, t.receiver_id]);
    }
  });

  stmt.finalize();

  db.run('COMMIT', (err) => {
    if (err) {
      console.error("Error:", err.message);
    } else {
      console.log("Transacciones históricas insertadas correctamente.");
    }
  });
});
