import { Metadata } from "next";
import Breadcrumb from "@/components/Common/Breadcrumb";

export const metadata: Metadata = {
  title: "Privacy Policy | Vitrina Store",
  description: "Read how Vitrina Store handles and protects personal data.",
};

const PrivacyPolicyPage = () => {
  return (
    <main>
      <Breadcrumb title={"Privacy Policy"} pages={["Privacy Policy"]} />
      <section className="overflow-hidden bg-gray-2 py-20">
        <div className="mx-auto w-full max-w-[1170px] px-4 sm:px-8 xl:px-0">
          <div className="rounded-xl bg-white p-6 shadow-1 sm:p-10">
            <h1 className="text-2xl font-semibold text-dark">Privacy Policy</h1>
            <p className="mt-4 text-dark-4">
              We only collect information required to process orders, support your account, and improve
              your experience. We do not sell your personal data. Contact us at
              support@vitrina-store.dz for any privacy request.
            </p>
          </div>
        </div>
      </section>
    </main>
  );
};

export default PrivacyPolicyPage;
