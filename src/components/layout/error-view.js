"use client";

import Link from "next/link";
import { useEffect } from "react";
import { StatusPage } from "@/components/layout/status-page";

/** Shared body of error.js: logs the error and offers a retry. `retry` (Next 16.2+) or the older `reset`. */
export function ErrorView({ error, retry, reset, compact = false, home = "/", homeLabel = "Go to home" }) {
  useEffect(() => {
    console.error(error);
  }, [error]);
  const again = retry ?? reset;
  return (
    <StatusPage
      code="500"
      title="Something went wrong"
      message="We hit an unexpected problem on our side. Please try again. If it keeps happening, contact support and quote the reference below."
      reference={error?.digest}
      compact={compact}
    >
      {again ? (
        <button type="button" onClick={() => again()} className="btn-primary">
          Try again
        </button>
      ) : null}
      <Link href={home} className="btn-outline">
        {homeLabel}
      </Link>
    </StatusPage>
  );
}
