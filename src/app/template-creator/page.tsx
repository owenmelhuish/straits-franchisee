"use client";

import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { AdminTemplateBuilder } from "@/components/builder/admin-template-builder";

function TemplateCreatorInner() {
  const params = useSearchParams();
  const id = params.get("id") ?? undefined;
  return <AdminTemplateBuilder templateId={id} />;
}

export default function TemplateCreatorPage() {
  return (
    <Suspense fallback={null}>
      <TemplateCreatorInner />
    </Suspense>
  );
}
