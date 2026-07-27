export interface VantagePoint {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  /** punteggio di visibilità sulla linea di regata prevista, 0-1 */
  visibilityScore: number;
  /** livello di affollamento riportato, 0-1 */
  crowdingLevel: number;
}

export interface BoatPosition {
  boatId: string;
  latitude: number;
  longitude: number;
  headingDegrees: number;
  timestamp: string;
}

export interface GameEvent {
  id: string;
  type: "first-tack" | "leader-at-next-mark";
  opensAt: string;
  closesAt: string;
}

export interface Prediction {
  id: string;
  eventId: string;
  userId: string;
  choice: string;
  submittedAt: string;
}
