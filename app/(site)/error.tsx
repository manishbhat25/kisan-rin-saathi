"use client";

import { Button, EmptyState, LinkButton } from "@/components/ui";

export default function ErrorPage({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="mx-auto max-w-xl py-10" role="alert">
      <EmptyState
        title="Something went wrong"
        action={
          <div className="flex flex-wrap justify-center gap-2">
            <Button onClick={() => reset()}>Try again</Button>
            <LinkButton href="/" variant="secondary">
              Go to home page
            </LinkButton>
          </div>
        }
      >
        We could not load this page. Nothing you saved has been lost. Please try again in a moment.
      </EmptyState>
    </div>
  );
}
