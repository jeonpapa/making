import UploadClient from "./UploadClient";

export default async function UploadPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  return <UploadClient code={code} />;
}
