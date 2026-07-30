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

export interface VantagePointScoreFactors {
  /** vicinanza/allineamento con la rotta prevista della flotta, 0-100 */
  route: number;
  /** linea di vista libera verso il campo di regata, 0-100 */
  visibility: number;
  /** quanto è vivibile il punto in base all'affollamento, 0-100 (100 = poco affollato) */
  crowding: number;
}

export type CrowdingLevel = "low" | "medium" | "high";

export interface RankedVantagePoint extends VantagePoint {
  /** punteggio complessivo 0-100, usato per l'ordinamento */
  score: number;
  factors: VantagePointScoreFactors;
  crowdingLabel: CrowdingLevel;
  /** distanza in metri dalla rotta di regata prevista */
  distanceToRouteMeters: number;
}

export interface CrowdReport {
  vantagePointId: string;
  level: CrowdingLevel;
  reportedAt: string;
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
