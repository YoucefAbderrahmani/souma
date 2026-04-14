import { auth } from "@/server/lib/auth";
import { createAuthClient } from "better-auth/react"; // make sure to import from better-auth/react
import { customSessionClient } from "better-auth/client/plugins";

export const authClient = createAuthClient({
  //you can pass client configuration here
  plugins: [customSessionClient<typeof auth>()],
});
