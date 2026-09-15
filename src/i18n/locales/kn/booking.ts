export const bookingKn = {
  status: {
    DRAFT: 'ಕರಡು',
    SEARCHING_DRIVER: 'ಚಾಲಕರಿಗಾಗಿ ಹುಡುಕಲಾಗುತ್ತಿದೆ',
    DRIVER_ASSIGNED: 'ಚಾಲಕರನ್ನು ನಿಯೋಜಿಸಲಾಗಿದೆ',
    DRIVER_EN_ROUTE: 'ಪಿಕಪ್‌ಗೆ ಬರುತ್ತಿದ್ದಾರೆ',
    DRIVER_ARRIVED: 'ಪಿಕಪ್ ಸ್ಥಳಕ್ಕೆ ತಲುಪಿದ್ದಾರೆ',
    TRIP_IN_PROGRESS: 'ಸವಾರಿ ಪ್ರಗತಿಯಲ್ಲಿದೆ',
    TRIP_COMPLETED: 'ಸವಾರಿ ಪೂರ್ಣಗೊಂಡಿದೆ',
    CANCELLED: 'ರದ್ದುಗೊಳಿಸಲಾಗಿದೆ',
    EXPIRED: 'ಆಫರ್ ಅವಧಿ ಮುಗಿದಿದೆ',
  },
  types: {
    ONE_WAY: 'ಒಂದು ಕಡೆಯ ಸವಾರಿ',
    ROUND_TRIP: 'ಎರಡು ಕಡೆಯ ಸವಾರಿ',
    HOURLY: 'ಗಂಟೆಯ ಆಧಾರಿತ',
    FULL_DAY: 'ಇಡೀ ದಿನದ ಚಾಲಕರು',
    MULTI_DAY: 'ಊರಿನ ಹೊರಗಿನ ಸವಾರಿ',
  },
  cancelModal: {
    title: 'ಬುಕಿಂಗ್ ರದ್ದುಗೊಳಿಸಿ',
    description:
      'ನೀವು ಖಂಡಿತವಾಗಿಯೂ ಈ ಬುಕಿಂಗ್ ಅನ್ನು ರದ್ದುಗೊಳಿಸಲು ಬಯಸುತ್ತೀರಾ? ಚಾಲಕರು ಬರುತ್ತಿದ್ದರೆ ರದ್ದತಿ ಶುಲ್ಕ ಅನ್ವಯಿಸಬಹುದು.',
    reasonLabel: 'ರದ್ದುಗೊಳಿಸಲು ಕಾರಣ',
    confirmBtn: 'ರದ್ದತಿಯನ್ನು ಖಚಿತಪಡಿಸಿ',
  },
  pinModal: {
    title: 'ಸವಾರಿ ಪರಿಶೀಲನಾ PIN ನಮೂದಿಸಿ',
    subtitle: 'ಸವಾರಿ ಪ್ರಾರಂಭಿಸುವ ಮೊದಲು ಗ್ರಾಹಕರಲ್ಲಿ 6 ಅಂಕಿಯ PIN ಕೇಳಿ',
    submit: 'PIN ಪರಿಶೀಲಿಸಿ',
  },
};
