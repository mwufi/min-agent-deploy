"use client";

import { useUser } from "@clerk/nextjs";
import PipedreamConnectComponent from "./pipedream-connect-component";

export default function PipedreamConnect() {
  const { user } = useUser();
  return user && <PipedreamConnectComponent userId={user.id} />;
}
