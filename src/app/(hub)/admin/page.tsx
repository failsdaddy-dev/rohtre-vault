import { ShieldIcon } from "@/components/icons";
import { MessageState, PillLink } from "@/components/states";

export default function AdminPlaceholder() {
  return (
    <>
      <title>Admin · RohTre Vault</title>
      <MessageState
        icon={<ShieldIcon size={48} />}
        title="Admin panel"
        body="Cards, filters, sections, users and the audit log are built in Stage 5."
        action={<PillLink href="/effects">Back to Effects</PillLink>}
      />
    </>
  );
}
