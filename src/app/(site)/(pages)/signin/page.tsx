import Signin from "@/app/(site)/(pages)/signin/signin-form";
import React from "react";
import { Metadata } from "next";
export const metadata: Metadata = {
  title: "Signin Page | Vitrina Store Nextjs E-commerce",
  description: "This is Signin Page for Vitrina Store",
  // other metadata
};

const SigninPage = () => {
  return (
    <main>
      <Signin />
    </main>
  );
};

export default SigninPage;
