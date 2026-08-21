import { Link, useNavigate } from "@tanstack/react-router";
import { Menu, Stethoscope } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { useAuth } from "@/hooks/useAuth";

const links = [
  { to: "/medicos", label: "Médicos" },
  { to: "/hospitais", label: "Hospitais" },
  { to: "/vagas", label: "Vagas de plantão" },
];

export function SiteHeader() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();

  const nav = (
    <>
      {links.map((l) => (
        <Link
          key={l.to}
          to={l.to}
          className="text-sm font-medium text-muted-foreground transition-colors hover:text-primary"
          activeProps={{ className: "text-primary" }}
        >
          {l.label}
        </Link>
      ))}
    </>
  );

  return (
    <header className="sticky top-0 z-40 border-b border-border/70 bg-background/85 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4">
        <Link to="/" className="flex items-center gap-2">
          <span className="flex size-9 items-center justify-center rounded-xl bg-accent-gradient text-primary-foreground">
            <Stethoscope className="size-5" />
          </span>
          <span className="font-display text-lg font-semibold">EscalaMed</span>
        </Link>

        <nav className="hidden items-center gap-7 md:flex">{nav}</nav>

        <div className="hidden items-center gap-2 md:flex">
          {user ? (
            <>
              <Button variant="ghost" size="sm" onClick={() => navigate({ to: "/painel" })}>
                Meu painel
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={async () => {
                  await signOut();
                  navigate({ to: "/" });
                }}
              >
                Sair
              </Button>
            </>
          ) : (
            <>
              <Button variant="ghost" size="sm" onClick={() => navigate({ to: "/auth", search: { mode: "login" as const } })}>
                Entrar
              </Button>
              <Button size="sm" onClick={() => navigate({ to: "/auth", search: { mode: "signup" } })}>
                Cadastrar
              </Button>
            </>
          )}
        </div>

        <Sheet>
          <SheetTrigger asChild className="md:hidden">
            <Button variant="ghost" size="icon" aria-label="Abrir menu">
              <Menu className="size-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="right" className="w-72">
            <div className="mt-10 flex flex-col gap-5">
              {nav}
              {user ? (
                <>
                  <Link to="/painel" className="text-sm font-medium">
                    Meu painel
                  </Link>
                  <Button variant="outline" onClick={() => signOut()}>
                    Sair
                  </Button>
                </>
              ) : (
                <Button onClick={() => navigate({ to: "/auth", search: { mode: "login" as const } })}>Entrar / Cadastrar</Button>
              )}
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </header>
  );
}
