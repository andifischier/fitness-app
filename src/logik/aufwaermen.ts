// Aufwärmen Schritt für Schritt (Entscheidung 29.10.2026): Eine Zeile des Aufwärmens wird zur Vorgabe
// eines Bildschirms. Zeitangaben haben nur Halteübungen (Countdown), alles andere wird gezählt.
export interface AufwaermSchritt {
  name: string;
  wdh?: number;
  sek?: number;
  je?: string;      // „je Seite“, „je Bein“, „je Richtung“
  last?: string;    // nur beim Aufwärmsatz: „8 kg“, „leichtes Gewicht“, „leichtere Variante“
}

export function aufwaermSchritt(zeile: string): AufwaermSchritt {
  const text = zeile.trim();
  const je = / (je (?:Seite|Bein|Arm|Richtung))$/.exec(text);
  const rumpf = je ? text.slice(0, je.index) : text;
  const extra = je ? { je: je[1]! } : {};
  const sek = /^(\d+) Sek\. (.+)$/.exec(rumpf);
  if (sek) return { name: sek[2]!, sek: Number(sek[1]), ...extra };
  const wdh = /^(\d+) (?:Wdh\. )?(.+?)(?:: (.+))?$/.exec(rumpf);
  if (wdh) return { name: wdh[2]!, wdh: Number(wdh[1]), ...extra, ...(wdh[3] ? { last: wdh[3] } : {}) };
  return { name: rumpf, ...extra };
}
