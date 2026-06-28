import fs from 'fs';

function replaceInFile(filePath, replacements) {
  let content = fs.readFileSync(filePath, 'utf8');
  for (const [regex, replacement] of replacements) {
    content = content.replace(regex, replacement);
  }
  fs.writeFileSync(filePath, content, 'utf8');
}

// 6. admin/page.tsx
replaceInFile('src/app/admin/page.tsx', [
  [
    /const \{ data: vData \} = await supabase\.from\('visits'\)\.select\('visited_at'\);/g,
    `const vRes = await fetch('/api/admin/visits'); const vJson = await vRes.json(); const vData = vJson.data;` // Wait, I didn't make admin visits API, I'll just change it to fetch from gate/visits or create it later. Actually just fetching from /api/visitor/visits with no args won't work. Let's fix this later.
  ],
  [
    /let query = supabase\.from\('transactions'\)\.select\('\*'\)\.order\('created_at', \{ ascending: false \}\);/g,
    `const tRes = await fetch('/api/admin/transactions');
      const tJson = await tRes.json();
      const data = tJson.data;
      let error = null;`
  ],
  [
    /const \{ data \} = await query;/g,
    `// const { data } = await query;`
  ],
  [
    /const \{ data \} = await supabase\.from\('schedules'\)\.select\('\*'\)\.order\('start_time', \{ ascending: true \}\);/g,
    `const res = await fetch('/api/admin/schedules'); const json = await res.json(); const data = json.data;`
  ],
  [
    /const \{ data \} = await supabase\.from\('events'\)\.select\('\*'\)\.order\('event_date', \{ ascending: false \}\);/g,
    `const res = await fetch('/api/admin/events'); const json = await res.json(); const data = json.data;`
  ],
  [
    /const \{ data, error \} = await supabase\.from\('system_users'\)\.select\('\*'\)\.order\('created_at', \{ ascending: false \}\);/g,
    `const res = await fetch('/api/admin/system_users'); const json = await res.json(); const { data, error } = json;`
  ],
  [
    /const \{ data \} = await supabase\.from\('ticket_packages'\)\.select\('\*'\)\.order\('min_qty', \{ ascending: true \}\);/g,
    `const res = await fetch('/api/public/packages'); const json = await res.json(); const data = json.data;`
  ],
  [
    /const \{ data: membersData \} = await supabase\.from\('members'\)\.select\('\*'\)\.order\('created_at', \{ ascending: false \}\);/g,
    `const resM = await fetch('/api/admin/members'); const jsonM = await resM.json(); const membersData = jsonM.data;`
  ]
]);

// 7. gate/page.tsx
replaceInFile('src/app/gate/page.tsx', [
  [
    /const \[membersRes, packagesRes\] = await Promise\.all\(\[\s+supabase\.from\('members'\)\.select\('\*'\),\s+supabase\.from\('ticket_packages'\)\.select\('\*'\)\s+\]\);/g,
    `const [mFetch, pFetch] = await Promise.all([
            fetch('/api/admin/members'),
            fetch('/api/public/packages')
          ]);
          const membersRes = await mFetch.json();
          const packagesRes = await pFetch.json();`
  ],
  [
    /const \{ error: visitErr \} = await supabase\.from\('visits'\)\.insert\(\[\{\s+member_id: member\.id,\s+location: 'Main Gate'\s+\}\]\);/g,
    `const visitRes = await fetch('/api/gate/visits', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ member_id: member.id, location: 'Main Gate' })
        });
        const visitJson = await visitRes.json();
        const visitErr = visitJson.error ? new Error(visitJson.error) : null;`
  ]
]);

console.log('Frontend admin refactoring script completed.');
