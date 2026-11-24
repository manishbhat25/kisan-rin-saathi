import { EmptyState, LinkButton } from "@/components/ui";

export default function NotFound() {
  return (
    <div className="mx-auto max-w-xl py-10">
      <EmptyState title="Page not found" action={<LinkButton href="/">Go to home page</LinkButton>}>
        The page or application was not found, or you do not have access to it.
      </EmptyState>
    </div>
  );
}
