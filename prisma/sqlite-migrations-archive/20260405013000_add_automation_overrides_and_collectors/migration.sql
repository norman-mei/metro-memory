ALTER TABLE "AutomationSourceDomain" ADD COLUMN "autoTrustScore" REAL;
ALTER TABLE "AutomationSourceDomain" ADD COLUMN "autoBlocked" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "AutomationSourceDomain" ADD COLUMN "manualBlocked" BOOLEAN;
ALTER TABLE "AutomationSourceDomain" ADD COLUMN "manualTrustScore" REAL;
ALTER TABLE "AutomationSourceDomain" ADD COLUMN "overrideReason" TEXT;

ALTER TABLE "AutomationPolicyMetric" ADD COLUMN "autoTrustScore" REAL;
ALTER TABLE "AutomationPolicyMetric" ADD COLUMN "manualTrustScore" REAL;
ALTER TABLE "AutomationPolicyMetric" ADD COLUMN "forcedLane" TEXT;
ALTER TABLE "AutomationPolicyMetric" ADD COLUMN "overrideReason" TEXT;
