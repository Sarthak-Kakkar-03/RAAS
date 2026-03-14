type DocumentsPageProps = {
  params: Promise<{
    projectId: string;
  }>;
};

export default async function DocumentsPage({ params }: DocumentsPageProps) {
  const { projectId } = await params;

  return (
    <main className="min-h-screen bg-base-200 px-8 py-12">
      <div className="mx-auto flex max-w-4xl flex-col gap-4">
        <h1 className="text-4xl font-extrabold text-primary">
          Project Documents
        </h1>
        <p className="text-base-content/75">
          Viewing documents for project{" "}
          <span className="font-semibold">{projectId}</span>.
        </p>
      </div>
    </main>
  );
}
