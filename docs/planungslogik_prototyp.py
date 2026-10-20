"""Referenz-Prototyp der Planungslogik (Fitness-App Spezifikation, Stand 20.10.2026).

Erzeugt Einheiten rollierend aus Wochenziel, erledigtem Volumen, Erholungsfenstern,
Wochenprognose und Zeitbudget und simuliert die Use Cases aus dem Dokument.
Ausfuehren: python3 planungslogik_prototyp.py
"""
import math

MUSKELN = ["Brust", "Ruecken", "Schultern", "Bizeps", "Trizeps",
           "Quadrizeps", "Gesaess", "Hint_OS", "Bauch", "Waden"]
OBEN = {"Brust", "Ruecken", "Schultern", "Bizeps", "Trizeps"}
UNTEN = {"Quadrizeps", "Gesaess", "Hint_OS", "Waden"}
PRIO = {"Brust": 1.0, "Ruecken": 1.0, "Schultern": 1.0, "Bizeps": 1.0, "Trizeps": 1.0,
        "Quadrizeps": 0.75, "Gesaess": 0.75, "Hint_OS": 0.75, "Bauch": 0.5, "Waden": 0.3}
OBERGRENZE = {m: (20 if PRIO[m] >= 1 else 16 if PRIO[m] >= 0.75 else 10 if PRIO[m] >= 0.5 else 8) for m in MUSKELN}
UNTERGRENZE = {m: (4 if PRIO[m] >= 0.75 else 2) for m in MUSKELN}
PERS_START = {m: (12 if PRIO[m] >= 1 else 10 if PRIO[m] >= 0.75 else 6 if PRIO[m] >= 0.5 else 4) for m in MUSKELN}
SESSION_CAP = 10
WORK, REST_C, REST_I, REST_SS, WARM = 45, 90, 75, 75, 300

UEB = [
    ("KH-Bankdruecken", "G", {"Brust": 1, "Trizeps": .5, "Schultern": .5}),
    ("Schraegbank KH", "G", {"Brust": 1, "Schultern": .5, "Trizeps": .5}),
    ("KH-Schulterdruecken", "G", {"Schultern": 1, "Trizeps": .5}),
    ("Klimmzug", "G", {"Ruecken": 1, "Bizeps": .5}),
    ("KH-Rudern", "G", {"Ruecken": 1, "Bizeps": .5, "Schultern": .5}),
    ("Goblet Squat", "G", {"Quadrizeps": 1, "Gesaess": .5}),
    ("Bulgarian Split Squat", "G", {"Quadrizeps": 1, "Gesaess": .5}),
    ("Rum. Kreuzheben", "G", {"Hint_OS": 1, "Gesaess": .5}),
    ("Hip Thrust", "G", {"Gesaess": 1, "Hint_OS": .5}),
    ("KH-Curls", "I", {"Bizeps": 1}),
    ("Trizeps ueber Kopf", "I", {"Trizeps": 1}),
    ("Seitheben", "I", {"Schultern": 1}),
    ("Haeng. Knieheben", "F", {"Bauch": 1}),
    ("Wadenheben", "F", {"Waden": 1}),
]


def haupt(u):
    return max(u[2], key=lambda m: u[2][m])


def saetze_budget(minuten, ss):
    t = minuten * 60 - WARM
    k = WORK + 0.6 * REST_C + 0.4 * REST_I
    s = (2 * WORK + REST_SS) / 2
    return int(t / (ss * s + (1 - ss) * k))


def fenster(d):
    # Stunden bis ein Muskel wieder hart belastet wird (Training mit 1-3 Wdh. Reserve)
    if d == 0:
        return 0
    return 24 if d <= 3 else 36 if d <= 6 else 48 if d < 10 else 72


