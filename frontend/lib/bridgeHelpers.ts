// UI/UX cleanup: Helper functions to simplify technical terms, build bridge profiles, and personalities.
import type { BridgeSummary, RiskAssessment, InspectionQueueItem } from "./api";

/**
 * Translates vulnerability decimal factors to clear categories.
 */
export function getVulnerabilityLabel(factor: number): "Low" | "Medium" | "High" {
  if (factor >= 0.7) return "High";
  if (factor >= 0.4) return "Medium";
  return "Low";
}

/**
 * Translates data quality scores to plain text ratings.
 */
export function getDataReliability(score: number): "Good" | "Fair" | "Poor" {
  if (score >= 80) return "Good";
  if (score >= 50) return "Fair";
  return "Poor";
}

/**
 * Generates a short, descriptive "personality" line for fleet lists and queue tables.
 */
export function getBridgePersonality(
  bridge: BridgeSummary | InspectionQueueItem
): string {
  const isQueue = "risk_score" in bridge;
  const constructionYear = isQueue ? undefined : (bridge as BridgeSummary).construction_year;
  const age = constructionYear ? (new Date().getFullYear() - constructionYear) : 25;
  const ageWord = age > 50 ? "Historic" : age > 20 ? "Aging" : "Modern";
  
  const type = (bridge.structure_type || "girder").toLowerCase();
  const vuln = getVulnerabilityLabel(bridge.vulnerability_factor);
  
  // Determine traffic level from name or structure type
  const isHighTraffic = type.includes("cable") || bridge.bridge_name.toLowerCase().includes("sagar") || bridge.bridge_name.toLowerCase().includes("godavari");
  const trafficWord = isHighTraffic ? "high traffic" : "moderate traffic";

  const risk = isQueue ? (bridge as InspectionQueueItem).risk_score : (bridge as BridgeSummary).latest_risk_score;
  const riskWord = risk >= 75 ? "critical risk" : risk >= 40 ? "moderate risk" : "low risk";

  return `${ageWord} ${type} bridge, ${trafficWord}, ${vuln.toLowerCase()} vulnerability, ${riskWord}.`;
}

/**
 * Explains why a bridge matters in simple terms.
 */
export function getWhyThisBridgeMatters(bridgeName: string, structureType: string): string {
  const type = (structureType || "girder").toLowerCase();
  if (type.includes("cable")) {
    return "High-capacity modern link carrying heavy commuter traffic across major arterial spans.";
  }
  if (type.includes("arch")) {
    return "Historic structural link supporting regional transport routes and moderate daily commuter traffic.";
  }
  return "Essential highway connector supporting freight logistics and heavy local load transport.";
}

/**
 * Dynamic "Why this risk?" explanation generator.
 */
export interface RiskWhy {
  contributors: string[];
  summary: string;
}

export function getWhyThisRisk(
  risk: RiskAssessment | null,
  bridge: BridgeSummary | null
): RiskWhy {
  const score = risk ? risk.risk_score : (bridge ? bridge.latest_risk_score : 15);
  const age = bridge ? bridge.age_years : 25;
  const vulnerability = bridge ? bridge.vulnerability_factor : 0.3;

  const contributors: string[] = [];

  if (risk) {
    // 1. Check severity / strain deviation
    if (risk.severity_score > 60) {
      contributors.push("Strain is significantly higher than normal expected baseline.");
    } else if (risk.severity_score > 35) {
      contributors.push("Telemetry values show moderate deviation from baseline.");
    } else {
      contributors.push("Sensor values are near typical baseline levels.");
    }

    // 2. Check persistence
    if (risk.persistence_score > 65) {
      contributors.push("Telemetry anomalies are sustained for over 30 minutes.");
    } else if (risk.persistence_score > 35) {
      contributors.push("Telemetry anomalies occur intermittently under load spikes.");
    }

    // 3. Vulnerability check
    if (risk.asset_vulnerability_score > 60 || vulnerability >= 0.7) {
      contributors.push(`Structure is older (${age} years) with higher physical vulnerability.`);
    } else {
      contributors.push("Bridge design has low inherent vulnerability.");
    }

    // 4. Environmental influence
    if (risk.context_score > 60) {
      contributors.push("Environmental influences (traffic load / temperature) are compounding stress.");
    }

    // 5. Data reliability warning
    if (risk.data_quality_score < 50) {
      contributors.push("Data reliability is reduced due to sensor noise or packet drop.");
    }
  } else {
    // Fallback contributors
    contributors.push("Telemetry readings are within nominal structural baselines.");
    contributors.push(vulnerability >= 0.5 ? "Aging structure characteristics increase default vulnerability." : "Low vulnerability design factor.");
    contributors.push("Sensor connectivity is stable.");
  }

  // Generate top 3 unique bullets
  const uniqueContributors = Array.from(new Set(contributors)).slice(0, 3);

  // Generate 1-line summary
  let summary = "";
  if (score >= 75) {
    summary = "Critical multi-sensor anomalies detected on an aging structure, requiring immediate physical inspection.";
  } else if (score >= 40) {
    summary = "This bridge shows moderate persistent telemetry anomalies under heavy environmental stress.";
  } else {
    summary = "Structural telemetry is stable with low risk anomalies detected.";
  }

  return {
    contributors: uniqueContributors,
    summary,
  };
}

/**
 * Translates raw backend anomaly reasons to clean, user-friendly language.
 */
export function getPlainMainReason(item: InspectionQueueItem): string {
  const code = (item.main_reason || item.active_anomaly_type || "").toLowerCase();
  
  if (code.includes("strain") && code.includes("vibration")) {
    return "Persistent strain + vibration anomaly under heavy traffic";
  }
  if (code.includes("strain")) {
    return "Persistent strain deviation above baseline";
  }
  if (code.includes("vibration")) {
    return "Sudden vibration spike detected";
  }
  if (code.includes("displacement")) {
    return "Gradual displacement increase over 14 days";
  }
  if (code.includes("environmental") || code.includes("temp")) {
    return "Environmental thermal stress variation";
  }
  if (code.includes("gradual") || code.includes("deterioration")) {
    return "Gradual structural wear and aging indicators";
  }
  
  // Custom mapping for scenario types
  if (item.active_anomaly_type) {
    const scenario = item.active_anomaly_type.toLowerCase();
    if (scenario === "gradual_deterioration") return "Slow structural degradation over time";
    if (scenario === "sudden_spike") return "Short-term loading vibration spike";
    if (scenario === "environmental_disturbance") return "Weather and heavy traffic fluctuation";
  }

  return "Nominal baseline drift — continue monitoring";
}
