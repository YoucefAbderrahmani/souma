import { Metadata } from "next";
import Breadcrumb from "@/components/Common/Breadcrumb";

export const metadata: Metadata = {
  title: "Refund Policy | Souma Store",
  description: "Read the Souma Store return and refund policy.",
};

const RefundPolicyPage = () => {
  return (
    <main>
      <Breadcrumb title={"Refund Policy"} pages={["Refund Policy"]} />
      <section className="overflow-hidden bg-gray-2 py-20">
        <div className="mx-auto w-full max-w-[1170px] px-4 sm:px-8 xl:px-0">
          <div className="rounded-xl bg-white p-6 shadow-1 sm:p-10">
            <h1 className="text-2xl font-semibold text-dark">Refund Policy</h1>
            <p className="mt-4 text-dark-4">
              Refunds can be requested for eligible products returned in original condition within the
              allowed return window. Once approved, refunds are issued to the original payment method.
            </p>
          </div>
        </div>
      </section>
    </main>
  );
};

export default RefundPolicyPage;
