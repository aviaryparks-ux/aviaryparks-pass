const https = require('https');
const fs = require('fs');
const path = require('path');

const url = 'https://aviarypark.com/wp-content/uploads/2023/11/logo-aviary-park-1.png';
const dest1 = path.join(__dirname, 'public', 'logo.png');
const dest2 = path.join(__dirname, 'src', 'app', 'icon.png');

https.get(url, (res) => {
  if (res.statusCode !== 200) {
    console.error('Failed to get logo, status code:', res.statusCode);
    return;
  }
  const file1 = fs.createWriteStream(dest1);
  const file2 = fs.createWriteStream(dest2);
  
  res.pipe(file1);
  res.pipe(file2);
  
  file2.on('finish', () => {
    file2.close();
    console.log('Logo downloaded successfully to public/logo.png and src/app/icon.png');
  });
}).on('error', (err) => {
  console.error('Error downloading logo:', err.message);
});
