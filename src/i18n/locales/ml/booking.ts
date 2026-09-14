export const bookingMl = {
  status: {
    DRAFT: 'ഡ്രാഫ്റ്റ്',
    SEARCHING_DRIVER: 'ഡ്രൈവറെ തിരയുന്നു',
    DRIVER_ASSIGNED: 'ഡ്രൈവറെ നിശ്ചയിച്ചു',
    DRIVER_EN_ROUTE: 'പിക്കപ്പിലേക്ക് വരുന്നു',
    DRIVER_ARRIVED: 'എത്തിച്ചേർന്നു',
    TRIP_IN_PROGRESS: 'യാത്ര പുരോഗമിക്കുന്നു',
    TRIP_COMPLETED: 'യാത്ര പൂർത്തിയായി',
    CANCELLED: 'റദ്ദാക്കി',
    EXPIRED: 'ഓഫർ കാലാവധി കഴിഞ്ഞു',
  },
  types: {
    ONE_WAY: 'വൺ വേ',
    ROUND_TRIP: 'റൗണ്ട് ട്രിപ്പ്',
    HOURLY: 'മണിക്കൂർ വാടക',
    FULL_DAY: 'പൂർണ്ണദിന ഡ്രൈവർ',
    MULTI_DAY: 'മറ്റ് ജില്ലകളിലേക്ക് പല ദിവസത്തെ യാത്ര',
  },
  cancelModal: {
    title: 'ബുക്കിംഗ് റദ്ദാക്കുക',
    description: 'ഈ ബുക്കിംഗ് റദ്ദാക്കാൻ ആഗ്രഹിക്കുന്നുവെന്ന് ഉറപ്പാണോ? ഡ്രൈവർ വരുന്ന വഴിയിലാണെങ്കിൽ ക്യാൻസലേഷൻ ചാർജ് ഉണ്ടായേക്കാം.',
    reasonLabel: 'റദ്ദാക്കാനുള്ള കാരണം',
    confirmBtn: 'റദ്ദാക്കൽ സ്ഥിരീകരിക്കുക',
  },
  pinModal: {
    title: 'യാത്രാ സ്ഥിരീകരണ PIN നൽകുക',
    subtitle: 'യാത്ര തുടങ്ങുന്നതിന് മുൻപ് കസ്റ്റമറോട് 6 അക്ക PIN ചോദിക്കുക',
    submit: 'PIN ഉറപ്പാക്കുക',
  },
};
