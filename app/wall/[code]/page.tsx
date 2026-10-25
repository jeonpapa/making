import WallClient from "./WallClient";

export default async function WallPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  return <WallClient code={code} />;
}
