'use client';

import { DriverLayout } from '@/components/driver-layout';

export default function DriverDocumentVaultPage() {
  const docs = [
    {
      title: 'Commercial Driving License (DL-04201800921)',
      expiry: 'Valid till Nov 2029',
      status: 'VERIFIED 100%',
    },
    {
      title: 'State Police Background Clearance Certificate',
      expiry: 'Valid till Dec 2026',
      status: 'VERIFIED 100%',
    },
    {
      title: 'Aadhaar Biometric e-KYC Verification',
      expiry: 'Verified UIDAI',
      status: 'VERIFIED 100%',
    },
    {
      title: 'Luxury Fleet Academy Graduation Certificate',
      expiry: 'Lifetime Credential',
      status: 'VERIFIED 100%',
    },
  ];

  return (
    <DriverLayout>
      <div className="flex flex-col w-full px-6 py-6 gap-6">
        <div className="flex items-center justify-between p-6 rounded-xl bg-[#181c24] border border-[#262a33]">
          <div>
            <span className="text-[10px] font-bold text-[#68dba9] uppercase tracking-wider font-['Space_Grotesk'] block">
              STATUTORY COMPLIANCE &amp; CREDENTIALS
            </span>
            <h1 className="text-2xl sm:text-3xl font-bold text-[#dfe2ee] font-['Space_Grotesk']">
              Chauffeur Document Vault
            </h1>
            <p className="text-xs text-[#bccac0] mt-1">
              Encrypted vault storing government clearance certificates, commercial licenses, and
              drug test reports.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {docs.map((d, i) => (
            <div
              key={i}
              className="p-5 rounded-xl bg-[#181c24] border border-[#262a33] flex items-center justify-between"
            >
              <div>
                <h3 className="font-bold text-sm text-[#dfe2ee] font-['Space_Grotesk']">
                  {d.title}
                </h3>
                <span className="font-mono text-xs text-[#87948b] mt-0.5 block">{d.expiry}</span>
              </div>
              <span className="px-2.5 py-1 rounded bg-[#25a475]/20 text-[#68dba9] font-mono text-xs font-bold shrink-0">
                {d.status}
              </span>
            </div>
          ))}
        </div>
      </div>
    </DriverLayout>
  );
}
