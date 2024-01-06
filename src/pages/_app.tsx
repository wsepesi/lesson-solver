/* eslint-disable @typescript-eslint/no-unsafe-assignment */

import { useState } from "react";
import "~/styles/globals.css";
import { type Session, createPagesBrowserClient } from "@supabase/auth-helpers-nextjs"
import { SessionContextProvider } from "@supabase/auth-helpers-react";
import { type AppProps } from "next/app";

function MyApp({ Component, pageProps }: AppProps<{ initialSession: Session }>) {
  // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-return
  const [supabaseClient] = useState(() => createPagesBrowserClient())
  return (
    <SessionContextProvider 
      supabaseClient={supabaseClient}
      initialSession={pageProps.initialSession}
    >
      <Component {...pageProps} />
    </SessionContextProvider>
  )
};

export default MyApp;
