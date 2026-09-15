export const bookingGu = {
  status: {
    DRAFT: 'ડ્રાફ્ટ',
    SEARCHING_DRIVER: 'ડ્રાઇવરની શોધ ચાલુ',
    DRIVER_ASSIGNED: 'ડ્રાઇવર ફાળવવામાં આવેલ',
    DRIVER_EN_ROUTE: 'પિકઅપ માટે રસ્તામાં',
    DRIVER_ARRIVED: 'પિકઅપ સ્થળે પહોંચ્યા',
    TRIP_IN_PROGRESS: 'મુસાફરી ચાલુ છે',
    TRIP_COMPLETED: 'મુસાફરી પૂર્ણ',
    CANCELLED: 'રદ કરેલ',
    EXPIRED: 'ઓફર પૂરી થઈ',
  },
  types: {
    ONE_WAY: 'એક તરફી',
    ROUND_TRIP: 'આવવા-જવાનું',
    HOURLY: 'કલાકના હિસાબે ભાડે',
    FULL_DAY: 'આખા દિવસનો ડ્રાઇવર',
    MULTI_DAY: 'આઉટસ્ટેશન બહુ-દિવસીય',
  },
  cancelModal: {
    title: 'બુકિંગ રદ કરો',
    description:
      'શું તમે ખરેખર આ બુકિંગ રદ કરવા માંગો છો? જો ડ્રાઇવર રસ્તામાં હોય તો રદ કરવાનો ચાર્જ લાગુ થઈ શકે છે.',
    reasonLabel: 'રદ કરવાનું કારણ',
    confirmBtn: 'રદ કરવાની પુષ્ટિ કરો',
  },
  pinModal: {
    title: 'રાઇડ ચકાસણી પિન દાખલ કરો',
    subtitle: 'મુસાફરી શરૂ કરતા પહેલા ગ્રાહક પાસેથી 6-અંકનો પિન મેળવો',
    submit: 'પિન ચકાસો',
  },
};
