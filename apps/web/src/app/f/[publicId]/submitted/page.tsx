export default async function SubmittedPage() {
  return (
    <div className="min-h-full bg-muted/30 flex items-center justify-center">
      <div className="mx-auto max-w-md px-4 py-12 text-center space-y-4">
        <div className="text-4xl">✓</div>
        <h1 className="text-2xl font-semibold">Response submitted</h1>
        <p className="text-muted-foreground">
          Your response has been recorded. Thank you!
        </p>
      </div>
    </div>
  );
}
