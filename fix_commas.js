const fs = require('fs');
let c = fs.readFileSync('src/contexts/LanguageContext.tsx', 'utf8');
c = c.replace(/enter_park: ,/g, "enter_park: 'Masuk Taman',"); // Fix ID
c = c.replace(/enter_park: ,\n    print_download: 'Print \/ Download'/g, "enter_park: 'Entered Park',\n    print_download: 'Print / Download'"); // EN
c = c.replace(/enter_park: ,\n    print_download: '打印 \/ 下载'/g, "enter_park: '进入公园',\n    print_download: '打印 / 下载'"); // ZH
c = c.replace(/enter_park: ,\n    print_download: '印刷 \/ ダウンロード'/g, "enter_park: '入園しました',\n    print_download: '印刷 / ダウンロード'"); // JA
c = c.replace(/enter_park: ,\n    print_download: '인쇄 \/ 다운로드'/g, "enter_park: '공원 입장',\n    print_download: '인쇄 / 다운로드'"); // KO
c = c.replace(/enter_park: ,\n    print_download: 'Imprimir \/ Descargar'/g, "enter_park: 'Parque Entrado',\n    print_download: 'Imprimir / Descargar'"); // ES
c = c.replace(/enter_park: ,\n    print_download: 'Imprimer \/ Télécharger'/g, "enter_park: 'Parc Entré',\n    print_download: 'Imprimer / Télécharger'"); // FR
c = c.replace(/enter_park: ,\n    print_download: 'Drucken \/ Herunterladen'/g, "enter_park: 'Park Betreten',\n    print_download: 'Drucken / Herunterladen'"); // DE
c = c.replace(/enter_park: ,\n    print_download: 'Печать \/ Скачать'/g, "enter_park: 'Вошел в парк',\n    print_download: 'Печать / Скачать'"); // RU
c = c.replace(/enter_park: ,\n    print_download: 'طباعة \/ تنزيل'/g, "enter_park: 'دخل الحديقة',\n    print_download: 'طباعة / تنزيل'"); // AR

fs.writeFileSync('src/contexts/LanguageContext.tsx', c);
