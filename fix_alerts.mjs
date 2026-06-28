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

  // Fix double semicolon inside toast
  if (content.includes(';);')) {
    content = content.replace(/;\);/g, ');');
    modified = true;
  }
  
  // Fix the specific broken regex from earlier
  // The bad output is like: toast.error('Gagal menambah paket: ' + (data.error || 'Unknown error'););
  content = content.replace(/toast\.error\((.*?);\);/g, "toast.error($1);");
  content = content.replace(/toast\.success\((.*?);\);/g, "toast.success($1);");

  if (modified) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`Fixed ${file}`);
  }
});
