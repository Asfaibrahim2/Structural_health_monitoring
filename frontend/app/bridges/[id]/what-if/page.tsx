import WhatIfSimulator from "@/components/WhatIfSimulator";

export default async function BridgeWhatIfPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <div className="max-w-2xl">
      <WhatIfSimulator bridgeId={id} expanded />
    </div>
  );
}
