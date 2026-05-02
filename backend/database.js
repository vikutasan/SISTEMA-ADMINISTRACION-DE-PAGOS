const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.resolve(__dirname, 'pagos.sqlite');
const db = new sqlite3.Database(dbPath);

db.serialize(() => {
  // Tabla de Cuentas (Alfonso y Víctor)
  db.run(`
    CREATE TABLE IF NOT EXISTS accounts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      balance REAL DEFAULT 0 -- Balance global (Positivo = a favor, Negativo = en contra)
    )
  `);

  // Tabla de Líneas de Crédito
  db.run(`
    CREATE TABLE IF NOT EXISTS credit_lines (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      type TEXT NOT NULL, -- 'TDC', 'PRESTAMO', 'SERVICIO', 'CREDITO DEPARTAMENTAL', 'PRESTAMO DEPARTAMENTAL'
      periodicity TEXT DEFAULT 'MENSUAL', -- 'SEMANAL', 'MENSUAL'
      credit_limit REAL DEFAULT 0,
      cut_day INTEGER, -- Día del mes que corta (1-31)
      payment_day INTEGER, -- Día del mes límite de pago (1-31)
      current_debt REAL DEFAULT 0,
      payment_no_interest REAL DEFAULT 0,
      available_credit REAL DEFAULT 0,
      liquidation_amount REAL DEFAULT 0
    )
  `);

  // Tabla de Transacciones
  db.run(`
    CREATE TABLE IF NOT EXISTS transactions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      date TEXT NOT NULL, -- YYYY-MM-DD HH:MM:SS
      amount REAL NOT NULL,
      sender_id INTEGER, -- Puede ser null si es un pago a un tercero
      receiver_id INTEGER, -- Puede ser null si es un pago a un tercero
      concept TEXT,
      credit_line_id INTEGER, -- Si la transacción involucra una tarjeta/préstamo
      is_salary BOOLEAN DEFAULT 0,
      FOREIGN KEY(sender_id) REFERENCES accounts(id),
      FOREIGN KEY(receiver_id) REFERENCES accounts(id),
      FOREIGN KEY(credit_line_id) REFERENCES credit_lines(id)
    )
  `);

  // Tabla de Semanalidades de Víctor
  db.run(`
    CREATE TABLE IF NOT EXISTS salaries (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      week_number INTEGER NOT NULL,
      date TEXT NOT NULL, -- Fecha del jueves correspondiente
      amount REAL DEFAULT 5000,
      status TEXT DEFAULT 'PENDIENTE' -- 'PENDIENTE', 'PAGADO'
    )
  `);
});

module.exports = db;
