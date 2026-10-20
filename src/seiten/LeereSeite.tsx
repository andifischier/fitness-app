// Platzhalter für Tabs, deren Inhalt in späteren Paketen folgt.
export function LeereSeite({ titel }: { titel: string }) {
  return (
    <main className="mx-auto max-w-xl px-seite pt-12">
      <h1 className="text-titel font-extrabold">{titel}</h1>
    </main>
  );
}
