import { AccessGate } from "@/components/AccessGate";
import { Home } from "@/components/home/Home";

export default function Page() {
  return (
    <AccessGate>
      <Home />
    </AccessGate>
  );
}
