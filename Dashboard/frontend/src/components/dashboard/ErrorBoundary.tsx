import { Component, type ReactNode } from "react";
import { AlertTriangle } from "lucide-react";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export default class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center min-h-[300px] gap-4 text-center p-8">
          <AlertTriangle className="h-10 w-10 text-destructive" />
          <h2 className="text-lg font-bold">Algo deu errado</h2>
          <p className="text-sm text-muted-foreground max-w-md">
            Ocorreu um erro ao carregar esta seção. Tente recarregar a página.
          </p>
          <button
            onClick={() => this.setState({ hasError: false, error: null })}
            className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 transition-opacity"
          >
            Tentar novamente
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
