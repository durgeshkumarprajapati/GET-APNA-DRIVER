export const bookingTe = {
  status: {
    DRAFT: 'డ్రాఫ్ట్',
    SEARCHING_DRIVER: 'డ్రైవర్ కోసం వెతుకుతోంది',
    DRIVER_ASSIGNED: 'డ్రైవర్ కేటాయించబడ్డారు',
    DRIVER_EN_ROUTE: 'పికప్‌కి వస్తున్నారు',
    DRIVER_ARRIVED: 'పికప్ వద్దకు చేరుకున్నారు',
    TRIP_IN_PROGRESS: 'రైడ్ పురోగతిలో ఉంది',
    TRIP_COMPLETED: 'రైడ్ పూర్తయింది',
    CANCELLED: 'రద్దు చేయబడింది',
    EXPIRED: 'ఆఫర్ గడువు ముగిసింది',
  },
  types: {
    ONE_WAY: 'వన్ వే',
    ROUND_TRIP: 'రౌండ్ ట్రిప్',
    HOURLY: 'గంటల అద్దె',
    FULL_DAY: 'రోజంతా డ్రైవర్',
    MULTI_DAY: 'అవుట్‌స్టేషన్ మల్టీ-డే',
  },
  cancelModal: {
    title: 'బుకింగ్ రద్దు చేయండి',
    description: 'మీరు ఖచ్చితంగా ఈ బుకింగ్‌ను రద్దు చేయాలనుకుంటున్నారా? డ్రైవర్ వస్తున్నట్లయితే రద్దు రుసుము వర్తించవచ్చు.',
    reasonLabel: 'రద్దుకు కారణం',
    confirmBtn: 'రద్దును నిర్ధారించండి',
  },
  pinModal: {
    title: 'రైడ్ వెరిఫికేషన్ పిన్ ఎంటర్ చేయండి',
    subtitle: 'రైడ్ ప్రారంభించే ముందు కస్టమర్‌ను 6 అంకెల పిన్ అడగండి',
    submit: 'పిన్ ధృవీకరించండి',
  },
};
