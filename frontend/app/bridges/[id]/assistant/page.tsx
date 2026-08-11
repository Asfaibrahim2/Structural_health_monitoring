import AssistantBox from "@/components/AssistantBox";

export default async function BridgeAssistantPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <div className="max-w-3xl">
      <AssistantBox bridgeId={id} expanded />
    </div>
  );
}
