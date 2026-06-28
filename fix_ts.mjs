import fs from 'fs';

function replaceInFile(filePath, replacements) {
  let content = fs.readFileSync(filePath, 'utf8');
  for (const [regex, replacement] of replacements) {
    content = content.replace(regex, replacement);
  }
  fs.writeFileSync(filePath, content, 'utf8');
}

// 1. admin/page.tsx
replaceInFile('src/app/admin/page.tsx', [
  [
    /const tRes = await fetch\('\/api\/admin\/transactions'\);\s+const tJson = await tRes\.json\(\);\s+const data = tJson\.data;\s+let error = null;\s+const now = new Date\(\);\s+if \(trxFilter === 'TODAY'\) \{\s+now\.setHours\(0, 0, 0, 0\);\s+query = query\.gte\('created_at', now\.toISOString\(\)\);\s+\} else if \(trxFilter === 'WEEK'\) \{\s+const weekAgo = new Date\(\);\s+weekAgo\.setDate\(weekAgo\.getDate\(\) - 7\);\s+query = query\.gte\('created_at', weekAgo\.toISOString\(\)\);\s+\} else if \(trxFilter === 'MONTH'\) \{\s+const monthAgo = new Date\(now\.getFullYear\(\), now\.getMonth\(\), 1\);\s+query = query\.gte\('created_at', monthAgo\.toISOString\(\)\);\s+\} else if \(trxFilter === 'YEAR'\) \{\s+const yearAgo = new Date\(now\.getFullYear\(\), 0, 1\);\s+query = query\.gte\('created_at', yearAgo\.toISOString\(\)\);\s+\}\s+const \{ data, error \} = await query;\s+if \(data && !error\) setTransactions\(data\);/gs,
    `const tRes = await fetch('/api/admin/transactions');
      const tJson = await tRes.json();
      let data = tJson.data || [];
      const error = null;
      
      const now = new Date();
      if (trxFilter === 'TODAY') {
        now.setHours(0, 0, 0, 0);
        data = data.filter((t: any) => new Date(t.created_at) >= now);
      } else if (trxFilter === 'WEEK') {
        const weekAgo = new Date();
        weekAgo.setDate(weekAgo.getDate() - 7);
        data = data.filter((t: any) => new Date(t.created_at) >= weekAgo);
      } else if (trxFilter === 'MONTH') {
        const monthAgo = new Date(now.getFullYear(), now.getMonth(), 1);
        data = data.filter((t: any) => new Date(t.created_at) >= monthAgo);
      } else if (trxFilter === 'YEAR') {
        const yearAgo = new Date(now.getFullYear(), 0, 1);
        data = data.filter((t: any) => new Date(t.created_at) >= yearAgo);
      }

      if (data && !error) setTransactions(data);`
  ],
  [
    /const primaries = membersData\.filter\(m => m\.role === 'PRIMARY'\);/g,
    `const primaries = membersData.filter((m: any) => m.role === 'PRIMARY');`
  ],
  [
    /const dependents = membersData\.filter\(m => m\.role !== 'PRIMARY'\);/g,
    `const dependents = membersData.filter((m: any) => m.role !== 'PRIMARY');`
  ],
  [
    /primaries\.forEach\(p => \{/g,
    `primaries.forEach((p: any) => {`
  ],
  [
    /const related = dependents\.filter\(d => d\.group_id === p\.group_id\);/g,
    `const related = dependents.filter((d: any) => d.group_id === p.group_id);`
  ],
  [
    /const orphaned = dependents\.filter\(d => !primaries\.find\(p => p\.group_id === d\.group_id\)\);/g,
    `const orphaned = dependents.filter((d: any) => !primaries.find((p: any) => p.group_id === d.group_id));`
  ]
]);

// 2. gate/page.tsx
replaceInFile('src/app/gate/page.tsx', [
  [
    /const membersWithActivePackages = membersRes\.filter\(m => \{/g,
    `const membersWithActivePackages = (membersRes.data || []).filter((m: any) => {` // Also noticed membersRes.data is needed for api/admin/members instead of directly membersRes
  ],
  [
    /packagesRes\.find\(p => p\.id === m\.package_id\)/g,
    `(packagesRes.data || []).find((p: any) => p.id === m.package_id)`
  ],
  [
    /const packageData = packagesRes\.find\(p => p\.id === member\.package_id\);/g,
    `const packageData = (packagesRes.data || []).find((p: any) => p.id === member.package_id);`
  ],
  [
    /member => \{/g,
    `(member: any) => {`
  ]
]);

console.log('TS Fix applied.');
