const fs = require('fs');
const file = 'C:/Users/servidor1/.gemini/antigravity/scratch/gestor_pagos/frontend/src/App.jsx';
let content = fs.readFileSync(file, 'utf8');

// The replacement: Replace strings like 'http://localhost:3001/api/dashboard' 
// with \`http://\${window.location.hostname}:3001/api/dashboard\`
content = content.replace(/'http:\/\/localhost:3001([^']+)'/g, '`http://${window.location.hostname}:3001$1`');

fs.writeFileSync(file, content);
