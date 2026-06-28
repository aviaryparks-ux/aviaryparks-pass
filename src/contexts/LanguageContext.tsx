"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

type LanguageCode = 'id' | 'en' | 'zh' | 'ja' | 'ko' | 'es' | 'fr' | 'de' | 'ru' | 'ar';

export const LANGUAGES = [
  { code: 'id', name: 'Indonesia', flag: '🇮🇩' },
  { code: 'en', name: 'English', flag: '🇬🇧' },
  { code: 'zh', name: '中文 (Chinese)', flag: '🇨🇳' },
  { code: 'ja', name: '日本語 (Japanese)', flag: '🇯🇵' },
  { code: 'ko', name: '한국어 (Korean)', flag: '🇰🇷' },
  { code: 'es', name: 'Español (Spanish)', flag: '🇪🇸' },
  { code: 'fr', name: 'Français (French)', flag: '🇫🇷' },
  { code: 'de', name: 'Deutsch (German)', flag: '🇩🇪' },
  { code: 'ru', name: 'Русский (Russian)', flag: '🇷🇺' },
  { code: 'ar', name: 'العربية (Arabic)', flag: '🇸🇦' },
];

const translations: Record<LanguageCode, Record<string, string>> = {
  id: {
    dashboard: 'Dashboard',
    my_visits: 'Kunjungan Saya',
    family_members: 'Anggota Keluarga',
    events_promo: 'Event & Promo',
    schedules: 'Jadwal Aktivitas',
    transactions: 'Riwayat Transaksi',
    welcome_back: 'Selamat datang kembali',
    ready_for_adventure: 'Siap untuk petualangan seru di Aviary Park hari ini?',
    hi: 'Hai',
    logout: 'Keluar (Logout)',
    my_profile: 'Profil Saya',
    personal_info: 'Informasi Pribadi',
    full_name: 'Nama Lengkap',
    phone: 'Nomor Telepon',
    select_language: 'Pilih Bahasa',
    id_card_primary: 'Utama',
    id_card_family: 'Anggota Keluarga',
    membership_card: 'KARTU MEMBER (NFC)',
    tap_info: 'TAP DI GERBANG UNTUK MASUK',
    id_number: 'Nomor ID',
    join_date: 'Tanggal Bergabung',
    expiry_date: 'Berlaku Hingga',
    face_recognition_active: 'Pengenalan Wajah Aktif',
    face_recognition_desc: 'Anda bisa langsung masuk tanpa kartu fisik.',
    total_visits: 'Total Kunjungan Keluarga',
    this_month: 'Bulan Ini',
    recent_activity: 'Aktivitas Terakhir',
    no_activity: 'Belum ada aktivitas.',
    enter_park: 'Masuk Taman',
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
    no_new_notifications: 'Belum ada notifikasi baru untuk Anda hari ini.',
    visits_count: 'Kali Masuk',
    extend: 'Perpanjang',
  },
  en: {
    dashboard: 'Dashboard',
    my_visits: 'My Visits',
    family_members: 'Family Members',
    events_promo: 'Events & Promos',
    schedules: 'Activity Schedules',
    transactions: 'Transaction History',
    welcome_back: 'Welcome back',
    ready_for_adventure: 'Ready for an exciting adventure at Aviary Park today?',
    hi: 'Hi',
    logout: 'Logout',
    my_profile: 'My Profile',
    personal_info: 'Personal Information',
    full_name: 'Full Name',
    phone: 'Phone Number',
    select_language: 'Select Language',
    id_card_primary: 'Primary',
    id_card_family: 'Family Member',
    membership_card: 'MEMBER CARD (NFC)',
    tap_info: 'TAP AT GATE TO ENTER',
    id_number: 'ID Number',
    join_date: 'Join Date',
    expiry_date: 'Valid Until',
    face_recognition_active: 'Face Recognition Active',
    face_recognition_desc: 'You can enter without a physical card.',
    total_visits: 'Total Family Visits',
    this_month: 'This Month',
    recent_activity: 'Recent Activity',
    no_activity: 'No activity yet.',
    enter_park: 'Masuk Taman',
    print_download: 'Print / Download',
    quick_features: 'Quick Features',
    invite_family: 'Invite Family',
    view_events: 'View Events',
    special_promos: 'Special Promos',
    notifications: 'Notifications',
    enjoy_best_experience: 'Enjoy the best experience at Aviary Park',
    dont_miss_activities: 'Don\'t miss out on exciting and educational activities every day.',
    view_schedule: 'View Schedule',
    copied_to_clipboard: 'Invitation text copied to clipboard!',
    promo_coming_soon: 'Look forward to exclusive "Special Promos" for Annual Pass members in the next update!',
    no_new_notifications: 'No new notifications for you today.',
    visits_count: 'Visits',
    extend: 'Extend',
  },
  zh: {
    dashboard: '仪表板',
    my_visits: '我的访问',
    family_members: '家庭成员',
    events_promo: '活动与促销',
    schedules: '活动时间表',
    transactions: '交易历史',
    welcome_back: '欢迎回来',
    ready_for_adventure: '准备好今天在Aviary Park开始激动人心的冒险了吗？',
    hi: '你好',
    logout: '登出',
    my_profile: '我的档案',
    personal_info: '个人信息',
    full_name: '全名',
    phone: '电话号码',
    select_language: '选择语言',
    id_card_primary: '主要的',
    id_card_family: '家庭成员',
    membership_card: '会员卡 (NFC)',
    tap_info: '在门口刷卡进入',
    id_number: '身份证号码',
    join_date: '加入日期',
    expiry_date: '有效期至',
    face_recognition_active: '人脸识别活跃',
    face_recognition_desc: '您可以无需实体卡进入。',
    total_visits: '家庭总访问量',
    this_month: '这个月',
    recent_activity: '近期活动',
    no_activity: '尚无活动。',
    enter_park: 'Masuk Taman',
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
    no_new_notifications: '今天没有新通知。',
  },
  ja: {
    dashboard: 'ダッシュボード',
    my_visits: '私の訪問',
    family_members: '家族のメンバー',
    events_promo: 'イベント＆プロモーション',
    schedules: 'アクティビティのスケジュール',
    transactions: '取引履歴',
    welcome_back: 'お帰りなさい',
    ready_for_adventure: '今日、Aviary Parkでのエキサイティングな冒険の準備はできていますか？',
    hi: 'こんにちは',
    logout: 'ログアウト',
    my_profile: 'マイプロフィール',
    personal_info: '個人情報',
    full_name: '氏名',
    phone: '電話番号',
    select_language: '言語を選択',
    id_card_primary: '主要な',
    id_card_family: '家族構成員',
    membership_card: 'メンバーカード (NFC)',
    tap_info: 'ゲートでタップして入場',
    id_number: 'ID番号',
    join_date: '参加日',
    expiry_date: '有効期限',
    face_recognition_active: '顔認識アクティブ',
    face_recognition_desc: '物理カードなしで入場できます。',
    total_visits: '総家族訪問数',
    this_month: '今月',
    recent_activity: '最近の活動',
    no_activity: 'まだ活動はありません。',
    enter_park: 'Masuk Taman',
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
    no_new_notifications: '本日の新しい通知はありません。',
  },
  ko: {
    dashboard: '대시보드',
    my_visits: '내 방문',
    family_members: '가족 구성원',
    events_promo: '이벤트 및 프로모션',
    schedules: '활동 일정',
    transactions: '거래 내역',
    welcome_back: '환영합니다',
    ready_for_adventure: '오늘 Aviary Park에서 신나는 모험을 할 준비가 되셨나요?',
    hi: '안녕',
    logout: '로그아웃',
    my_profile: '내 프로필',
    personal_info: '개인 정보',
    full_name: '성명',
    phone: '전화번호',
    select_language: '언어 선택',
    id_card_primary: '행성',
    id_card_family: '가족 구성원',
    membership_card: '멤버십 카드 (NFC)',
    tap_info: '게이트에서 탭하여 입장',
    id_number: 'ID 번호',
    join_date: '가입일',
    expiry_date: '유효 기간',
    face_recognition_active: '얼굴 인식 활성',
    face_recognition_desc: '실물 카드 없이 입장할 수 있습니다.',
    total_visits: '총 가족 방문 수',
    this_month: '이번 달',
    recent_activity: '최근 활동',
    no_activity: '아직 활동이 없습니다.',
    enter_park: 'Masuk Taman',
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
    no_new_notifications: '오늘은 새로운 알림이 없습니다.',
  },
  es: {
    dashboard: 'Tablero',
    my_visits: 'Mis Visitas',
    family_members: 'Miembros de la familia',
    events_promo: 'Eventos y Promociones',
    schedules: 'Horarios de Actividades',
    transactions: 'Historial de Transacciones',
    welcome_back: 'Bienvenido de nuevo',
    ready_for_adventure: '¿Listo para una emocionante aventura en Aviary Park hoy?',
    hi: 'Hola',
    logout: 'Cerrar sesión',
    my_profile: 'Mi Perfil',
    personal_info: 'Información Personal',
    full_name: 'Nombre Completo',
    phone: 'Número de Teléfono',
    select_language: 'Seleccionar idioma',
    id_card_primary: 'Primario',
    id_card_family: 'Miembro de la familia',
    membership_card: 'TARJETA DE MIEMBRO (NFC)',
    tap_info: 'TOQUE EN LA PUERTA PARA ENTRAR',
    id_number: 'Número de ID',
    join_date: 'Fecha de ingreso',
    expiry_date: 'Válido hasta',
    face_recognition_active: 'Reconocimiento facial activo',
    face_recognition_desc: 'Puede entrar sin tarjeta física.',
    total_visits: 'Visitas Familiares Totales',
    this_month: 'Este mes',
    recent_activity: 'Actividad Reciente',
    no_activity: 'Aún no hay actividad.',
    enter_park: 'Masuk Taman',
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
    no_new_notifications: 'No hay notificaciones nuevas para ti hoy.',
  },
  fr: {
    dashboard: 'Tableau de bord',
    my_visits: 'Mes Visites',
    family_members: 'Membres de la famille',
    events_promo: 'Événements et Promos',
    schedules: 'Horaires des Activités',
    transactions: 'Historique des Transactions',
    welcome_back: 'Bon retour',
    ready_for_adventure: 'Prêt pour une aventure passionnante au Aviary Park aujourd\'hui ?',
    hi: 'Salut',
    logout: 'Se déconnecter',
    my_profile: 'Mon Profil',
    personal_info: 'Informations Personnelles',
    full_name: 'Nom Complet',
    phone: 'Numéro de Téléphone',
    select_language: 'Choisir la langue',
    id_card_primary: 'Primaire',
    id_card_family: 'Membre de la famille',
    membership_card: 'CARTE DE MEMBRE (NFC)',
    tap_info: 'TAPEZ À LA PORTE POUR ENTRER',
    id_number: 'Numéro d\'identification',
    join_date: 'Date d\'inscription',
    expiry_date: 'Valable jusqu\'au',
    face_recognition_active: 'Reconnaissance faciale active',
    face_recognition_desc: 'Vous pouvez entrer sans carte physique.',
    total_visits: 'Total des visites familiales',
    this_month: 'Ce mois-ci',
    recent_activity: 'Activité récente',
    no_activity: 'Aucune activité pour le moment.',
    enter_park: 'Masuk Taman',
    print_download: 'Imprimer / Télécharger',
    quick_features: 'Fonctions Rapides',
    invite_family: 'Inviter la Famille',
    view_events: 'Voir les Événements',
    special_promos: 'Promos Spéciales',
    notifications: 'Notifications',
    enjoy_best_experience: 'Profitez de la meilleure expérience au Aviary Park',
    dont_miss_activities: 'Ne manquez pas des activités passionnantes et éducatives tous les jours.',
    view_schedule: 'Voir le Programme',
    copied_to_clipboard: 'Texte d\'invitation copié dans le presse-papiers !',
    promo_coming_soon: 'Attendez-vous à des "Promos Spéciales" exclusives pour les membres du Pass Annuel dans la prochaine mise à jour !',
    no_new_notifications: 'Aucune nouvelle notification pour vous aujourd\'hui.',
  },
  de: {
    dashboard: 'Dashboard',
    my_visits: 'Meine Besuche',
    family_members: 'Familienmitglieder',
    events_promo: 'Veranstaltungen & Promos',
    schedules: 'Aktivitätenplan',
    transactions: 'Transaktionsverlauf',
    welcome_back: 'Willkommen zurück',
    ready_for_adventure: 'Bereit für ein aufregendes Abenteuer im Aviary Park heute?',
    hi: 'Hallo',
    logout: 'Abmelden',
    my_profile: 'Mein Profil',
    personal_info: 'Persönliche Informationen',
    full_name: 'Vollständiger Name',
    phone: 'Telefonnummer',
    select_language: 'Sprache wählen',
    id_card_primary: 'Primär',
    id_card_family: 'Familienmitglied',
    membership_card: 'MITGLIEDSKARTE (NFC)',
    tap_info: 'AM TOR TIPPEN, UM EINZUTRETEN',
    id_number: 'ID-Nummer',
    join_date: 'Beitrittsdatum',
    expiry_date: 'Gültig bis',
    face_recognition_active: 'Gesichtserkennung Aktiv',
    face_recognition_desc: 'Sie können ohne physische Karte eintreten.',
    total_visits: 'Gesamte Familienbesuche',
    this_month: 'Diesen Monat',
    recent_activity: 'Letzte Aktivität',
    no_activity: 'Noch keine Aktivität.',
    enter_park: 'Masuk Taman',
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
    no_new_notifications: 'Heute keine neuen Benachrichtigungen für Sie.',
  },
  ru: {
    dashboard: 'Панель',
    my_visits: 'Мои визиты',
    family_members: 'Члены семьи',
    events_promo: 'События и акции',
    schedules: 'Расписание мероприятий',
    transactions: 'История транзакций',
    welcome_back: 'С возвращением',
    ready_for_adventure: 'Готовы к захватывающему приключению в Aviary Park сегодня?',
    hi: 'Привет',
    logout: 'Выйти',
    my_profile: 'Мой профиль',
    personal_info: 'Личная информация',
    full_name: 'Полное имя',
    phone: 'Номер телефона',
    select_language: 'Выберите язык',
    id_card_primary: 'Основной',
    id_card_family: 'Член семьи',
    membership_card: 'КАРТА ЧЛЕНА (NFC)',
    tap_info: 'ПРИЛОЖИТЕ К ТУРНИКЕТУ ДЛЯ ВХОДА',
    id_number: 'Номер ID',
    join_date: 'Дата регистрации',
    expiry_date: 'Годен до',
    face_recognition_active: 'Распознавание лиц активно',
    face_recognition_desc: 'Вы можете войти без физической карты.',
    total_visits: 'Всего семейных визитов',
    this_month: 'В этом месяце',
    recent_activity: 'Последняя активность',
    no_activity: 'Пока нет активности.',
    enter_park: 'Masuk Taman',
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
    no_new_notifications: 'На сегодня для вас нет новых уведомлений.',
  },
  ar: {
    dashboard: 'لوحة القيادة',
    my_visits: 'زياراتي',
    family_members: 'أفراد الأسرة',
    events_promo: 'الأحداث والعروض',
    schedules: 'جداول الأنشطة',
    transactions: 'تاريخ المعاملات',
    welcome_back: 'مرحبا بعودتك',
    ready_for_adventure: 'مستعد لمغامرة مثيرة في حديقة أفياري اليوم؟',
    hi: 'مرحبًا',
    logout: 'تسجيل خروج',
    my_profile: 'ملفي الشخصي',
    personal_info: 'معلومات شخصية',
    full_name: 'الاسم الكامل',
    phone: 'رقم الهاتف',
    select_language: 'اختر اللغة',
    id_card_primary: 'أساسي',
    id_card_family: 'فرد من العائلة',
    membership_card: 'بطاقة العضو (NFC)',
    tap_info: 'انقر عند البوابة للدخول',
    id_number: 'رقم الهوية',
    join_date: 'تاريخ الانضمام',
    expiry_date: 'صالح حتى',
    face_recognition_active: 'التعرف على الوجه نشط',
    face_recognition_desc: 'يمكنك الدخول بدون بطاقة فعلية.',
    total_visits: 'إجمالي زيارات العائلة',
    this_month: 'هذا الشهر',
    recent_activity: 'النشاط الأخير',
    no_activity: 'لا يوجد نشاط بعد.',
    enter_park: 'Masuk Taman',
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
    no_new_notifications: 'لا توجد إشعارات جديدة لك اليوم.',
  }
};

