import React from "react";

type PersonalInfoValues = {
  firstName: string;
  lastName: string;
  email: string;
};

type BillingProps = {
  values: PersonalInfoValues;
  onChange: (field: keyof PersonalInfoValues, value: string) => void;
};

const Billing = ({ values, onChange }: BillingProps) => {
  return (
    <div className="mt-9">
      <h2 className="font-medium text-dark text-xl sm:text-2xl mb-5.5">
        Personal Information
      </h2>

      <div className="bg-white shadow-1 rounded-[10px] p-4 sm:p-8.5">
        <div className="flex flex-col lg:flex-row gap-5 sm:gap-8 mb-5">
          <div className="w-full">
            <label htmlFor="firstName" className="block mb-2.5">
              First Name <span className="text-red">*</span>
            </label>

            <input
              type="text"
              name="firstName"
              id="firstName"
              value={values.firstName}
              onChange={(event) => onChange("firstName", event.target.value)}
              placeholder="John"
              className="rounded-md border border-gray-3 bg-gray-1 placeholder:text-dark-5 w-full py-2.5 px-5 outline-none duration-200 focus:border-transparent focus:shadow-input focus:ring-2 focus:ring-blue/20"
            />
          </div>

          <div className="w-full">
            <label htmlFor="lastName" className="block mb-2.5">
              Last Name <span className="text-red">*</span>
            </label>

            <input
              type="text"
              name="lastName"
              id="lastName"
              value={values.lastName}
              onChange={(event) => onChange("lastName", event.target.value)}
              placeholder="Doe"
              className="rounded-md border border-gray-3 bg-gray-1 placeholder:text-dark-5 w-full py-2.5 px-5 outline-none duration-200 focus:border-transparent focus:shadow-input focus:ring-2 focus:ring-blue/20"
            />
          </div>
        </div>

        <div className="mb-5.5">
          <label htmlFor="email" className="block mb-2.5">
            Email Address <span className="text-red">*</span>
          </label>

          <input
            type="email"
            name="email"
            id="email"
            value={values.email}
            onChange={(event) => onChange("email", event.target.value)}
            className="rounded-md border border-gray-3 bg-gray-1 placeholder:text-dark-5 w-full py-2.5 px-5 outline-none duration-200 focus:border-transparent focus:shadow-input focus:ring-2 focus:ring-blue/20"
          />
        </div>
      </div>
    </div>
  );
};

export default Billing;
