const express = require('express');
const cors = require('cors');
const db = require('./database');

const app = express();
app.use(cors());
app.use(express.json());

// Obtener Dashboard (Balance Global y Deudas)
app.get('/api/dashboard', (req, res) => {
  db.all('SELECT * FROM accounts', [], (err, accounts) => {
    if (err) return res.status(500).json({ error: err.message });
    
    db.get('SELECT SUM(current_debt) as total_debt FROM credit_lines', [], (err, row) => {
      if (err) return res.status(500).json({ error: err.message });
      
      res.json({
        accounts,
        totalDebt: row.total_debt
      });
    });
  });
});

// Obtener todas las tarjetas
app.get('/api/cards', (req, res) => {
  db.all('SELECT * FROM credit_lines ORDER BY payment_day ASC', [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

// Crear nueva tarjeta
app.post('/api/cards', (req, res) => {
  const { name, type, credit_limit, cut_day, payment_day, current_debt } = req.body;
  const stmt = db.prepare('INSERT INTO credit_lines (name, type, credit_limit, cut_day, payment_day, current_debt) VALUES (?, ?, ?, ?, ?, ?)');
  
  stmt.run([name, type, credit_limit || 0, cut_day || null, payment_day || null, current_debt || 0], function(err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ success: true, id: this.lastID });
  });
  stmt.finalize();
});

// Registrar nueva transacción
app.post('/api/transactions', (req, res) => {
  const { amount, sender_id, receiver_id, concept, credit_line_id, is_salary } = req.body;
  const date = new Date().toISOString();

  db.serialize(() => {
    db.run('BEGIN TRANSACTION');

    const stmt = db.prepare('INSERT INTO transactions (date, amount, sender_id, receiver_id, concept, credit_line_id, is_salary) VALUES (?, ?, ?, ?, ?, ?, ?)');
    stmt.run(date, amount, sender_id, receiver_id, concept, credit_line_id, is_salary ? 1 : 0);
    stmt.finalize();

    // Actualizar balance si es entre cuentas
    if (sender_id && receiver_id) {
       // El que envía resta, el que recibe suma
       db.run('UPDATE accounts SET balance = balance - ? WHERE id = ?', [amount, sender_id]);
       db.run('UPDATE accounts SET balance = balance + ? WHERE id = ?', [amount, receiver_id]);
    }

    db.run('COMMIT', (err) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ success: true, message: 'Transacción registrada' });
    });
  });
});

// Sugerencias de Tarjeta (Lógica Básica: tarjeta cuyo día de corte acaba de pasar)
app.get('/api/suggestions', (req, res) => {
  const today = new Date().getDate();
  // Buscamos tarjetas cuyo día de corte sea menor al día de hoy, y tomamos la que cortó más recientemente.
  // Si hoy es menor a todos los días de corte, buscamos el del mes anterior (el mayor de todos).
  db.all('SELECT * FROM credit_lines WHERE type = "TDC" AND cut_day IS NOT NULL', [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    
    if (rows.length === 0) return res.json(null);

    let bestCard = null;
    let minDiff = 31;

    rows.forEach(card => {
      let diff = today - card.cut_day;
      if (diff < 0) {
        // Cortó el mes pasado
        diff = diff + 30;
      }
      
      // Queremos la diferencia más cercana a 1 (acaba de cortar)
      if (diff >= 0 && diff < minDiff) {
        minDiff = diff;
        bestCard = card;
      }
    });

    res.json({ bestCard, daysSinceCut: minDiff });
  });
});

const PORT = 3001;
app.listen(PORT, () => {
  console.log(`Backend corriendo en http://localhost:${PORT}`);
});
