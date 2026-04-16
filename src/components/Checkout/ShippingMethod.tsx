import React from "react";
import Image from "next/image";

const ShippingMethod = () => {
  return (
    <div className="bg-white shadow-1 rounded-[10px] mt-7.5">
      <div className="border-b border-gray-3 py-5 px-4 sm:px-8.5">
        <h3 className="font-medium text-xl text-dark">Shipping Method</h3>
      </div>

      <div className="p-4 sm:p-8.5">
        <div className="rounded-md border-[0.5px] border-transparent bg-gray-2 py-3.5 px-5">
          <div className="flex items-center gap-4">
            <div className="flex h-4 w-4 items-center justify-center rounded-full border-4 border-blue"></div>
            <div className="flex items-center">
              <div className="pr-2.5">
                <Image
                  src="/images/checkout/yalidine.png"
                  alt="Yalidine Express"
                  width={130}
                  height={48}
                />
              </div>
              <div className="border-l border-gray-4 pl-2.5">
                <p className="font-semibold text-dark whitespace-nowrap">Yalidine Express</p>
                <p className="text-custom-xs">This is the only shipping method available.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ShippingMethod;
