import { Icon } from "../components/Icon.js";

interface GateScreenProps {
  onGrantLocation: () => void;
  onSkipLocation: () => void;
}

export function GateScreen({ onGrantLocation, onSkipLocation }: GateScreenProps) {
  return (
    <section className="screen active" data-screen="gate">
      <div className="gate">
        <div className="gate-icon">
          <Icon name="target" />
        </div>
        <h1>Trova il punto migliore per goderti la regata</h1>
        <p>
          GolfoLive usa la tua posizione per ordinare i punti di osservazione del golfo in base a
          quanto sono vicini e quanto sono affollati adesso. Puoi continuare anche senza attivarla.
        </p>
        <div className="gate-actions">
          <button className="btn-primary" type="button" onClick={onGrantLocation}>
            Attiva la posizione
          </button>
          <button className="btn-ghost" type="button" onClick={onSkipLocation}>
            Continua senza posizione
          </button>
        </div>
      </div>
    </section>
  );
}
