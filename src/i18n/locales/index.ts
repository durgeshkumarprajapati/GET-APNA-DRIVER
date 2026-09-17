import { commonEn } from './en/common';
import { authEn } from './en/auth';
import { customerEn } from './en/customer';
import { driverEn } from './en/driver';
import { adminEn } from './en/admin';
import { bookingEn } from './en/booking';
import { errorsEn } from './en/errors';
import { experienceEn } from './en/experience';

import { commonHi } from './hi/common';
import { authHi } from './hi/auth';
import { customerHi } from './hi/customer';
import { driverHi } from './hi/driver';
import { adminHi } from './hi/admin';
import { bookingHi } from './hi/booking';
import { errorsHi } from './hi/errors';
import { experienceHi } from './hi/experience';

import { commonGu } from './gu/common';
import { authGu } from './gu/auth';
import { customerGu } from './gu/customer';
import { driverGu } from './gu/driver';
import { adminGu } from './gu/admin';
import { bookingGu } from './gu/booking';
import { errorsGu } from './gu/errors';
import { experienceGu } from './gu/experience';

import { commonMr } from './mr/common';
import { authMr } from './mr/auth';
import { customerMr } from './mr/customer';
import { driverMr } from './mr/driver';
import { adminMr } from './mr/admin';
import { bookingMr } from './mr/booking';
import { errorsMr } from './mr/errors';
import { experienceMr } from './mr/experience';

import { commonTa } from './ta/common';
import { authTa } from './ta/auth';
import { customerTa } from './ta/customer';
import { driverTa } from './ta/driver';
import { adminTa } from './ta/admin';
import { bookingTa } from './ta/booking';
import { errorsTa } from './ta/errors';
import { experienceTa } from './ta/experience';

import { commonTe } from './te/common';
import { authTe } from './te/auth';
import { customerTe } from './te/customer';
import { driverTe } from './te/driver';
import { adminTe } from './te/admin';
import { bookingTe } from './te/booking';
import { errorsTe } from './te/errors';
import { experienceTe } from './te/experience';

import { commonKn } from './kn/common';
import { authKn } from './kn/auth';
import { customerKn } from './kn/customer';
import { driverKn } from './kn/driver';
import { adminKn } from './kn/admin';
import { bookingKn } from './kn/booking';
import { errorsKn } from './kn/errors';
import { experienceKn } from './kn/experience';

import { commonMl } from './ml/common';
import { authMl } from './ml/auth';
import { customerMl } from './ml/customer';
import { driverMl } from './ml/driver';
import { adminMl } from './ml/admin';
import { bookingMl } from './ml/booking';
import { errorsMl } from './ml/errors';
import { experienceMl } from './ml/experience';

import { commonPa } from './pa/common';
import { authPa } from './pa/auth';
import { customerPa } from './pa/customer';
import { driverPa } from './pa/driver';
import { adminPa } from './pa/admin';
import { bookingPa } from './pa/booking';
import { errorsPa } from './pa/errors';
import { experiencePa } from './pa/experience';

import { commonBn } from './bn/common';
import { authBn } from './bn/auth';
import { customerBn } from './bn/customer';
import { driverBn } from './bn/driver';
import { adminBn } from './bn/admin';
import { bookingBn } from './bn/booking';
import { errorsBn } from './bn/errors';
import { experienceBn } from './bn/experience';

export const dictionaries = {
  en: {
    common: commonEn,
    auth: authEn,
    customer: customerEn,
    driver: driverEn,
    admin: adminEn,
    booking: bookingEn,
    errors: errorsEn,
    experience: experienceEn,
  },
  hi: {
    common: commonHi,
    auth: authHi,
    customer: customerHi,
    driver: driverHi,
    admin: adminHi,
    booking: bookingHi,
    errors: errorsHi,
    experience: experienceHi,
  },
  gu: {
    common: commonGu,
    auth: authGu,
    customer: customerGu,
    driver: driverGu,
    admin: adminGu,
    booking: bookingGu,
    errors: errorsGu,
    experience: experienceGu,
  },
  mr: {
    common: commonMr,
    auth: authMr,
    customer: customerMr,
    driver: driverMr,
    admin: adminMr,
    booking: bookingMr,
    errors: errorsMr,
    experience: experienceMr,
  },
  ta: {
    common: commonTa,
    auth: authTa,
    customer: customerTa,
    driver: driverTa,
    admin: adminTa,
    booking: bookingTa,
    errors: errorsTa,
    experience: experienceTa,
  },
  te: {
    common: commonTe,
    auth: authTe,
    customer: customerTe,
    driver: driverTe,
    admin: adminTe,
    booking: bookingTe,
    errors: errorsTe,
    experience: experienceTe,
  },
  kn: {
    common: commonKn,
    auth: authKn,
    customer: customerKn,
    driver: driverKn,
    admin: adminKn,
    booking: bookingKn,
    errors: errorsKn,
    experience: experienceKn,
  },
  ml: {
    common: commonMl,
    auth: authMl,
    customer: customerMl,
    driver: driverMl,
    admin: adminMl,
    booking: bookingMl,
    errors: errorsMl,
    experience: experienceMl,
  },
  pa: {
    common: commonPa,
    auth: authPa,
    customer: customerPa,
    driver: driverPa,
    admin: adminPa,
    booking: bookingPa,
    errors: errorsPa,
    experience: experiencePa,
  },
  bn: {
    common: commonBn,
    auth: authBn,
    customer: customerBn,
    driver: driverBn,
    admin: adminBn,
    booking: bookingBn,
    errors: errorsBn,
    experience: experienceBn,
  },
} as const;

export type Dictionary = (typeof dictionaries)['en'];
