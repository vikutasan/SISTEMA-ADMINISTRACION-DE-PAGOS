const sqlite3 = require('sqlite3').verbose();
const fs = require('fs');

const db = new sqlite3.Database('C:/Users/servidor1/.gemini/antigravity/scratch/gestor_pagos/backend/pagos.sqlite');

const getData = () => {
  return new Promise((resolve, reject) => {
    let data = {};
    db.serialize(() => {
      db.all("SELECT * FROM accounts", (err, rows) => {
        data.accounts = rows;
        db.all("SELECT * FROM credit_lines", (err, rows) => {
          data.creditLines = rows;
          db.all("SELECT * FROM transactions", (err, rows) => {
            data.transactions = rows;
            db.all("SELECT * FROM salaries", (err, rows) => {
              data.salaries = rows;
              resolve(data);
            });
          });
        });
      });
    });
  });
};

getData().then(data => {
  fs.writeFileSync('C:/Users/servidor1/.gemini/antigravity/scratch/gestor_pagos_mobile/db_dump.json', JSON.stringify(data, null, 2));
  console.log("Data extracted to db_dump.json");
});
