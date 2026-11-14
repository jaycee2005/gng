export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-[100dvh] bg-[var(--color-background)] flex flex-col justify-center px-4 py-3 sm:px-6 sm:py-4">
      <div className="mx-auto w-full max-w-xl">{children}</div>
    </div>
  );
}
