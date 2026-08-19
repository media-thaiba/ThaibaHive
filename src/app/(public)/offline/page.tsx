export default function OfflinePage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 p-8 text-center">
      <h1 className="text-2xl font-bold">You are offline</h1>
      <p className="text-muted-foreground">Please check your internet connection and try again.</p>
    </div>
  );
}
