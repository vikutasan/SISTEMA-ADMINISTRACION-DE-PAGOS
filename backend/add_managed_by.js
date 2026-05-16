const db = require('./database');

db.run("ALTER TABLE credit_lines ADD COLUMN managed_by TEXT DEFAULT 'alfonso'", (err) => {
  if (err) {
    console.log('Column may already exist:', err.message);
  } else {
    console.log('Column managed_by added successfully');
  }
  
  // Set all existing cards to 'alfonso' by default
  db.run("UPDATE credit_lines SET managed_by = 'alfonso' WHERE managed_by IS NULL", (err2) => {
    if (err2) console.log('Error updating:', err2.message);
    else console.log('All existing cards set to alfonso');
    process.exit();
  });
});
