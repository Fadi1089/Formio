import { redirect, notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getForm } from "@/lib/api";
import { FormBuilder } from "./_components/form-builder";

export default async function FormBuilderPage({
  params,
}: {
  params: Promise<{ formId: string }>;
}) {
  const { formId } = await params;

  const supabase = await createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) redirect("/");

  let form;
  try {
    form = await getForm(session.access_token, formId);
  } catch {
    notFound();
  }

  return <FormBuilder initialForm={form} />;
}