class Woche:
    def __init__(s, prognose, minuten):
        s.prognose, s.minuten = prognose, minuten
        s.pers = dict(PERS_START)
        s.letzte = {m: (-999, 0) for m in MUSKELN}
        s.erledigt = {m: 0.0 for m in MUSKELN}
        s.n = 0
        s.letzte_uebung = {}
        s.berechne_ziel()

    def ss_anteil(s):
        return 1.0 if s.prognose <= 2 else 0.5 if s.prognose == 3 else 0.3

    def berechne_ziel(s):
        budget = s.prognose * saetze_budget(s.minuten, s.ss_anteil()) * 1.7
        gew = sum(PRIO.values())
        s.ziel = {m: round(min(s.pers[m], OBERGRENZE[m], max(UNTERGRENZE[m], budget * PRIO[m] / gew)))
                  for m in MUSKELN}

    def einheit(s, tag, stunde, morgen=None):
        t = tag * 24 + stunde
        tage_rest = 7 - tag
        if s.n >= s.prognose:
            s.prognose = s.n + 1
            s.berechne_ziel()
        n_rest = max(1, min(s.prognose - s.n, tage_rest))
        if s.n > 0 and t - max(s.letzte[m][0] for m in MUSKELN) >= 72:
            n_rest = max(1, min(n_rest, math.ceil(tage_rest / 2)))
        erholt = {m: (t - s.letzte[m][0]) >= fenster(s.letzte[m][1]) for m in MUSKELN}
        nach_heute = max(0, s.prognose - s.n - 1)
        letzte_einheit = max(s.letzte[m][0] for m in MUSKELN)
        if morgen is None:
            morgen = nach_heute > 0 and nach_heute >= (tage_rest - 1) / 2
            if s.n > 0 and t - letzte_einheit >= 72:
                morgen = False
        fokus = None
        if morgen:
            def defizit(g):
                return sum(max(0, s.ziel[m] - s.erledigt[m]) * PRIO[m] for m in g if erholt[m])
            def zuletzt(g):
                return max(s.letzte[m][0] for m in g)
            # Vorrang hat die Gruppe, die laenger nicht trainiert wurde; Defizit nur als Gleichstand-Regel
            if zuletzt(OBEN) != zuletzt(UNTEN):
                fokus = OBEN if zuletzt(OBEN) < zuletzt(UNTEN) else UNTEN
            else:
                fokus = OBEN if defizit(OBEN) >= defizit(UNTEN) else UNTEN
            if not any(erholt[m] for m in fokus):
                fokus = UNTEN if fokus is OBEN else OBEN
        bedarf = {}
        for m in MUSKELN:
            rest = max(0, s.ziel[m] - s.erledigt[m])
            if fokus and m not in fokus and m != "Bauch":
                share = 0
            elif fokus:
                share = rest / max(1, math.ceil(n_rest / 2))
            else:
                share = rest / n_rest
            bedarf[m] = min(SESSION_CAP, math.ceil(share)) if erholt[m] else 0
        budget = saetze_budget(s.minuten, s.ss_anteil())
        dose = {m: 0.0 for m in MUSKELN}
        plan, gesamt, benutzt = [], 0, set()

        def wert(b):
            return sum(min(max(0, bedarf[m] - dose[m]), v) * PRIO[m] for m, v in b.items())

        while gesamt < budget:
            kand = [u for u in UEB if u[0] not in benutzt and u[1] != "F" and wert(u[2]) > 0.25]
            if not kand:
                break

            def score(u):
                v = wert(u[2]) + (0.3 if u[1] == "G" else 0)
                if s.letzte_uebung.get(haupt(u)) == u[0]:
                    v -= 0.6
                return -v
            kand.sort(key=score)
            u = kand[0]
            benutzt.add(u[0])
            h = haupt(u)
            n = max(2, min(4, math.ceil(bedarf[h] - dose[h])))
            n = min(n, budget - gesamt)
            if n <= 0:
                break
            plan.append((u[0], n))
            gesamt += n
            for m, v in u[2].items():
                dose[m] += n * v
        for u in UEB:
            if u[1] == "F":
                m = haupt(u)
                if erholt[m] and bedarf[m] > 0:
                    n = min(3, bedarf[m])
                    plan.append((u[0] + " (Partner)", n))
                    dose[m] += n
        for name, _ in plan:
            for u in UEB:
                if name.startswith(u[0]):
                    s.letzte_uebung[haupt(u)] = u[0]
        for m in MUSKELN:
            if dose[m] > 0:
                s.erledigt[m] += dose[m]
                s.letzte[m] = (t, dose[m])
        s.n += 1
        return plan, budget - gesamt, [m for m in MUSKELN if not erholt[m]], fokus, morgen


TAGE = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So']


def sim(name, termine, prognose, minuten=40, korrektur=None):
    w = Woche(prognose, minuten)
    print(f"\n=== {name} | Prognose {prognose}, {minuten} Min ===")
    print(" Ziel:", w.ziel)
    for termin in termine:
        tag, std = termin[0], termin[1]
        morgen = termin[2] if len(termin) > 2 else None
        if korrektur and tag in korrektur:
            w.prognose = korrektur[tag]
            w.berechne_ziel()
        plan, frei, nicht, fokus, mg = w.einheit(tag, std, morgen)
        hs = sum(n for p, n in plan if "(Partner)" not in p)
        f = "Ganzkoerper" if not fokus else ("Fokus Oberkoerper" if fokus is OBEN else "Fokus Unterkoerper")
        extra = f"  [frei {frei} Saetze -> Zirkel/Bonus anbieten]" if frei > 2 else ""
        print(f" {TAGE[tag]} {std}h ({f}, morgen wieder: {'ja' if mg else 'nein'}): {hs} Saetze | "
              + ", ".join(f"{p} x{n}" for p, n in plan) + extra)
        if nicht:
            print("    nicht erholt:", ", ".join(nicht))
    print(" Erledigt/Ziel:", {m: f"{w.erledigt[m]:.0f}/{w.ziel[m]}" for m in MUSKELN})


if __name__ == "__main__":
    sim("UC1 Normalwoche Mo/Mi/Fr", [(0, 18), (2, 18), (4, 18)], 3)
    sim("UC2 Fuenf Einheiten Mo/Di/Mi/Fr/Sa", [(0, 18), (1, 18), (2, 18), (4, 18), (5, 10)], 5)
    sim("UC3 Zwei Einheiten Di/Sa", [(1, 18), (5, 10)], 2)
    sim("UC4 Prognose 3, tatsaechlich 5 am Stueck", [(0, 18), (1, 18), (2, 18), (3, 18), (4, 18)], 3)
    sim("UC5 Prognose 4, nur Mo + Do, am Do auf 2 korrigiert", [(0, 18), (3, 18)], 4, korrektur={3: 2})
    sim("UC5b Prognose 4, nur Mo + Do, ohne Korrektur", [(0, 18), (3, 18)], 4)
    sim("UC6 Fr abends, Sa + So morgens", [(4, 18), (5, 10), (6, 10)], 3)
