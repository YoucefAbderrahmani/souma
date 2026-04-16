"use client";

import Breadcrumb from "@/components/Common/Breadcrumb";
import Link from "next/link";
import { FormEvent, useState } from "react";

const ForgotPasswordPage = () => {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!email.trim()) return;
    setSubmitted(true);
  };

  return (
    <>
      <Breadcrumb title={"Forgot Password"} pages={["Forgot Password"]} />
      <section className="overflow-hidden bg-gray-2 py-20">
        <div className="mx-auto w-full max-w-[1170px] px-4 sm:px-8 xl:px-0">
          <div className="mx-auto w-full max-w-[560px] rounded-xl bg-white p-6 shadow-1 sm:p-10">
            <h2 className="text-2xl font-semibold text-dark">Reset your password</h2>
            <p className="mt-2 text-dark-4">
              Enter your account email and we&apos;ll send you password reset instructions.
            </p>

            <form className="mt-7" onSubmit={handleSubmit}>
              <label htmlFor="forgot-password-email" className="mb-2 block">
                Email
              </label>
              <input
                id="forgot-password-email"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="Enter your email"
                className="w-full rounded-lg border border-gray-3 bg-gray-1 px-5 py-3 outline-none duration-200 focus:border-transparent focus:shadow-input focus:ring-2 focus:ring-blue/20"
                required
              />

              <button
                type="submit"
                className="mt-5 inline-flex w-full items-center justify-center rounded-full bg-gradient-to-r from-blue to-[#6677ff] px-6 py-3 font-medium text-white shadow-2 transition hover:brightness-110"
              >
                Send reset instructions
              </button>
            </form>

            {submitted ? (
              <p className="mt-5 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
                If an account exists for <strong>{email}</strong>, reset instructions will be sent.
              </p>
            ) : null}

            <Link href="/signin" className="mt-6 inline-flex text-sm text-blue hover:text-blue-dark">
              Back to sign in
            </Link>
          </div>
        </div>
      </section>
    </>
  );
};

export default ForgotPasswordPage;
