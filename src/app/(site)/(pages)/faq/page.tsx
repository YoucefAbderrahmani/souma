import { Metadata } from "next";
import Breadcrumb from "@/components/Common/Breadcrumb";

export const metadata: Metadata = {
  title: "FAQ | Vitrina Store",
  description: "Frequently asked questions about Vitrina Store.",
};

const FaqPage = () => {
  return (
    <main>
      <Breadcrumb title={"FAQ"} pages={["FAQ"]} />
      <section className="overflow-hidden bg-gray-2 py-20">
        <div className="mx-auto w-full max-w-[1170px] px-4 sm:px-8 xl:px-0">
          <div className="rounded-xl bg-white p-6 shadow-1 sm:p-10">
            <h1 className="text-2xl font-semibold text-dark">Frequently Asked Questions</h1>
            <div className="mt-5 space-y-4 text-dark-4">
              <p>
                <strong className="text-dark">How can I track my order?</strong> Track updates from
                your account orders section once your order is confirmed.
              </p>
              <p>
                <strong className="text-dark">Can I return an item?</strong> Yes, eligible items can
                be returned within the return period in original condition.
              </p>
              <p>
                <strong className="text-dark">Need help?</strong> Reach us through the contact page and
                our team will assist you.
              </p>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
};

export default FaqPage;
