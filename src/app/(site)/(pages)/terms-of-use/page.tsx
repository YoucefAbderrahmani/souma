import { Metadata } from "next";
import Breadcrumb from "@/components/Common/Breadcrumb";

export const metadata: Metadata = {
  title: "Terms of Use | Souma Store",
  description: "Souma Store website and service terms.",
};

const TermsOfUsePage = () => {
  return (
    <main>
      <Breadcrumb title={"Terms of Use"} pages={["Terms of Use"]} />
      <section className="overflow-hidden bg-gray-2 py-20">
        <div className="mx-auto w-full max-w-[1170px] px-4 sm:px-8 xl:px-0">
          <div className="rounded-xl bg-white p-6 shadow-1 sm:p-10">
            <h1 className="text-2xl font-semibold text-dark">Terms of Use</h1>
            <p className="mt-4 text-dark-4">
              By using Souma Store, you agree to our terms covering account usage, order processing,
              content ownership, and acceptable use of the platform.
            </p>
          </div>
        </div>
      </section>
    </main>
  );
};

export default TermsOfUsePage;
