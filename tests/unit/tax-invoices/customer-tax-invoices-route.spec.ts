jest.mock('@/shared/config/env', () => ({
  env: {
    AUTH_SESSION_COOKIE_NAME: 'gad_session',
    NODE_ENV: 'test',
    LOG_LEVEL: 'silent',
  },
}));

jest.mock('@/modules/identity/application/services/principal-service', () => ({
  getPrincipalFromSessionToken: jest.fn(),
}));

jest.mock('@/modules/tax-invoices/invoice-service', () => ({
  getCustomerInvoices: jest.fn(),
  getCustomerInvoiceById: jest.fn(),
}));

import { NextRequest } from 'next/server';
import { GET as listInvoicesGet } from '@/app/api/customer/tax-invoices/route';
import { GET as invoiceDetailGet } from '@/app/api/customer/tax-invoices/[invoiceId]/route';
import { getPrincipalFromSessionToken } from '@/modules/identity/application/services/principal-service';
import {
  getCustomerInvoices,
  getCustomerInvoiceById,
} from '@/modules/tax-invoices/invoice-service';

const mockedGetPrincipal = getPrincipalFromSessionToken as jest.Mock;
const mockedGetCustomerInvoices = getCustomerInvoices as jest.Mock;
const mockedGetCustomerInvoiceById = getCustomerInvoiceById as jest.Mock;

function authRequest(url: string) {
  return new NextRequest(url, { headers: { authorization: 'Bearer mock-token' } });
}

describe('GET /api/customer/tax-invoices', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedGetPrincipal.mockResolvedValue({
      userId: 'customer-a',
      accountStatus: 'ACTIVE',
      roles: ['CUSTOMER'],
      permissions: [],
    });
  });

  it('rejects an unauthenticated request with 401', async () => {
    mockedGetPrincipal.mockResolvedValue(null);
    const res = await listInvoicesGet(authRequest('http://localhost/api/customer/tax-invoices'));
    expect(res.status).toBe(401);
    expect(mockedGetCustomerInvoices).not.toHaveBeenCalled();
  });

  it('derives the customer strictly from the session, never from a query parameter', async () => {
    mockedGetCustomerInvoices.mockResolvedValue([]);
    await listInvoicesGet(
      authRequest('http://localhost/api/customer/tax-invoices?customerId=customer-b'),
    );
    expect(mockedGetCustomerInvoices).toHaveBeenCalledWith('customer-a');
  });

  it('returns the invoices wrapped in the standard envelope', async () => {
    mockedGetCustomerInvoices.mockResolvedValue([{ id: 'inv-1', invoiceNumber: 'INV-1' }]);
    const res = await listInvoicesGet(authRequest('http://localhost/api/customer/tax-invoices'));
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body).toEqual({ success: true, invoices: [{ id: 'inv-1', invoiceNumber: 'INV-1' }] });
  });
});

describe('GET /api/customer/tax-invoices/[invoiceId] — IDOR regression', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const routeContext = (invoiceId: string) => ({ params: Promise.resolve({ invoiceId }) });

  it('rejects an unauthenticated request with 401', async () => {
    mockedGetPrincipal.mockResolvedValue(null);
    const res = await invoiceDetailGet(
      authRequest('http://localhost/api/customer/tax-invoices/inv-1'),
      routeContext('inv-1'),
    );
    expect(res.status).toBe(401);
    expect(mockedGetCustomerInvoiceById).not.toHaveBeenCalled();
  });

  it("customer A requesting customer B's invoice ID gets 404, never the invoice", async () => {
    mockedGetPrincipal.mockResolvedValue({
      userId: 'customer-a',
      accountStatus: 'ACTIVE',
      roles: ['CUSTOMER'],
      permissions: [],
    });
    // The service itself enforces ownership (findFirst({ where: { id, customerId } }))
    // — from customer A's perspective, customer B's invoice simply does not exist.
    mockedGetCustomerInvoiceById.mockResolvedValue(null);

    const res = await invoiceDetailGet(
      authRequest('http://localhost/api/customer/tax-invoices/invoice-belonging-to-b'),
      routeContext('invoice-belonging-to-b'),
    );

    expect(mockedGetCustomerInvoiceById).toHaveBeenCalledWith(
      'customer-a',
      'invoice-belonging-to-b',
    );
    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.error).toBe('INVOICE_NOT_FOUND');
  });

  it("customer A retrieving A's own invoice succeeds", async () => {
    mockedGetPrincipal.mockResolvedValue({
      userId: 'customer-a',
      accountStatus: 'ACTIVE',
      roles: ['CUSTOMER'],
      permissions: [],
    });
    mockedGetCustomerInvoiceById.mockResolvedValue({ id: 'inv-1', invoiceNumber: 'INV-1' });

    const res = await invoiceDetailGet(
      authRequest('http://localhost/api/customer/tax-invoices/inv-1'),
      routeContext('inv-1'),
    );

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual({ success: true, invoice: { id: 'inv-1', invoiceNumber: 'INV-1' } });
  });

  it('never derives ownership from a client-supplied id beyond what the service enforces', async () => {
    mockedGetPrincipal.mockResolvedValue({
      userId: 'customer-a',
      accountStatus: 'ACTIVE',
      roles: ['CUSTOMER'],
      permissions: [],
    });
    mockedGetCustomerInvoiceById.mockResolvedValue(null);

    await invoiceDetailGet(
      authRequest('http://localhost/api/customer/tax-invoices/inv-1?customerId=customer-b'),
      routeContext('inv-1'),
    );

    // The service call is always keyed on the session-derived userId first —
    // the query string is never read by the route at all.
    expect(mockedGetCustomerInvoiceById).toHaveBeenCalledWith('customer-a', 'inv-1');
  });
});
