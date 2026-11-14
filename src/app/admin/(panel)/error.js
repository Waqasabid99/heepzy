"use client";

import { ErrorView } from "@/components/layout/error-view";

export default function AdminError(props) {
  return <ErrorView {...props} compact home="/admin" homeLabel="Back to dashboard" />;
}
