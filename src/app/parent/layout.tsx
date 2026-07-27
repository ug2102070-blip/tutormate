export default function ParentRootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // This is a minimal passthrough layout — auth checks are inside each page/sub-layout
  return <>{children}</>;
}
