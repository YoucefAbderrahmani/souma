import React from "react";

type ShippingInfoValues = {
  address: string;
  addressLine2: string;
  town: string;
  country: string;
  phone: string;
};

type ShippingProps = {
  values: ShippingInfoValues;
  onChange: (field: keyof ShippingInfoValues, value: string) => void;
};

const Shipping = ({ values, onChange }: ShippingProps) => {

  return (
    <div className="bg-white shadow-1 rounded-[10px] mt-7.5">
      <div className="flex items-center gap-2.5 font-medium text-lg text-dark py-5 px-5.5 border-b border-gray-3">
        Shipping Information
      </div>

      <div className="p-4 sm:p-8.5">
        <div className="mb-5">
          <label htmlFor="address" className="block mb-2.5">
            Street Address
            <span className="text-red">*</span>
          </label>

          <input
            type="text"
            name="address"
            id="address"
            value={values.address}
            onChange={(event) => onChange("address", event.target.value)}
            placeholder="House number and street name"
            className="rounded-md border border-gray-3 bg-gray-1 placeholder:text-dark-5 w-full py-2.5 px-5 outline-none duration-200 focus:border-transparent focus:shadow-input focus:ring-2 focus:ring-blue/20"
          />

          <div className="mt-5">
            <input
              type="text"
              name="addressLine2"
              id="addressLine2"
              value={values.addressLine2}
              onChange={(event) => onChange("addressLine2", event.target.value)}
              placeholder="Apartment, suite, unit, etc. (optional)"
              className="rounded-md border border-gray-3 bg-gray-1 placeholder:text-dark-5 w-full py-2.5 px-5 outline-none duration-200 focus:border-transparent focus:shadow-input focus:ring-2 focus:ring-blue/20"
            />
          </div>
        </div>

        <div className="mb-5">
          <label htmlFor="town" className="block mb-2.5">
            Town/ City <span className="text-red">*</span>
          </label>

          <input
            type="text"
            name="town"
            id="town"
            value={values.town}
            onChange={(event) => onChange("town", event.target.value)}
            className="rounded-md border border-gray-3 bg-gray-1 placeholder:text-dark-5 w-full py-2.5 px-5 outline-none duration-200 focus:border-transparent focus:shadow-input focus:ring-2 focus:ring-blue/20"
          />
        </div>

        <div className="mb-5">
          <label htmlFor="country" className="block mb-2.5">
            Country
          </label>

          <input
            type="text"
            name="country"
            id="country"
            value={values.country}
            onChange={(event) => onChange("country", event.target.value)}
            className="rounded-md border border-gray-3 bg-gray-1 placeholder:text-dark-5 w-full py-2.5 px-5 outline-none duration-200 focus:border-transparent focus:shadow-input focus:ring-2 focus:ring-blue/20"
          />
        </div>

        <div className="mb-5">
          <label htmlFor="phone" className="block mb-2.5">
            Phone <span className="text-red">*</span>
          </label>

          <input
            type="text"
            name="phone"
            id="phone"
            value={values.phone}
            onChange={(event) => onChange("phone", event.target.value)}
            className="rounded-md border border-gray-3 bg-gray-1 placeholder:text-dark-5 w-full py-2.5 px-5 outline-none duration-200 focus:border-transparent focus:shadow-input focus:ring-2 focus:ring-blue/20"
          />
        </div>
      </div>
    </div>
  );
};

export default Shipping;
