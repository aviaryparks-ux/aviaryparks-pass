import fs from 'fs';
import path from 'path';

function replaceInFile(filePath, replacements) {
  let content = fs.readFileSync(filePath, 'utf8');
  for (const [regex, replacement] of replacements) {
    content = content.replace(regex, replacement);
  }
  fs.writeFileSync(filePath, content, 'utf8');
}

// 1. register/page.tsx
replaceInFile('src/app/register/page.tsx', [
  [
    /const \{ data \} = await supabase\.from\('ticket_packages'\)\.select\('\*'\)\.eq\('is_active', true\)\.order\('min_qty', \{ ascending: true \}\);/g,
    `const res = await fetch('/api/public/packages');
      const json = await res.json();
      const data = json.data;`
  ]
]);

// 2. add-member/page.tsx
replaceInFile('src/app/add-member/page.tsx', [
  [
    /const \{ error \} = await supabase\.from\('members'\)\.insert\(membersToInsert\);/g,
    `const res = await fetch('/api/visitor/members', { method: 'POST', body: JSON.stringify(membersToInsert) });
      const json = await res.json();
      const error = json.error ? new Error(json.error) : null;`
  ]
]);

// 3. dashboard/page.tsx (Needs custom handling, fetch by group_id and visits by member_ids)
replaceInFile('src/app/dashboard/page.tsx', [
  [
    /const \{ data \} = await supabase\.from\('members'\)\.select\('\*'\)\.eq\('group_id', groupId\)\.order\('created_at', \{ ascending: true \}\);/g,
    `const res = await fetch('/api/visitor/members?group_id=' + groupId);
      const json = await res.json();
      const data = json.data;`
  ],
  [
    /const \{ data: visitsData \} = await supabase\.from\('visits'\)\.select\('\*'\)\.in\('member_id', memberIds\)\.order\('visited_at', \{ ascending: false \}\);/g,
    `const visitsRes = await fetch('/api/visitor/visits?member_ids=' + memberIds.join(','));
          const visitsJson = await visitsRes.json();
          const visitsData = visitsJson.data;`
  ]
]);

// 4. face-setup/page.tsx
replaceInFile('src/app/face-setup/page.tsx', [
  [
    /const \{ data \} = await supabase\.from\('members'\)\.select\('\*'\)\.eq\('id', memberId\)\.single\(\);/g,
    `const res = await fetch('/api/visitor/members?id=' + memberId + '&single=true');
        const json = await res.json();
        const data = json.data;`
  ],
  [
    /const \{ error \} = await supabase\.from\('members'\)\.update\(\{ face_descriptor: JSON\.stringify\(Array\.from\(bestMatch\.descriptor\)\) \}\)\.eq\('id', memberId\);/g,
    `const resUpdate = await fetch('/api/visitor/members', { 
          method: 'PUT', 
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: memberId, updates: { face_descriptor: JSON.stringify(Array.from(bestMatch.descriptor)) } }) 
        });
        const jsonUpdate = await resUpdate.json();
        const error = jsonUpdate.error ? new Error(jsonUpdate.error) : null;`
  ]
]);

// 5. print-card/page.tsx
replaceInFile('src/app/print-card/page.tsx', [
  [
    /const \{ data \} = await supabase\.from\('members'\)\.select\('\*'\)\.eq\('id', storedId\)\.single\(\);/g,
    `const res = await fetch('/api/visitor/members?id=' + storedId + '&single=true');
        const json = await res.json();
        const data = json.data;`
  ]
]);

console.log('Frontend refactoring script completed.');
