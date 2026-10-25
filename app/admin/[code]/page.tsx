import AdminEventClient from "./AdminEventClient";

export default async function AdminEventPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  return <AdminEventClient code={code} />;
}
