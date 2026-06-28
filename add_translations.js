const fs = require('fs');
let content = fs.readFileSync('src/contexts/LanguageContext.tsx', 'utf8');

const newTranslations = {
  id: {
    print_download: 'Cetak / Unduh',
    quick_features: 'Fitur Cepat',
    invite_family: 'Undang Keluarga',
    view_events: 'Lihat Event',
    special_promos: 'Promo Menarik',
    notifications: 'Notifikasi',
    enjoy_best_experience: 'Nikmati pengalaman terbaik di Aviary Park',
    dont_miss_activities: 'Jangan lewatkan berbagai aktivitas seru dan edukatif setiap harinya.',
    view_schedule: 'Lihat Jadwal',
    copied_to_clipboard: 'Teks undangan telah disalin ke clipboard!',
    promo_coming_soon: 'Nantikan "Promo Menarik" eksklusif untuk member Annual Pass di update selanjutnya!',
    no_new_notifications: 'Belum ada notifikasi baru untuk Anda hari ini.'
  },
  en: {
    print_download: 'Print / Download',
    quick_features: 'Quick Features',
    invite_family: 'Invite Family',
    view_events: 'View Events',
    special_promos: 'Special Promos',
    notifications: 'Notifications',
    enjoy_best_experience: 'Enjoy the best experience at Aviary Park',
    dont_miss_activities: "Don't miss out on exciting and educational activities every day.",
    view_schedule: 'View Schedule',
    copied_to_clipboard: 'Invitation text copied to clipboard!',
    promo_coming_soon: 'Look forward to exclusive "Special Promos" for Annual Pass members in the next update!',
    no_new_notifications: 'No new notifications for you today.'
  },
  zh: {
    print_download: '打印 / 下载',
    quick_features: '快速功能',
    invite_family: '邀请家人',
    view_events: '查看活动',
    special_promos: '特别促销',
    notifications: '通知',
    enjoy_best_experience: '在Aviary Park享受最佳体验',
    dont_miss_activities: '每天都不要错过激动人心的教育活动。',
    view_schedule: '查看时间表',
    copied_to_clipboard: '邀请文本已复制到剪贴板！',
    promo_coming_soon: '敬请期待下一次更新中年票会员专属的“特别促销”！',
    no_new_notifications: '今天没有新通知。'
  },
  ja: {
    print_download: '印刷 / ダウンロード',
    quick_features: 'クイック機能',
    invite_family: '家族を招待',
    view_events: 'イベントを見る',
    special_promos: '特別プロモーション',
    notifications: '通知',
    enjoy_best_experience: 'Aviary Parkで最高の体験をお楽しみください',
    dont_miss_activities: '毎日エキサイティングで教育的な活動をお見逃しなく。',
    view_schedule: 'スケジュールを見る',
    copied_to_clipboard: '招待文がクリップボードにコピーされました！',
    promo_coming_soon: '次回のアップデートで、年間パスメンバー専用の「特別プロモーション」をお楽しみに！',
    no_new_notifications: '本日の新しい通知はありません。'
  },
  ko: {
    print_download: '인쇄 / 다운로드',
    quick_features: '빠른 기능',
    invite_family: '가족 초대',
    view_events: '이벤트 보기',
    special_promos: '특별 프로모션',
    notifications: '알림',
    enjoy_best_experience: 'Aviary Park에서 최고의 경험을 즐기세요',
    dont_miss_activities: '매일 흥미롭고 교육적인 활동을 놓치지 마세요.',
    view_schedule: '일정 보기',
    copied_to_clipboard: '초대 문구가 클립보드에 복사되었습니다!',
    promo_coming_soon: '다음 업데이트에서 연간 이용권 회원을 위한 독점 "특별 프로모션"을 기대해주세요!',
    no_new_notifications: '오늘은 새로운 알림이 없습니다.'
  },
  es: {
    print_download: 'Imprimir / Descargar',
    quick_features: 'Funciones Rápidas',
    invite_family: 'Invitar Familia',
    view_events: 'Ver Eventos',
    special_promos: 'Promociones Especiales',
    notifications: 'Notificaciones',
    enjoy_best_experience: 'Disfruta de la mejor experiencia en Aviary Park',
    dont_miss_activities: 'No te pierdas de emocionantes y educativas actividades todos los días.',
    view_schedule: 'Ver Horario',
    copied_to_clipboard: '¡Texto de invitación copiado al portapapeles!',
    promo_coming_soon: '¡Espera promociones exclusivas para miembros del Pase Anual en la próxima actualización!',
    no_new_notifications: 'No hay notificaciones nuevas para ti hoy.'
  },
  fr: {
    print_download: 'Imprimer / Télécharger',
    quick_features: 'Fonctions Rapides',
    invite_family: 'Inviter la Famille',
    view_events: 'Voir les Événements',
    special_promos: 'Promos Spéciales',
    notifications: 'Notifications',
    enjoy_best_experience: 'Profitez de la meilleure expérience au Aviary Park',
    dont_miss_activities: 'Ne manquez pas des activités passionnantes et éducatives tous les jours.',
    view_schedule: 'Voir le Programme',
    copied_to_clipboard: "Texte d'invitation copié dans le presse-papiers !",
    promo_coming_soon: 'Attendez-vous à des "Promos Spéciales" exclusives pour les membres du Pass Annuel dans la prochaine mise à jour !',
    no_new_notifications: "Aucune nouvelle notification pour vous aujourd'hui."
  },
  de: {
    print_download: 'Drucken / Herunterladen',
    quick_features: 'Schnelle Funktionen',
    invite_family: 'Familie Einladen',
    view_events: 'Veranstaltungen Ansehen',
    special_promos: 'Spezielle Angebote',
    notifications: 'Benachrichtigungen',
    enjoy_best_experience: 'Genießen Sie das beste Erlebnis im Aviary Park',
    dont_miss_activities: 'Verpassen Sie nicht jeden Tag spannende und lehrreiche Aktivitäten.',
    view_schedule: 'Zeitplan Ansehen',
    copied_to_clipboard: 'Einladungstext in die Zwischenablage kopiert!',
    promo_coming_soon: 'Freuen Sie sich beim nächsten Update auf exklusive "Spezielle Angebote" für Jahreskartenbesitzer!',
    no_new_notifications: 'Heute keine neuen Benachrichtigungen für Sie.'
  },
  ru: {
    print_download: 'Печать / Скачать',
    quick_features: 'Быстрые функции',
    invite_family: 'Пригласить семью',
    view_events: 'Посмотреть события',
    special_promos: 'Специальные акции',
    notifications: 'Уведомления',
    enjoy_best_experience: 'Наслаждайтесь лучшим опытом в Aviary Park',
    dont_miss_activities: 'Не пропустите захватывающие и образовательные мероприятия каждый день.',
    view_schedule: 'Посмотреть расписание',
    copied_to_clipboard: 'Текст приглашения скопирован в буфер обмена!',
    promo_coming_soon: 'Ожидайте эксклюзивные "Специальные акции" для обладателей годового абонемента в следующем обновлении!',
    no_new_notifications: 'На сегодня для вас нет новых уведомлений.'
  },
  ar: {
    print_download: 'طباعة / تنزيل',
    quick_features: 'ميزات سريعة',
    invite_family: 'دعوة العائلة',
    view_events: 'عرض الفعاليات',
    special_promos: 'عروض خاصة',
    notifications: 'إشعارات',
    enjoy_best_experience: 'استمتع بأفضل تجربة في Aviary Park',
    dont_miss_activities: 'لا تفوت الأنشطة المثيرة والتعليمية كل يوم.',
    view_schedule: 'عرض الجدول',
    copied_to_clipboard: 'تم نسخ نص الدعوة إلى الحافظة!',
    promo_coming_soon: 'تطلع إلى "العروض الخاصة" الحصرية لأعضاء البطاقة السنوية في التحديث القادم!',
    no_new_notifications: 'لا توجد إشعارات جديدة لك اليوم.'
  }
};

let output = content;
for (const lang of Object.keys(newTranslations)) {
  const translationsToAdd = newTranslations[lang];
  const stringToAdd = Object.keys(translationsToAdd).map(k => `    ${k}: '${translationsToAdd[k].replace(/'/g, "\\'")}',`).join('\n');
  
  // Find the end of the block for this language
  const regex = new RegExp(`(${lang}: \\{[\\s\\S]*?)(  \\},|  \\})`);
  output = output.replace(regex, `$1${stringToAdd}\n$2`);
}

fs.writeFileSync('src/contexts/LanguageContext.tsx', output);
