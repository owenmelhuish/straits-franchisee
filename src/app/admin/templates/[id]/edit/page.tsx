import { redirect } from "next/navigation";

export default async function TemplateEditRedirect({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  redirect(`/template-creator?id=${id}`);
}
