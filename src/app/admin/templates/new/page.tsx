import { PsdUpload } from "@/components/admin/psd-upload";

export default function NewTemplatePage() {
  return (
    <div className="mx-auto max-w-lg">
      <h1 className="mb-6 text-2xl font-bold">Upload PSD</h1>
      <div className="rounded-xl border bg-white p-6 shadow-sm">
        <PsdUpload />
      </div>
    </div>
  );
}
