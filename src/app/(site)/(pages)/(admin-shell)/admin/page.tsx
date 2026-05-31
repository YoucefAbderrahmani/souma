import React from "react";
import { Metadata } from "next";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import Link from "next/link";
import { desc, eq, sql } from "drizzle-orm";
import { auth } from "@/server/lib/auth";
import { getSessionAccess } from "@/server/lib/staff-access";
import { roleDisplayLabel } from "@/lib/user-roles";
import { db } from "@/server/db";
import { categoryTable, productsTable, user } from "@/server/db/schema";
import { ensureAllShopDataProductsInDatabase } from "@/server/data-access/product-catalog";
import AdminPanels from "./AdminPanels";

export const metadata: Metadata = {
  title: "Admin Panel | Vitrina Store",
  description: "Admin dashboard for Vitrina Store",
};

const AdminPage = async () => {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user) {
    redirect("/signin");
  }

  const access = await getSessionAccess(await headers());
  if (!access?.isStaff) {
    return (
      <main className="overflow-hidden pb-20 pt-40 sm:pt-44 lg:pt-36 xl:pt-45">
        <section className="max-w-[1170px] w-full mx-auto px-4 sm:px-8 xl:px-0">
          <div className="rounded-lg border border-gray-3 bg-white p-8 text-center">
            <h1 className="text-2xl font-semibold text-dark">Admin Panel</h1>
            <p className="mt-3 text-dark-4">
              You do not have permission to access this page.
            </p>
            <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
              <Link
                href="/my-account"
                className="rounded-md border border-gray-3 px-4 py-2 text-sm font-medium text-dark hover:border-[#FB923C] hover:text-[#FB923C]"
              >
                Go to My Account
              </Link>
              <Link
                href="/"
                className="rounded-md border border-gray-3 px-4 py-2 text-sm font-medium text-dark hover:border-[#FB923C] hover:text-[#FB923C]"
              >
                Back to Home
              </Link>
            </div>
          </div>
        </section>
      </main>
    );
  }

  try {
    await ensureAllShopDataProductsInDatabase();
  } catch (error) {
    console.error("[admin] ensureAllShopDataProductsInDatabase", error);
  }

  const [usersData, productsData, basicStats] = await Promise.all([
    db
      .select({
        id: user.id,
        name: user.name,
        lastname: user.lastname,
        email: user.email,
        role: user.role,
        createdAt: user.createdAt,
      })
      .from(user)
      .orderBy(desc(user.createdAt)),
    db
      .select({
        id: productsTable.id,
        title: productsTable.title,
        slug: productsTable.slug,
        price: productsTable.price,
        jomlaPrice: productsTable.jomlaPrice,
        rating: productsTable.rating,
        instock: productsTable.instock,
        manufacturer: productsTable.manufacturer,
        mainimage: productsTable.mainimage,
        description: productsTable.description,
        categoryName: sql<string>`coalesce(${categoryTable.name}, 'Catalog')`.as("categoryName"),
      })
      .from(productsTable)
      .leftJoin(categoryTable, eq(productsTable.categoryId, categoryTable.id))
      .orderBy(desc(productsTable.id)),
    db.select({
      users: sql<number>`(select count(*) from "user")`,
      products: sql<number>`(select count(*) from "products")`,
      categories: sql<number>`(select count(*) from "category")`,
    }),
  ]);

  return (
    <main className="overflow-hidden bg-gray-2 pb-20 pt-40 sm:pt-44 lg:pt-36 xl:pt-45">
      <section className="max-w-[1170px] w-full mx-auto px-4 sm:px-8 xl:px-0">
        <div className="relative mb-8 overflow-hidden rounded-xl border border-gray-3 bg-white p-5 shadow-1 before:pointer-events-none before:absolute before:inset-0 before:bg-gradient-to-br before:from-orange/10 before:via-white before:to-orange/5 sm:p-6">
          <div className="relative z-[1] flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-dark-4">Admin dashboard</p>
              <p className="text-sm text-dark-4">Welcome back</p>
              <h1 className="text-2xl font-semibold text-dark">Admin Panel</h1>
            </div>
            <span className="rounded-md border border-orange/25 bg-orange/10 px-3 py-1 text-xs font-semibold text-orange-dark">
              Role: {roleDisplayLabel(access.role)}
            </span>
          </div>
        </div>

        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-dark">Store overview</h2>
            <p className="text-custom-sm text-dark-4">Quick counts and shortcuts for daily operations.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          <div className="rounded-xl border border-gray-3 bg-white p-5 shadow-1">
            <p className="text-custom-sm text-dark-4">Users</p>
            <p className="mt-2 text-2xl font-semibold text-dark">{Number(basicStats[0]?.users ?? 0)}</p>
          </div>
          <div className="rounded-xl border border-gray-3 bg-white p-5 shadow-1">
            <p className="text-custom-sm text-dark-4">Products</p>
            <p className="mt-2 text-2xl font-semibold text-dark">{Number(basicStats[0]?.products ?? 0)}</p>
          </div>
          <div className="rounded-xl border border-gray-3 bg-white p-5 shadow-1">
            <p className="text-custom-sm text-dark-4">Categories</p>
            <p className="mt-2 text-2xl font-semibold text-dark">{Number(basicStats[0]?.categories ?? 0)}</p>
          </div>
        </div>

        <AdminPanels
          users={usersData.map((u) => ({
            ...u,
            createdAt: u.createdAt.toISOString(),
          }))}
          products={productsData}
          canManageRoles={access.isRoleAdmin}
          actorEmail={access.email}
        />
      </section>
    </main>
  );
};

export default AdminPage;
