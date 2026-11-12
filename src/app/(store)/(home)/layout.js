import { SiteHeader } from "@/components/layout/site-header";

export default function Layout({ children }) {
  return (
    <>
      <SiteHeader />
      <main id="main" tabIndex={-1} className="flex-1 focus:outline-none">
        {children}
      </main>
    </>
  );
}
