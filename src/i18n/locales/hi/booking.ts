export const bookingHi = {
  status: {
    DRAFT: 'ड्राफ्ट',
    SEARCHING_DRIVER: 'ड्राइवर की तलाश जारी',
    DRIVER_ASSIGNED: 'ड्राइवर आवंटित',
    DRIVER_EN_ROUTE: 'पिकअप हेतु रास्ते में',
    DRIVER_ARRIVED: 'पिकअप स्थान पर पहुंचे',
    TRIP_IN_PROGRESS: 'यात्रा जारी है',
    TRIP_COMPLETED: 'यात्रा पूर्ण',
    CANCELLED: 'रद्द',
    EXPIRED: 'ऑफ़र समाप्त',
  },
  types: {
    ONE_WAY: 'एक तरफ़ा',
    ROUND_TRIP: 'आना-जाना',
    HOURLY: 'घंटे के हिसाब से किराए पर',
    FULL_DAY: 'पूरे दिन का ड्राइवर',
    MULTI_DAY: 'आउटस्टेशन बहु-दिवसीय',
  },
  cancelModal: {
    title: 'बुकिंग रद्द करें',
    description: 'क्या आप वाकई इस बुकिंग को रद्द करना चाहते हैं? यदि ड्राइवर पिकअप के लिए रास्ते में है तो रद्दीकरण शुल्क लागू हो सकता है।',
    reasonLabel: 'रद्दीकरण का कारण',
    confirmBtn: 'रद्दीकरण की पुष्टि करें',
  },
  pinModal: {
    title: 'राइड सत्यापन पिन दर्ज करें',
    subtitle: 'यात्रा शुरू करने से पहले ग्राहक से 6-अंकों का पिन पूछें',
    submit: 'पिन सत्यापित करें',
  },
};
