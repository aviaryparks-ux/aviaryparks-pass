const fs = require('fs');
const lines = fs.readFileSync('src/app/admin/page.tsx', 'utf-8').split('\n');
lines.forEach((l, i) => {
  if (l.includes('fetchMembers') || l.includes('setUsers(')) {
    console.log(`Line ${i+1}: ${l}`);
  }
});
