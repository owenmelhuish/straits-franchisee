export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#F8F7F7] px-4">
      <div className="w-full max-w-sm">{children}</div>
    </div>
  );
}
