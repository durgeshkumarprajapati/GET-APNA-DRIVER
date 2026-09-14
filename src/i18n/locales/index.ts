import { commonEn } from './en/common';
import { authEn } from './en/auth';
import { customerEn } from './en/customer';
import { driverEn } from './en/driver';
import { adminEn } from './en/admin';
import { bookingEn } from './en/booking';
import { errorsEn } from './en/errors';

import { commonHi } from './hi/common';
import { authHi } from './hi/auth';
import { customerHi } from './hi/customer';
import { driverHi } from './hi/driver';
import { adminHi } from './hi/admin';
import { bookingHi } from './hi/booking';
import { errorsHi } from './hi/errors';

import { commonGu } from './gu/common';
import { authGu } from './gu/auth';
import { customerGu } from './gu/customer';
import { driverGu } from './gu/driver';
import { adminGu } from './gu/admin';
import { bookingGu } from './gu/booking';
import { errorsGu } from './gu/errors';

export const dictionaries = {
  en: {
    common: commonEn,
    auth: authEn,
    customer: customerEn,
    driver: driverEn,
    admin: adminEn,
    booking: bookingEn,
    errors: errorsEn,
  },
  hi: {
    common: commonHi,
    auth: authHi,
    customer: customerHi,
    driver: driverHi,
    admin: adminHi,
    booking: bookingHi,
    errors: errorsHi,
  },
  gu: {
    common: commonGu,
    auth: authGu,
    customer: customerGu,
    driver: driverGu,
    admin: adminGu,
    booking: bookingGu,
    errors: errorsGu,
  },
} as const;

export type Dictionary = (typeof dictionaries)['en'];
