import { notFound } from "next/navigation";
import { getPublicForm } from "@/lib/api";
import { FormResponse } from "./_components/form-response";

export default async function PublicFormPage({
  params,
}: {
  params: Promise<{ publicId: string }>;
}) {
  const { publicId } = await params;

  let form;
  try {
    form = await getPublicForm(publicId);
  } catch {
    notFound();
  }

  return (
    <div className="min-h-full bg-muted/30">
      <div className="mx-auto max-w-2xl px-4 py-12">
        {/* Form header */}
        <div className="mb-8 space-y-1">
          <h1 className="break-words text-2xl font-semibold">{form.title}</h1>
          {form.description && (
            <p className="text-muted-foreground whitespace-pre-wrap break-words">
              {form.description}
            </p>
          )}
        </div>

        <FormResponse form={form} publicId={publicId} />
      </div>
    </div>
  );
}
