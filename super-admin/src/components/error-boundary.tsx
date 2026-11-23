import { Component, type ErrorInfo, type ReactNode } from "react";
import { Link } from "react-router";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Props {
  children: ReactNode;
}
interface State {
  error: Error | null;
}

/**
 * Catches a render error in the page below it and shows a recovery screen instead of letting React
 * unmount the whole app (the blank white screen). The sidebar and header stay usable.
 */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("Page crashed", error, info.componentStack);
  }

  render() {
    const { error } = this.state;
    if (!error) return this.props.children;
    return (
      <div role="alert" className="flex flex-col items-center py-24 text-center">
        <AlertTriangle className="size-10 text-destructive" />
        <h1 className="mt-4 text-xl font-bold">This page hit a problem</h1>
        <p className="mt-1 max-w-md text-sm text-muted-foreground">Something went wrong while showing this page. Try again, or go back to the dashboard.</p>
        <p className="mt-3 max-w-md break-words font-mono text-xs text-muted-foreground">{error.message}</p>
        <div className="mt-6 flex gap-2">
          <Button onClick={() => this.setState({ error: null })}>Try again</Button>
          <Button asChild variant="outline">
            <Link to="/">Go to the dashboard</Link>
          </Button>
        </div>
      </div>
    );
  }
}
