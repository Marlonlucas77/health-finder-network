import { Link } from "@tanstack/react-router";
import { Stethoscope } from "lucide-react";

export function SiteFooter() {
  return (
    <footer className="mt-16 border-t border-border bg-card/50">
      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-10 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <Link to="/" className="flex items-center gap-2">
            <span className="flex size-8 items-center justify-center rounded-lg bg-accent-gradient text-primary-foreground">
              <Stethoscope className="size-4" />
            </span>
            <span className="font-display text-base font-semibold">EscalaMed</span>
          </Link>
          <p className="mt-3 text-sm text-muted-foreground">
            Conectando médicos e escalistas em todo o Brasil.
          </p>
        </div>

        <nav className="text-sm">
          <h2 className="font-semibold">Plataforma</h2>
          <ul className="mt-3 space-y-2 text-muted-foreground">
            <li>
              <Link to="/medicos" className="hover:text-primary">
                Buscar médicos
              </Link>
            </li>
            <li>
              <Link to="/vagas" className="hover:text-primary">
                Vagas de plantão
              </Link>
            </li>
            <li>
              <Link to="/hospitais" className="hover:text-primary">
                Hospitais
              </Link>
            </li>
          </ul>
        </nav>

        <nav className="text-sm">
          <h2 className="font-semibold">Ajuda</h2>
          <ul className="mt-3 space-y-2 text-muted-foreground">
            <li>
              <Link to="/como-funciona" className="hover:text-primary">
                Como funciona
              </Link>
            </li>
            <li>
              <Link to="/como-funciona" hash="faq" className="hover:text-primary">
                Perguntas frequentes
              </Link>
            </li>
            <li>
              <Link to="/painel" className="hover:text-primary">
                Meu painel
              </Link>
            </li>
          </ul>
        </nav>

        <nav className="text-sm">
          <h2 className="font-semibold">Conta</h2>
          <ul className="mt-3 space-y-2 text-muted-foreground">
            <li>
              <Link to="/auth" search={{ mode: "login" as const }} className="hover:text-primary">
                Entrar
              </Link>
            </li>
            <li>
              <Link to="/auth" search={{ mode: "signup" as const }} className="hover:text-primary">
                Criar conta
              </Link>
            </li>
            <li>
              <Link to="/favoritos" className="hover:text-primary">
                Médicos favoritos
              </Link>
            </li>
          </ul>
        </nav>
      </div>
      <div className="border-t border-border py-5 text-center text-xs text-muted-foreground">
        © {new Date().getFullYear()} EscalaMed · Plataforma de escalas médicas
      </div>
    </footer>
  );
}
