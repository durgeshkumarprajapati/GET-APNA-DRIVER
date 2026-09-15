export const bookingBn = {
  status: {
    DRAFT: 'খসড়া',
    SEARCHING_DRIVER: 'ড্রাইভার খোঁজা হচ্ছে',
    DRIVER_ASSIGNED: 'ড্রাইভার নির্ধারিত হয়েছে',
    DRIVER_EN_ROUTE: 'পিকআপের উদ্দেশ্যে রওনা',
    DRIVER_ARRIVED: 'পিকআপ স্থানে পৌঁছেছেন',
    TRIP_IN_PROGRESS: 'রাইড চলমান',
    TRIP_COMPLETED: 'রাইড সম্পন্ন',
    CANCELLED: 'বাতিল করা হয়েছে',
    EXPIRED: 'মেয়াদ শেষ হয়েছে',
  },
  types: {
    ONE_WAY: 'একমুখী যাত্রা',
    ROUND_TRIP: 'উভয়মুখী যাত্রা',
    HOURLY: 'ঘণ্টা চুক্তি',
    FULL_DAY: 'সারাদিনের ড্রাইভার',
    MULTI_DAY: 'বহুদিনের শহরের বাইরের যাত্রা',
  },
  cancelModal: {
    title: 'বুকিং বাতিল করুন',
    description:
      'আপনি কি নিশ্চিত যে এই বুকিংটি বাতিল করতে চান? ড্রাইভার রওনা দিয়ে থাকলে বাতিল ফি প্রযোজ্য হতে পারে।',
    reasonLabel: 'বাতিল করার কারণ',
    confirmBtn: 'বাতিল নিশ্চিত করুন',
  },
  pinModal: {
    title: 'রাইড যাচাইকরণ PIN দিন',
    subtitle: 'রাইড শুরু করার আগে গ্রাহকের থেকে ৬ ডিজিটের PIN জানুন',
    submit: 'PIN যাচাই করুন',
  },
};
