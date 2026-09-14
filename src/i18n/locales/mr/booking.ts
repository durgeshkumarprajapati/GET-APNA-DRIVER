export const bookingMr = {
  status: {
    DRAFT: 'मसुदा',
    SEARCHING_DRIVER: 'चॉफरचा शोध सुरू',
    DRIVER_ASSIGNED: 'चॉफर नियुक्त केला',
    DRIVER_EN_ROUTE: 'पिकअपच्या मार्गावर',
    DRIVER_ARRIVED: 'पिकअप ठिकाणी पोहोचले',
    TRIP_IN_PROGRESS: 'ट्रिप सुरू आहे',
    TRIP_COMPLETED: 'ट्रिप पूर्ण झाली',
    CANCELLED: 'रद्द केले',
    EXPIRED: 'ऑफर कालबाह्य',
  },
  types: {
    ONE_WAY: 'वन वे',
    ROUND_TRIP: 'राउंड ट्रिप',
    HOURLY: 'तासनिहाय भाडे',
    FULL_DAY: 'पूर्ण दिवस चॉफर',
    MULTI_DAY: 'आऊटस्टेशन बहु-दिवसीय',
  },
  cancelModal: {
    title: 'बुकिंग रद्द करा',
    description: 'तुम्हाला खात्री आहे की तुम्ही ही बुकिंग रद्द करू इच्छिता? ड्रायव्हर मार्गावर असल्यास रद्दीकरण शुल्क लागू शकते.',
    reasonLabel: 'रद्दीकरणाचे कारण',
    confirmBtn: 'रद्दीकरणाची खात्री करा',
  },
  pinModal: {
    title: 'राइड पडताळणी PIN प्रविष्ट करा',
    subtitle: 'ट्रिप सुरू करण्यापूर्वी ग्राहकाकडून ६-अंकी PIN मागा',
    submit: 'PIN पडताळा',
  },
};
