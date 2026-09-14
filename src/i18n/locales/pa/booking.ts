export const bookingPa = {
  status: {
    DRAFT: 'ਡਰਾਫਟ',
    SEARCHING_DRIVER: 'ਡਰਾਈਵਰ ਦੀ ਖੋਜ ਜਾਰੀ',
    DRIVER_ASSIGNED: 'ਡਰਾਈਵਰ ਨਿਰਧਾਰਿਤ ਕੀਤਾ ਗਿਆ',
    DRIVER_EN_ROUTE: 'ਪਿਕਅੱਪ ਲਈ ਆ ਰਿਹਾ ਹੈ',
    DRIVER_ARRIVED: 'ਪਹੁੰਚ ਗਏ ਹਨ',
    TRIP_IN_PROGRESS: 'ਸਵਾਰੀ ਚੱਲ ਰਹੀ ਹੈ',
    TRIP_COMPLETED: 'ਸਵਾਰੀ ਪੂਰੀ ਹੋਈ',
    CANCELLED: 'ਰੱਦ ਕੀਤਾ ਗਿਆ',
    EXPIRED: 'ਆਫਰ ਦੀ ਮਿਆਦ ਪੁੱਗ ਗਈ',
  },
  types: {
    ONE_WAY: 'ਇੱਕ ਪਾਸੇ ਦੀ ਸਵਾਰੀ',
    ROUND_TRIP: 'ਦੋਵੇਂ ਪਾਸੇ ਦੀ ਸਵਾਰੀ',
    HOURLY: 'ਘੰਟੇ ਦੇ ਹਿਸਾਬ ਨਾਲ',
    FULL_DAY: 'ਪੂਰੇ ਦਿਨ ਦਾ ਡਰਾਈਵਰ',
    MULTI_DAY: 'ਬਾਹਰੀ ਸ਼ਹਿਰ ਦੀ ਸਵਾਰੀ',
  },
  cancelModal: {
    title: 'ਬੁਕਿੰਗ ਰੱਦ ਕਰੋ',
    description: 'ਕੀ ਤੁਸੀਂ ਯਕੀਨੀ ਤੌਰ ਤੇ ਇਹ ਬੁਕਿੰਗ ਰੱਦ ਕਰਨਾ ਚਾਹੁੰਦੇ ਹੋ? ਜੇਕਰ ਡਰਾਈਵਰ ਆ ਰਿਹਾ ਹੈ ਤਾਂ ਰੱਦ ਕਰਨ ਦੀ ਫੀਸ ਲੱਗ ਸਕਦੀ ਹੈ।',
    reasonLabel: 'ਰੱਦ ਕਰਨ ਦਾ ਕਾਰਨ',
    confirmBtn: 'ਰੱਦ ਕਰਨ ਦੀ ਪੁਸ਼ਟੀ ਕਰੋ',
  },
  pinModal: {
    title: 'ਸਵਾਰੀ ਪੁਸ਼ਟੀਕਰਨ PIN ਦਰਜ ਕਰੋ',
    subtitle: 'ਸਵਾਰੀ ਸ਼ੁਰੂ ਕਰਨ ਤੋਂ ਪਹਿਲਾਂ ਗ੍ਰਾਹਕ ਤੋਂ 6 ਅੰਕਾਂ ਦਾ PIN ਪੁੱਛੋ',
    submit: 'PIN ਦੀ ਪੁਸ਼ਟੀ ਕਰੋ',
  },
};
