"""Referenz-Prototyp der Progressionsregeln (Fitness-App Spezifikation, Stand 20.10.2026).

Simuliert 12 Wochen mit wechselnder Frequenz und prueft Laststeigerung, Pendeln und Volumengrenzen.
Ausfuehren: python3 progression_prototyp.py
"""
"""12-Wochen-Simulation, Version 2: Progression ueber geschaetzte Maximalkraft (e1RM).
Modell des Trainierenden wie in Version 1 (Annahmen, keine Studienwerte)."""
import math, random

STEP = 2.5
LO, HI, HI_DEHN = 8, 12, 15
RESERVE = {"leicht": 4, "passend": 2, "schwer": 0}

def e1rm(last, wdh, reserve):
    return last * (1 + (wdh + reserve) / 30)

def wdh_bei(e, last, reserve=2):
    return math.floor(30 * (e / last - 1) + 1e-6) - reserve

def plane(e_est, last, ziel, fb, gemacht, seit_steigerung, lo=LO, hi=HI):
    """Regeln laut Spezifikation (Klarstellungen B1 bis B4): alles am ersten Satz gemessen,
    Schwellen aus dem Bereich der Uebung abgeleitet."""
    erster = gemacht[0]
    if fb == "schwer":
        if seit_steigerung < 2 and erster >= lo - 2:
            return last, max(lo - 1, erster), "Eingewoehnung"
        if erster < lo - 2:
            return last - STEP, lo, "Last -"
        return last, ziel, ""
    neu = ziel + (2 if fb == "leicht" else 1)
    neu = max(ziel, min(neu, wdh_bei(e_est, last, reserve=1)))
    if neu > hi:
        r_neu = wdh_bei(e_est, last + STEP, reserve=1)
        if r_neu >= lo or neu > hi + 3:
            return last + STEP, max(lo - 1, min(hi, r_neu)), "Last +"
        return last, neu, "Bereich gedehnt"
    return last, neu, ""

def simuliere(frequenzen, seed=7, verbose=True, label=""):
    random.seed(seed)
    S, form = 24.0, 1.0
    last = 16.0
    e_est = e1rm(16.0, 8, 3)           # Kalibrierungssatz
    ziel, info, seit = 8, '', 9
    grenze, gleich, prev_e = 12, 0, None
    bew_hist, zeilen, erholung_next, e_hist = [], [], False, []
    lasten = []
    for woche, freq in enumerate(frequenzen, 1):
        budget_ziel = {1: 6, 2: 11, 3: 12, 4: 12, 5: 12, 6: 12}[freq]
        wz = min(grenze, budget_ziel) if freq > 1 else 6
        ew = erholung_next
        if ew: wz = round(wz * 0.5)
        spe = max(2, round(wz / freq * 0.75))
        saetze_woche, fbs, e_woche, infos = 0, [], [], []
        for _ in range(freq):
            max_wdh = 30 * (S * form / last - 1) + random.uniform(-1, 1)
            erg = []
            for k in range(spe):
                moeglich = max(0, math.floor(max_wdh - k))
                if k == 0:
                    gemacht = ziel if moeglich - ziel >= 1 else max(0, moeglich - 1)
                else:  # Folgesatz: Vorgabe = Wdh. des Vorsatzes, mit 1 bis 3 Reserve
                    gemacht = min(erg[-1][0], max(0, moeglich - 1))
                erg.append((gemacht, moeglich - gemacht))
            erster, res = erg[0]
            fb = "schwer" if erster < ziel else ("leicht" if res >= 4 else "passend")
            fbs.append(fb)
            # e1RM aus bestem Satz mit Reserve laut Feedback, geglaettet (50 %)
            best = max(r for r, _ in erg)
            e_neu = e1rm(last, best, RESERVE[fb] if fb != "schwer" else 1)
            e_est = 0.5 * e_est + 0.5 * e_neu
            e_woche.append(e_neu)
            lasten.append(last)
            alt = last
            last, ziel, info = plane(e_est, last, ziel, fb, [r for r, _ in erg], seit)
            seit = 0 if last > alt else seit + 1
            if info: infos.append(info)
            saetze_woche += spe / 0.75
        ueber = max(0, saetze_woche - 16)
        form = max(0.85, min(1.0, form - 0.02 * ueber + 0.03))
        S += S * 0.008 * (1 - math.exp(-saetze_woche / 8)) if ueber == 0 else S * 0.004
        bew = 3 + (1 if ueber > 0 else 0)
        bew_hist.append(bew)
        e_hist.append(sum(e_woche) / len(e_woche))
        e_avg = sum(e_hist[-2:]) / len(e_hist[-2:])
        anp = ""
        if saetze_woche >= 0.8 * wz and not ew:
            if prev_e is not None:
                if e_avg > prev_e * 1.01:
                    gleich = 0
                elif e_avg < prev_e * 0.97 or bew >= 4:
                    grenze = max(6, grenze - 2); anp = "-2"; gleich = 0
                else:
                    gleich += 1
                    if gleich >= 2 and bew <= 3:
                        grenze = min(20, grenze + 2); anp = "+2"; gleich = 0
            prev_e = e_avg
        erholung_next = len(bew_hist) >= 4 and sum(bew_hist[-4:]) / 4 >= 4.5
        zeilen.append((woche, freq, round(saetze_woche), wz, grenze, anp, last, ziel, round(S, 1), round(e_est, 1), "/".join(f[0] for f in fbs), ", ".join(infos), ew))
    wechsel = sum(1 for a, b in zip(lasten, lasten[1:]) if a != b)
    rueck = sum(1 for a, b in zip(lasten, lasten[1:]) if b < a)
    if verbose:
        print(f"\n{label}")
        print(f"{'Wo':>2} {'Einh':>4} {'Saetze':>6} {'Ziel':>4} {'Grenze':>7} {'naechste Einheit':>18} {'e1RM echt/gesch.':>17}  Feedback  Hinweise")
        for z in zeilen:
            print(f"{z[0]:>2} {z[1]:>4} {z[2]:>6} {z[3]:>4} {z[4]:>5}{z[5]:>2} {z[6]:>8.1f} kg x {z[7]:>2}  {z[8]:>8}/{z[9]:<6}  {z[10]:<10} {z[11]}{' (Erholungswoche)' if z[12] else ''}")
        print(f" Lastwechsel: {wechsel}, davon Rueckschritte: {rueck}; Kraft echt +{(zeilen[-1][8]/24-1)*100:.1f} %")
    return zeilen, rueck

if __name__ == "__main__":
    simuliere([3,2,5,3,4,2,3,3,5,1,3,4], label="Szenario A: wechselnd 3,2,5,3,4,2,3,3,5,1,3,4")
    simuliere([3]*12, label="Szenario B: konstant 3x")
    simuliere([5]*12, label="Szenario C: konstant 5x")
    simuliere([2]*12, label="Szenario D: konstant 2x")
    # Robustheit ueber 50 Zufallsverlaeufe
    import statistics
    rs = [simuliere([random.choice([1,2,3,3,4,5]) for _ in range(12)], seed=s, verbose=False)[1] for s in range(50)]
    print(f"\n50 zufaellige Verlaeufe: Rueckschritte der Last im Schnitt {statistics.mean(rs):.2f}, maximal {max(rs)}")
