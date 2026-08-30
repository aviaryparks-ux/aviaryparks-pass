const fs = require('fs');
let content = fs.readFileSync('src/app/admin/page.tsx', 'utf8');

// Chunk 1: State vars
content = content.replace(/  const \[liveScanDateFilter, setLiveScanDateFilter\] = useState<string>\(new Date\(\)\.toISOString\(\)\.split\('T'\)\[0\]\);\n  const \[liveScanCurrentPage, setLiveScanCurrentPage\] = useState\(1\);\n/, '');

// Chunk 2: Type
content = content.replace(/ \| 'LIVE_SCAN'/g, '');

// Chunk 3: Polling
const pollingRegex = /\s*\/\/ Poll data when on LIVE_SCAN tab[\s\S]*?\}, \[activeTab\]\);/m;
content = content.replace(pollingRegex, '');

// Chunk 4: Menu item
const menuRegex = /\s*<div onClick=\{\(\) => setActiveTab\('LIVE_SCAN'\)\}[\s\S]*?Live Scan & Log Masuk\n\s*<\/div>/m;
content = content.replace(menuRegex, '');

// Chunk 5: The UI block
const startIdx = content.indexOf("      {activeTab === 'LIVE_SCAN' && (() => {");
const endStr = "      })()}";
const endIdx = content.indexOf(endStr, startIdx);
if (startIdx !== -1 && endIdx !== -1) {
  content = content.substring(0, startIdx) + content.substring(endIdx + endStr.length);
} else {
  console.log('Could not find UI block indices');
}

fs.writeFileSync('src/app/admin/page.tsx', content);
