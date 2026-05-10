"use client";

import { Component, ReactNode } from "react";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useT } from "@/lib/i18n/client";
import type { Dictionary } from "@/lib/i18n/dictionaries/en";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

class BuilderErrorBoundaryInner extends Component<Props & { t: Dictionary }, State> {
  constructor(props: Props & { t: Dictionary }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error("Builder error:", error, info);
  }

  render() {
    const { t } = this.props;
    if (this.state.hasError) {
      return (
        <div className="flex h-screen flex-col items-center justify-center gap-4 bg-[#F4F4F4] p-8 text-center">
          <AlertTriangle className="h-12 w-12 text-amber-500" />
          <h2 className="text-xl font-semibold">{t.builder.somethingWrong}</h2>
          <p className="max-w-md text-sm text-muted-foreground">
            {t.builder.builderErrorDesc}
          </p>
          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={() => this.setState({ hasError: false, error: null })}
            >
              {t.builder.tryAgain}
            </Button>
            <Button onClick={() => (window.location.href = "/dashboard")}>
              {t.builder.backToDashboard}
            </Button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export function BuilderErrorBoundary({ children }: Props) {
  const t = useT();
  return <BuilderErrorBoundaryInner t={t}>{children}</BuilderErrorBoundaryInner>;
}
