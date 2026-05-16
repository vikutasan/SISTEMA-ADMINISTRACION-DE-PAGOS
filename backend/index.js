const express = require('express');
const cors = require('cors');
const db = require('./database');

const app = express();
app.use(cors());
app.use(express.json());

// Obtener Dashboard - Estado Global
app.get('/api/dashboard', (req, res) => {
  const data = {
    accounts: [],
    totalDebt: 0
  };

  // Calcular balance neto desde transacciones
  db.all('SELECT * FROM transactions', [], (err, trans) => {
    if (err) return res.status(500).json({ error: err.message });

    let alfonsoBalance = 0;
    let victorBalance = 0;

    trans.forEach(t => {
      if (t.sender_id === 1) alfonsoBalance -= t.amount;
      if (t.receiver_id === 1) alfonsoBalance += t.amount;
      if (t.sender_id === 2) victorBalance -= t.amount;
      if (t.receiver_id === 2) victorBalance += t.amount;
    });

    db.all('SELECT current_debt FROM credit_lines', [], (err, lines) => {
      if (err) return res.status(500).json({ error: err.message });
      data.totalDebt = lines.reduce((acc, curr) => acc + (curr.current_debt || 0), 0);
      
      // Integrar semanalidades según regla de usuario
      db.all('SELECT * FROM salaries', [], (err, sals) => {
        if (err) return res.status(500).json({ error: err.message });
        
        sals.forEach(s => {
          // Ignorar Semana 11 y anteriores por acuerdo de saldo "a mano"
          if (s.week_number <= 11) return;

          if (s.status === 'PENDIENTE') {
            // Aportación de Víctor
            victorBalance -= (s.amount || 5000);
          } else if (s.status === 'PAGADO') {
            // Aportación de Alfonso
            alfonsoBalance -= (s.amount || 5000);
          }
        });

        data.accounts = [
          { id: 1, name: 'Alfonso', balance: alfonsoBalance },
          { id: 2, name: 'Víctor', balance: victorBalance }
        ];

        res.json(data);
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
  const { 
    name, type, periodicity, credit_limit, cut_day, payment_day, 
    current_debt, payment_no_interest, available_credit, liquidation_amount 
  } = req.body;
  const stmt = db.prepare(`
    INSERT INTO credit_lines 
    (name, type, periodicity, credit_limit, cut_day, payment_day, current_debt, payment_no_interest, available_credit, liquidation_amount) 
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  
  stmt.run(
    [
      name, type, periodicity || 'MENSUAL', credit_limit || 0, cut_day || null, payment_day || null, 
      current_debt || 0, payment_no_interest || 0, available_credit || 0, liquidation_amount || 0
    ], 
    function(err) {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ success: true, id: this.lastID });
    }
  );
  stmt.finalize();
});

// Actualizar tarjeta existente
app.put('/api/cards/:id', (req, res) => {
  const { id } = req.params;
  const { 
    name, type, periodicity, credit_limit, cut_day, payment_day, 
    current_debt, payment_no_interest, available_credit, liquidation_amount 
  } = req.body;

  const stmt = db.prepare(`
    UPDATE credit_lines SET 
      name = ?, type = ?, periodicity = ?, credit_limit = ?, cut_day = ?, 
      payment_day = ?, current_debt = ?, payment_no_interest = ?, 
      available_credit = ?, liquidation_amount = ?
    WHERE id = ?
  `);

  stmt.run(
    [
      name, type, periodicity || 'MENSUAL', credit_limit || 0, cut_day || null, payment_day || null, 
      current_debt || 0, payment_no_interest || 0, available_credit || 0, liquidation_amount || 0,
      id
    ],
    function(err) {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ success: true });
    }
  );
  stmt.finalize();
});

// Obtener todas las transacciones
app.get('/api/transactions', (req, res) => {
  db.all('SELECT * FROM transactions ORDER BY date DESC', [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

// Registrar nueva transacción
app.post('/api/transactions', (req, res) => {
  const { amount, sender_id, receiver_id, concept, credit_line_id, is_salary, interest_amount, date: customDate } = req.body;
  
  // Si el usuario envía una fecha manual, la respetamos. Si no, tomamos la fecha actual.
  let date = new Date().toISOString();
  if (customDate) {
    const d = new Date(customDate);
    // Para evitar desfase de huso horario al seleccionar YYYY-MM-DD
    d.setMinutes(d.getMinutes() + d.getTimezoneOffset());
    date = d.toISOString();
  }

  db.serialize(() => {
    db.run('BEGIN TRANSACTION');

    const stmt = db.prepare('INSERT INTO transactions (date, amount, sender_id, receiver_id, concept, credit_line_id, is_salary, interest_amount) VALUES (?, ?, ?, ?, ?, ?, ?, ?)');
    stmt.run(date, amount, sender_id, receiver_id, concept, credit_line_id, is_salary ? 1 : 0, interest_amount || 0);
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

// Actualizar transacción existente
app.put('/api/transactions/:id', (req, res) => {
  const { id } = req.params;
  const { amount, sender_id, receiver_id, concept, credit_line_id, is_salary, interest_amount, date: customDate } = req.body;

  let date = null;
  if (customDate) {
    const d = new Date(customDate);
    d.setMinutes(d.getMinutes() + d.getTimezoneOffset());
    date = d.toISOString();
  }

  db.serialize(() => {
    db.run('BEGIN TRANSACTION');

    // 1. Obtener transacción original
    db.get('SELECT * FROM transactions WHERE id = ?', [id], (err, oldTx) => {
      if (err) {
        db.run('ROLLBACK');
        return res.status(500).json({ error: err.message });
      }
      if (!oldTx) {
        db.run('ROLLBACK');
        return res.status(404).json({ error: 'Transacción no encontrada' });
      }

      // 2. Revertir impacto anterior en accounts
      if (oldTx.sender_id && oldTx.receiver_id) {
        db.run('UPDATE accounts SET balance = balance + ? WHERE id = ?', [oldTx.amount, oldTx.sender_id]);
        db.run('UPDATE accounts SET balance = balance - ? WHERE id = ?', [oldTx.amount, oldTx.receiver_id]);
      }

      // 3. Actualizar la transacción
      const newDate = date || oldTx.date;
      const stmt = db.prepare(`
        UPDATE transactions SET 
          date = ?, amount = ?, sender_id = ?, receiver_id = ?, concept = ?, 
          credit_line_id = ?, is_salary = ?, interest_amount = ?
        WHERE id = ?
      `);
      stmt.run(newDate, amount, sender_id, receiver_id, concept, credit_line_id, is_salary ? 1 : 0, interest_amount || 0, id);
      stmt.finalize();

      // 4. Aplicar nuevo impacto en accounts
      if (sender_id && receiver_id) {
        db.run('UPDATE accounts SET balance = balance - ? WHERE id = ?', [amount, sender_id]);
        db.run('UPDATE accounts SET balance = balance + ? WHERE id = ?', [amount, receiver_id]);
      }

      db.run('COMMIT', (err) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ success: true, message: 'Transacción actualizada' });
      });
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

// --- NUEVOS ENDPOINTS PARA SEMANALIDADES ---

// Obtener semanalidades con generación automática
app.get('/api/salaries', (req, res) => {
  db.all('SELECT * FROM salaries ORDER BY week_number DESC', [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    
    const today = new Date();
    // Encontrar el último jueves (o el de hoy si es jueves)
    const lastThursday = new Date();
    lastThursday.setDate(today.getDate() - ((today.getDay() + 3) % 7));
    lastThursday.setHours(0, 0, 0, 0);

    const lastEntryDate = rows.length > 0 ? new Date(rows[0].date) : new Date('2026-03-04');
    const lastWeekNum = rows.length > 0 ? rows[0].week_number : 10;

    // Si el último jueves es posterior a la última entrada, generamos
    if (lastThursday > lastEntryDate) {
      const diffTime = lastThursday - lastEntryDate;
      const weeksToGenerate = Math.floor(diffTime / (1000 * 60 * 60 * 24 * 7));

      if (weeksToGenerate > 0) {
        let currentWeek = lastWeekNum;
        let currentDate = new Date(lastEntryDate);
        
        const generate = (i) => {
          if (i > weeksToGenerate) {
             return db.all('SELECT * FROM salaries ORDER BY week_number DESC', [], (err, newRows) => {
               res.json(newRows);
             });
          }
          currentWeek++;
          currentDate.setDate(currentDate.getDate() + 7);
          const dateStr = currentDate.toISOString().split('T')[0];
          db.run('INSERT INTO salaries (week_number, date, status) VALUES (?, ?, ?)', [currentWeek, dateStr, 'PENDIENTE'], () => {
            generate(i + 1);
          });
        };
        generate(1);
      } else {
        res.json(rows);
      }
    } else {
      res.json(rows);
    }
  });
});

// Actualizar estatus de semanalidad
app.put('/api/salaries/:id', (req, res) => {
  const { id } = req.params;
  const { status } = req.body;
  db.run('UPDATE salaries SET status = ? WHERE id = ?', [status, id], (err) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ success: true });
  });
});

// Sincronizar Ficha desde Excel
app.put('/api/cards/:id/sync', (req, res) => {
  const { id } = req.params;
  const { metadata } = req.body;
  
  if (!metadata) return res.status(400).json({ error: 'Metadata is required' });

  let updateFields = [];
  let params = [];
  
  if (metadata.current_debt !== undefined && metadata.current_debt !== '') {
    updateFields.push('current_debt = ?');
    params.push(metadata.current_debt);
  }
  
  if (metadata.payment_no_interest !== undefined && metadata.payment_no_interest !== '') {
    updateFields.push('payment_no_interest = ?');
    params.push(metadata.payment_no_interest);
  }

  if (updateFields.length === 0) {
    return res.json({ message: 'No valid data to update' });
  }

  params.push(id);
  const sql = `UPDATE credit_lines SET ${updateFields.join(', ')} WHERE id = ?`;

  db.run(sql, params, function(err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ updated: this.changes });
  });
});

const PORT = 3001;
app.listen(PORT, () => {
  console.log(`Backend corriendo en http://localhost:${PORT}`);
});
