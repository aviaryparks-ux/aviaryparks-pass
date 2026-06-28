import fs from 'fs';
import path from 'path';

const filesToProcess = [
  'src/app/add-member/page.tsx',
  'src/app/admin/page.tsx',
  'src/app/admin/events/page.tsx',
  'src/app/payment/page.tsx',
  'src/app/register/page.tsx'
];

filesToProcess.forEach(file => {
  const filePath = path.join(process.cwd(), file);
  if (!fs.existsSync(filePath)) return;
  
  let content = fs.readFileSync(filePath, 'utf8');
  let modified = false;

  if (content.includes('alert(')) {
    // Basic regex to find alert('something') or alert(`something`)
    content = content.replace(/alert\((['"`])((?:(?!\1)[^\\]|\\.)*)\1\);?/g, (match, quote, msg) => {
      // Determine if success or error based on message content
      const lowerMsg = msg.toLowerCase();
      if (lowerMsg.includes('berhasil')) {
        return `toast.success(${quote}${msg}${quote});`;
      } else if (lowerMsg.includes('gagal') || lowerMsg.includes('kesalahan') || lowerMsg.includes('tidak valid') || lowerMsg.includes('error')) {
        return `toast.error(${quote}${msg}${quote});`;
      } else {
        return `toast.error(${quote}${msg}${quote});`; // default to error/warning styling
      }
    });

    // Also handle alert(result.error || '...')
    content = content.replace(/alert\(([^)]+)\);?/g, (match, arg) => {
      if (arg.startsWith('toast')) return match; // Already replaced
      // if it has ternary or OR, default to error
      return `toast.error(${arg});`;
    });

    if (!content.includes("import toast from 'react-hot-toast';")) {
      content = content.replace(/(import {[^}]+} from 'react';)/, `$1\nimport toast from 'react-hot-toast';`);
    }

    modified = true;
  }

  if (modified) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`Updated ${file}`);
  }
});
