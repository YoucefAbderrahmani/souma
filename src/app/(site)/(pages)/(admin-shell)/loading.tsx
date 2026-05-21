export default function AdminShellLoading() {
  return (
    <div
      className="flex min-h-[280px] items-center justify-center pt-40 lg:pt-36"
      aria-busy="true"
      aria-label="Loading admin page"
    >
      <div className="h-9 w-9 animate-spin rounded-full border-2 border-gray-3 border-t-orange" />
    </div>
  );
}
