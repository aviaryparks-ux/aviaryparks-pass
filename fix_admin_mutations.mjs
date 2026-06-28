import fs from 'fs';

function replaceInFile(filePath, replacements) {
  let content = fs.readFileSync(filePath, 'utf8');
  for (const [regex, replacement] of replacements) {
    content = content.replace(regex, replacement);
  }
  fs.writeFileSync(filePath, content, 'utf8');
}

replaceInFile('src/app/admin/page.tsx', [
  [
    /const \{ error \} = await supabase\.from\('events'\)\.insert\(\[\{ \.\.\.newEvent, image_url: finalImageUrl \}\]\);/g,
    `const res = await fetch('/api/admin/events', { method: 'POST', body: JSON.stringify({ ...newEvent, image_url: finalImageUrl }) });
      const json = await res.json();
      const error = json.error ? new Error(json.error) : null;`
  ],
  [
    /await supabase\.from\('events'\)\.update\(\{ status: newStatus \}\)\.eq\('id', id\);/g,
    `await fetch('/api/admin/events', { method: 'PUT', body: JSON.stringify({ id, status: newStatus }) });`
  ],
  [
    /const \{ error \} = await supabase\.from\('schedules'\)\.update\(\{ \.\.\.newSchedule, image_url: finalImageUrl \}\)\.eq\('id', editingScheduleId\);/g,
    `const res = await fetch('/api/admin/schedules', { method: 'PUT', body: JSON.stringify({ id: editingScheduleId, ...newSchedule, image_url: finalImageUrl }) });
        const json = await res.json();
        const error = json.error ? new Error(json.error) : null;`
  ],
  [
    /const \{ error \} = await supabase\.from\('schedules'\)\.insert\(\[\{ \.\.\.newSchedule, image_url: finalImageUrl \}\]\);/g,
    `const res = await fetch('/api/admin/schedules', { method: 'POST', body: JSON.stringify({ ...newSchedule, image_url: finalImageUrl }) });
        const json = await res.json();
        const error = json.error ? new Error(json.error) : null;`
  ],
  [
    /await supabase\.from\('schedules'\)\.delete\(\)\.eq\('id', id\);/g,
    `await fetch('/api/admin/schedules?id=' + id, { method: 'DELETE' });`
  ],
  [
    /await supabase\.from\('schedules'\)\.update\(\{ status: newStatus \}\)\.eq\('id', id\);/g,
    `await fetch('/api/admin/schedules', { method: 'PUT', body: JSON.stringify({ id, status: newStatus }) });`
  ],
  [
    /const \{ error \} = await supabase\.from\('events'\)\.delete\(\)\.eq\('id', id\);/g,
    `const res = await fetch('/api/admin/events?id=' + id, { method: 'DELETE' });
    const json = await res.json();
    const error = json.error ? new Error(json.error) : null;`
  ],
  [
    /const \{ error \} = await supabase\.from\('system_users'\)\.insert\(\[\{\s+name: newAdminName,\s+email: newAdminEmail,\s+password: newAdminPassword,\s+role: 'ADMIN'\s+\}\]\);/g,
    `const res = await fetch('/api/admin/system_users', {
      method: 'POST',
      body: JSON.stringify({ name: newAdminName, email: newAdminEmail, password: newAdminPassword, role: 'ADMIN' })
    });
    const json = await res.json();
    const error = json.error ? new Error(json.error) : null;`
  ],
  [
    /const \{ error \} = await supabase\.from\('system_users'\)\.delete\(\)\.eq\('id', id\);/g,
    `const res = await fetch('/api/admin/system_users?id=' + id, { method: 'DELETE' });
    const json = await res.json();
    const error = json.error ? new Error(json.error) : null;`
  ]
]);

console.log('Admin mutations fixed.');
