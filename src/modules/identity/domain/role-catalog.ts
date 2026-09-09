/**
 * Initial system roles. New business roles should be added deliberately —
 * do not create a role per feature.
 */
export const SYSTEM_ROLE_CODES = {
  CUSTOMER: 'CUSTOMER',
  DRIVER: 'DRIVER',
  ADMINISTRATOR: 'ADMINISTRATOR',
} as const;

export type SystemRoleCode = (typeof SYSTEM_ROLE_CODES)[keyof typeof SYSTEM_ROLE_CODES];

export interface RoleSeedDefinition {
  code: SystemRoleCode;
  name: string;
  description: string;
}

export const SYSTEM_ROLES: readonly RoleSeedDefinition[] = [
  {
    code: SYSTEM_ROLE_CODES.CUSTOMER,
    name: 'Customer',
    description: 'Books and manages rides with drivers.',
  },
  {
    code: SYSTEM_ROLE_CODES.DRIVER,
    name: 'Driver',
    description: 'Provides driving services to customers.',
  },
  {
    code: SYSTEM_ROLE_CODES.ADMINISTRATOR,
    name: 'Administrator',
    description: 'Manages platform operations, users, and configuration.',
  },
];
