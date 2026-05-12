"use client";

import { SignUp, useUser } from "@clerk/nextjs";
import React from "react";
import { useSearchParams } from "next/navigation";

const SignUpComponent = () => {
  const { user } = useUser();
  const searchParams = useSearchParams();
  const isCheckoutPage = searchParams.get("showSignUp") !== null;
  const courseId = searchParams.get("id");

  const signInUrl = isCheckoutPage
    ? `/checkout?step=1&id=${courseId}&showSignUp=false`
    : "/signin";

  const getRedirectUrl = () => {
    if (isCheckoutPage) {
      return `/checkout?step=2&id=${courseId}&showSignUp=false`;
    }

    const userType = user?.publicMetadata?.userType as string;
    if (userType === "teacher") {
      return "/teacher/courses";
    }
    return "/user/courses";
  };

  return (
    <SignUp
      appearance={{
        elements: {
          rootBox: "flex justify-center items-center py-5",
          cardBox: "shadow-none",
          card: "bg-white w-full shadow-none",
          footer: {
            background: "#ffffff",
            padding: "0rem 2.5rem",
            "& > div > div:nth-child(1)": {
              background: "#ffffff",
            },
          },
          formFieldLabel: "text-gray-600 font-normal",
          formButtonPrimary:
            "bg-primary-700 text-white hover:bg-primary-600 !shadow-none",
          formFieldInput: "bg-gray-100 text-gray-800 !shadow-none",
          footerActionLink: "text-primary-750 hover:text-primary-600",
        },
      }}
      signInUrl={signInUrl}
      forceRedirectUrl={getRedirectUrl()}
      routing="hash"
      afterSignOutUrl="/"
    />
  );
};

export default SignUpComponent;
