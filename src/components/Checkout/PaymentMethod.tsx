import React from "react";
import Image from "next/image";

const PaymentMethod = () => {
  return (
    <div className="bg-white shadow-1 rounded-[10px] mt-7.5">
      <div className="border-b border-gray-3 py-5 px-4 sm:px-8.5">
        <h3 className="font-medium text-xl text-dark">Payment Method</h3>
      </div>

      <div className="p-4 sm:p-8.5">
        <div className="rounded-md border-[0.5px] border-transparent bg-gray-2 py-3.5 px-5">
          <div className="flex items-center gap-4">
            <div className="flex h-4 w-4 items-center justify-center rounded-full border-4 border-blue"></div>
            <div className="flex items-center">
              <div className="pr-2.5">
                <Image src="/images/checkout/bank.svg" alt="chargily" width={29} height={12} />
              </div>

              <div className="border-l border-gray-4 pl-2.5">
                <p>Chargily (CIB / Edahabia)</p>
              </div>
            </div>
          </div>
          <p className="mt-2 text-custom-xs text-dark-4">
            This is the only payment method available for checkout.
          </p>
        </div>
      </div>
    </div>
  );
};

export default PaymentMethod;
