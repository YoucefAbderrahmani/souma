import React from "react";
import { Metadata } from "next";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import Link from "next/link";
import { eq } from "drizzle-orm";
import { auth } from "@/server/lib/auth";
import { db } from "@/server/db";
import { user } from "@/server/db/schema";
import SequencesLiveTable from "@/components/Admin/SequencesLiveTable";
import { listSequencesForAdmin, toShoppingSequenceDTOs } from "@/server/sequence/sequence-db";

export const metadata: Metadata = {
  title: "Sequences | Souma Store",
  description: "Shopping funnel sequences (admin)",
};

const SequenceAdminPage = async () => {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user) {
    redirect("/signin");
  }

  const currentUser = await db
    .select({ role: user.role })
    .from(user)
    .where(eq(user.id, session.user.id))
    .limit(1);

  if (currentUser[0]?.role !== "admin") {
    return (
      <main className="overflow-hidden pb-20 pt-40 sm:pt-44 lg:pt-36 xl:pt-45">
        <section className="max-w-[1170px] w-full mx-auto px-4 sm:px-8 xl:px-0">
          <div className="rounded-lg border border-gray-3 bg-white p-8 text-center">
            <h1 className="text-2xl font-semibold text-dark">Sequences</h1>
            <p className="mt-3 text-dark-4">You do not have permission to access this page.</p>
            <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
              <Link
                href="/my-account"
                className="rounded-md border border-gray-3 px-4 py-2 text-sm font-medium text-dark hover:border-blue hover:text-blue"
              >
                Go to My Account
              </Link>
              <Link
                href="/admin"
                className="rounded-md border border-gray-3 px-4 py-2 text-sm font-medium text-dark hover:border-blue hover:text-blue"
              >
                Admin home
              </Link>
            </div>
          </div>
        </section>
      </main>
    );
  }

  const initialSequences = toShoppingSequenceDTOs(await listSequencesForAdmin(500));

  return (
    <main className="overflow-hidden pb-20 pt-40 sm:pt-44 lg:pt-36 xl:pt-45">
      <section className="max-w-[1170px] w-full mx-auto px-4 sm:px-8 xl:px-0">
        <div className="mb-8 flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm text-dark-4">Admin</p>
            <h1 className="text-2xl font-semibold text-dark">Shopping sequences</h1>
            <p className="mt-1 max-w-2xl text-sm text-dark-4">
              Rows are created when a visitor searches, opens a category, or opens a product. They close
              after a product page visit when the user leaves that page or completes checkout.
            </p>
          </div>
          <Link
            href="/admin"
            className="rounded-md border border-gray-3 px-4 py-2 text-sm font-medium text-dark hover:border-blue hover:text-blue"
          >
            Back to admin
          </Link>
        </div>

        <SequencesLiveTable initialSequences={initialSequences} />
      </section>
    </main>
  );
};

export default SequenceAdminPage;