interface LanguageContextType {
  language: LanguageCode;
  setLanguage: (lang: LanguageCode) => void;
  t: (key: string) => string;
}

const LanguageContext = createContext<LanguageContextType>({
  language: 'id',
  setLanguage: () => {},
  t: (key) => key,
});

export const LanguageProvider = ({ children }: { children: ReactNode }) => {
  const [language, setLanguageState] = useState<LanguageCode>('id');

  useEffect(() => {
    // Inject Google Translate script if it doesn't exist
    if (!document.getElementById('google-translate-script')) {
      const script = document.createElement('script');
      script.id = 'google-translate-script';
      script.src = 'https://translate.google.com/translate_a/element.js?cb=googleTranslateElementInit';
      script.async = true;
      document.body.appendChild(script);

      const style = document.createElement('style');
      style.innerHTML = `
        iframe.goog-te-banner-frame { display: none !important; visibility: hidden !important; }
        .goog-te-banner-frame { display: none !important; visibility: hidden !important; }
        body { top: 0px !important; position: static !important; }
        #goog-gt-tt { display: none !important; }
        .VIpgJd-Zvi9od-aZ2wEe-wOHMyf { display: none !important; }
      `;
      document.head.appendChild(style);

      // Ruthless MutationObserver to kill the banner and fix body top
      const observer = new MutationObserver((mutations) => {
        if (document.body.style.top !== '0px' && document.body.style.top !== '') {
          document.body.style.setProperty('top', '0px', 'important');
        }
        
        const iframes = document.querySelectorAll('iframe.goog-te-banner-frame, iframe.skiptranslate, .VIpgJd-Zvi9od-aZ2wEe-wOHMyf');
        iframes.forEach((iframe) => {
          (iframe as HTMLElement).style.setProperty('display', 'none', 'important');
          (iframe as HTMLElement).style.setProperty('visibility', 'hidden', 'important');
        });
      });
      observer.observe(document.body, { attributes: true, childList: true, subtree: true, attributeFilter: ['style'] });

      (window as any).googleTranslateElementInit = () => {
        new (window as any).google.translate.TranslateElement(
          { pageLanguage: 'id', autoDisplay: false },
          'google_translate_element'
        );
      };
      
      const gtContainer = document.createElement('div');
      gtContainer.id = 'google_translate_element';
      gtContainer.style.display = 'none';
      document.body.appendChild(gtContainer);
    }

    const saved = localStorage.getItem('appLanguage');
    if (saved && Object.keys(translations).includes(saved)) {
      setLanguageState(saved as LanguageCode);
      // Wait a bit for GT script to load, then trigger
      setTimeout(() => triggerGoogleTranslate(saved as LanguageCode), 1500);
    }
  }, []);

  const triggerGoogleTranslate = (lang: LanguageCode) => {
    const gtMap: Record<string, string> = {
      'id': 'id',
      'en': 'en',
      'zh': 'zh-CN',
      'ja': 'ja',
      'ko': 'ko',
      'es': 'es',
      'fr': 'fr',
      'de': 'de',
      'ru': 'ru',
      'ar': 'ar',
    };
    const gtLang = gtMap[lang] || 'id';

    const select = document.querySelector('.goog-te-combo') as HTMLSelectElement;
    if (select) {
      select.value = gtLang;
      select.dispatchEvent(new Event('change', { bubbles: true, cancelable: true }));
    }
  };

  const setLanguage = (lang: LanguageCode) => {
    setLanguageState(lang);
    localStorage.setItem('appLanguage', lang);
    triggerGoogleTranslate(lang);
  };

  const t = (key: string): string => {
    return translations['id'][key] || key;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => useContext(LanguageContext);
