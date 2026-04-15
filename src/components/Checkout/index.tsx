"use client";
import React, { useMemo, useState } from "react";
import Breadcrumb from "../Common/Breadcrumb";
import { sequenceEndPurchase } from "@/lib/sequence-client";
import Login from "./Login";
import Shipping from "./Shipping";
import ShippingMethod from "./ShippingMethod";
import PaymentMethod from "./PaymentMethod";
import Coupon from "./Coupon";
import Billing from "./Billing";
import { useAppSelector } from "@/redux/store";
import { selectTotalPrice } from "@/redux/features/cart-slice";
import { useSelector } from "react-redux";
import { useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { useSession } from "@/app/context/SessionProvider";

type CheckoutFormValues = {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  address: string;
  addressLine2: string;
  town: string;
  country: string;
  notes: string;
};

const INITIAL_FORM_VALUES: CheckoutFormValues = {
  firstName: "",
  lastName: "",
  email: "",
  phone: "",
  address: "",
  addressLine2: "",
  town: "",
  country: "",
  notes: "",
};

const Checkout = () => {
  const cartItems = useAppSelector((state) => state.cartReducer.items);
  const totalPrice = useSelector(selectTotalPrice);
  const searchParams = useSearchParams();
  const { session, isPending } = useSession();
  const [errorMessage, setErrorMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formValues, setFormValues] = useState<CheckoutFormValues>(INITIAL_FORM_VALUES);

  const userId = session?.user?.id?.trim() || "guest";
  const storageKey = `souma_checkout_profile_${userId}`;

  const updateField = (field: keyof CheckoutFormValues, value: string) => {
    setFormValues((prev) => ({ ...prev, [field]: value }));
  };

  const paymentStatus = searchParams.get("payment");
  const paymentBanner = useMemo(() => {
    if (paymentStatus === "success") {
      return {
        text: "Payment completed successfully. Thank you for your order.",
        className: "border-green-300 bg-green-50 text-green-700",
      };
    }
    if (paymentStatus === "failed") {
      return {
        text: "Payment failed or was cancelled. Please try again.",
        className: "border-red-300 bg-red-50 text-red-700",
      };
    }
    return null;
  }, [paymentStatus]);

  React.useEffect(() => {
    if (isPending) return;

    const sessionDefaults: CheckoutFormValues = {
      ...INITIAL_FORM_VALUES,
      firstName: session?.user?.name ?? "",
      lastName: session?.user?.lastname ?? "",
      email: session?.user?.email ?? "",
      phone: session?.user?.phone ?? "",
      country: "Algeria",
    };

    try {
      const saved = window.localStorage.getItem(storageKey);
      if (!saved) {
        setFormValues(sessionDefaults);
        return;
      }
      const parsed = JSON.parse(saved) as Partial<CheckoutFormValues>;
      setFormValues({
        ...sessionDefaults,
        ...parsed,
        firstName: parsed.firstName || sessionDefaults.firstName,
        lastName: parsed.lastName || sessionDefaults.lastName,
        email: parsed.email || sessionDefaults.email,
        phone: parsed.phone || sessionDefaults.phone,
      });
    } catch {
      setFormValues(sessionDefaults);
    }
  }, [isPending, session?.user?.email, session?.user?.id, session?.user?.lastname, session?.user?.name, session?.user?.phone, storageKey]);

  React.useEffect(() => {
    if (isPending) return;
    window.localStorage.setItem(storageKey, JSON.stringify(formValues));
  }, [formValues, isPending, storageKey]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setErrorMessage("");

    if (cartItems.length === 0) {
      const msg = "Your cart is empty. Add products before checkout.";
      setErrorMessage(msg);
      toast.error(msg);
      return;
    }

    const firstName = formValues.firstName.trim();
    const lastName = formValues.lastName.trim();
    const email = formValues.email.trim();
    const phone = formValues.phone.trim();
    const address = formValues.address.trim();
    const town = formValues.town.trim();
    const country = formValues.country.trim();
    const notes = formValues.notes.trim();
    const addressLine2 = formValues.addressLine2.trim();

    if (!firstName || !lastName || !email || !phone || !address || !town) {
      const msg = "Please fill all required billing fields before payment.";
      setErrorMessage(msg);
      toast.error(msg);
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch("/api/payments/chargily/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          total: totalPrice,
          items: cartItems.map((item) => ({
            id: item.id,
            title: item.title,
            quantity: item.quantity,
            unitPrice: item.discountedPrice,
          })),
          firstName,
          lastName,
          email,
          phone,
          address,
          addressLine2,
          town,
          country,
          notes,
        }),
      });

      const data = (await response.json()) as {
        error?: string;
        checkoutUrl?: string;
      };

      if (!response.ok || !data.checkoutUrl) {
        throw new Error(data.error || "Failed to start Chargily checkout.");
      }

      sequenceEndPurchase();
      window.location.assign(data.checkoutUrl);
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Unable to connect to payment provider. Please try again.";
      setErrorMessage(
        message
      );
      toast.error(message);
      window.scrollTo({ top: 0, behavior: "smooth" });
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <Breadcrumb title={"Checkout"} pages={["checkout"]} />
      <section className="overflow-hidden py-20 bg-gray-2">
        <div className="max-w-[1170px] w-full mx-auto px-4 sm:px-8 xl:px-0">
          {paymentBanner ? (
            <div
              className={`mb-6 rounded-lg border px-4 py-3 text-sm font-medium ${paymentBanner.className}`}
            >
              {paymentBanner.text}
            </div>
          ) : null}

          <form onSubmit={handleSubmit}>
            <div className="flex flex-col lg:flex-row gap-7.5 xl:gap-11">
              {/* <!-- checkout left --> */}
              <div className="lg:max-w-[670px] w-full">
                {/* <!-- login box --> */}
                <Login />

                {/* <!-- billing details --> */}
                <Billing
                  values={{
                    firstName: formValues.firstName,
                    lastName: formValues.lastName,
                    email: formValues.email,
                  }}
                  onChange={updateField}
                />

                {/* <!-- address box two --> */}
                <Shipping
                  values={{
                    address: formValues.address,
                    addressLine2: formValues.addressLine2,
                    town: formValues.town,
                    country: formValues.country,
                    phone: formValues.phone,
                  }}
                  onChange={updateField}
                />

                {/* <!-- others note box --> */}
                <div className="bg-white shadow-1 rounded-[10px] p-4 sm:p-8.5 mt-7.5">
                  <div>
                    <label htmlFor="notes" className="block mb-2.5">
                      Other Notes (optional)
                    </label>

                    <textarea
                      name="notes"
                      id="notes"
                      value={formValues.notes}
                      onChange={(event) => updateField("notes", event.target.value)}
                      rows={5}
                      placeholder="Notes about your order, e.g. speacial notes for delivery."
                      className="rounded-md border border-gray-3 bg-gray-1 placeholder:text-dark-5 w-full p-5 outline-none duration-200 focus:border-transparent focus:shadow-input focus:ring-2 focus:ring-blue/20"
                    ></textarea>
                  </div>
                </div>
              </div>

              {/* // <!-- checkout right --> */}
              <div className="max-w-[455px] w-full">
                {/* <!-- order list box --> */}
                <div className="bg-white shadow-1 rounded-[10px]">
                  <div className="border-b border-gray-3 py-5 px-4 sm:px-8.5">
                    <h3 className="font-medium text-xl text-dark">
                      Your Order
                    </h3>
                  </div>

                  <div className="pt-2.5 pb-8.5 px-4 sm:px-8.5">
                    {/* <!-- title --> */}
                    <div className="flex items-center justify-between py-5 border-b border-gray-3">
                      <div>
                        <h4 className="font-medium text-dark">Product</h4>
                      </div>
                      <div>
                        <h4 className="font-medium text-dark text-right">
                          Subtotal
                        </h4>
                      </div>
                    </div>

                    {/* <!-- product item --> */}
                    {cartItems.length > 0 ? (
                      cartItems.map((item) => (
                        <div
                          key={item.id}
                          className="flex items-center justify-between py-5 border-b border-gray-3"
                        >
                          <div>
                            <p className="text-dark">
                              {item.title} x {item.quantity}
                            </p>
                          </div>
                          <div>
                            <p className="text-dark text-right whitespace-nowrap">
                              {(item.discountedPrice * item.quantity).toFixed(2)} DA
                            </p>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="py-5 border-b border-gray-3">
                        <p className="text-dark-4">Your cart is empty.</p>
                      </div>
                    )}

                    {/* <!-- total --> */}
                    <div className="flex items-center justify-between pt-5">
                      <div>
                        <p className="font-medium text-lg text-dark">Total</p>
                      </div>
                      <div>
                        <p className="font-medium text-lg text-dark text-right whitespace-nowrap">
                          {totalPrice.toFixed(2)} DA
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* <!-- coupon box --> */}
                <Coupon />

                {/* <!-- shipping box --> */}
                <ShippingMethod />

                {/* <!-- payment box --> */}
                <PaymentMethod />

                {/* <!-- checkout button --> */}
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full flex justify-center font-medium text-white bg-blue py-3 px-6 rounded-md ease-out duration-200 hover:bg-blue-dark mt-7.5 disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {isSubmitting ? "Redirecting to Chargily..." : "Pay with Chargily"}
                </button>
                {cartItems.length === 0 ? (
                  <p className="mt-3 rounded-md border border-amber-300 bg-amber-50 px-4 py-2 text-sm text-amber-700">
                    Your cart is empty. Add products first, then click checkout.
                  </p>
                ) : null}
                {errorMessage ? (
                  <p className="mt-3 rounded-md border border-red-300 bg-red-50 px-4 py-2 text-sm text-red-700">
                    {errorMessage}
                  </p>
                ) : null}
              </div>
            </div>
          </form>
        </div>
      </section>
    </>
  );
};

export default Checkout;
