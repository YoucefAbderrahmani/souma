import Signup from "@/app/(site)/(pages)/signup/signup-form";

import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Signup Page | Souma Store Nextjs E-commerce",
  description: "This is Signup Page for Souma Store",
  // other metadata
};

const SignupPage = () => {
  return (
    <main>
      <Signup />
    </main>
  );
};

export default SignupPage;
