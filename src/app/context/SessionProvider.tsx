import React, { createContext, useContext, ReactNode } from "react";
import { authClient } from "@/lib/auth-client";

type Session = {
  user?: {
    //can only be id cuz of betterauth
    id?: string;
    name?: string;
    lastname?: string;
    email?: string;
    createdAt?: Date;
    phone?: string;
    image?: string;
    role?: string;
    // add other user fields as needed
  };
  // add other session fields as needed
};

type SessionContextType = {
  session: Session | null;
  isPending: boolean;
  error: any;
  refetch: () => void;
};

const SessionContext = createContext<SessionContextType | undefined>(undefined);

export const useSession = () => {
  const context = useContext(SessionContext);
  if (!context) {
    throw new Error("useSession must be used within a SessionProvider");
  }
  return context;
};

export const SessionProvider = ({ children }: { children: ReactNode }) => {
  const { data: session, isPending, error, refetch } = authClient.useSession();

  // Optionally, you can add logic to refetch session on login/logout events

  return (
    <SessionContext.Provider value={{ session, isPending, error, refetch }}>
      {children}
    </SessionContext.Provider>
  );
};
