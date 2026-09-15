export const bookingTa = {
  status: {
    DRAFT: 'வரைவு',
    SEARCHING_DRIVER: 'ஓட்டுநர் தேடப்படுகிறது',
    DRIVER_ASSIGNED: 'ஓட்டுநர் ஒதுக்கப்பட்டார்',
    DRIVER_EN_ROUTE: 'வரும் வழியில்',
    DRIVER_ARRIVED: 'வந்துவிட்டார்',
    TRIP_IN_PROGRESS: 'பயணம் நடைபெறுகிறது',
    TRIP_COMPLETED: 'பயணம் முடிந்தது',
    CANCELLED: 'ரத்து செய்யப்பட்டது',
    EXPIRED: 'காலாவதியானது',
  },
  types: {
    ONE_WAY: 'ஒரு வழிப் பயணம்',
    ROUND_TRIP: 'இரு வழிப் பயணம்',
    HOURLY: 'மணிநேர வாடகை',
    FULL_DAY: 'முழு நாள் ஓட்டுநர்',
    MULTI_DAY: 'வெளியூர் பல நாள் பயணம்',
  },
  cancelModal: {
    title: 'முன்பதிவை ரத்து செய்',
    description:
      'இந்த முன்பதிவை நிச்சயம் ரத்து செய்ய விரும்புகிறீர்களா? ஓட்டுநர் வரும் வழியில் இருந்தால் ரத்துுக் கட்டணம் வசூலிக்கப்படலாம்.',
    reasonLabel: 'ரத்து செய்ய காரணம்',
    confirmBtn: 'ரத்து செய்வதை உறுதிசெய்',
  },
  pinModal: {
    title: 'பயண PIN-ஐ உள்ளிடவும்',
    subtitle: 'பயணத்தைத் தொடங்குவதற்கு முன் வாடிக்கையாளரிடம் 6 இலக்க PIN கேட்கவும்',
    submit: 'PIN சரிபார்',
  },
};
