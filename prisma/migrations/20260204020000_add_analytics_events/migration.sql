-- CreateTable
CREATE TABLE "analytics_events" (
    "id" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL,
    "projectId" TEXT,
    "sessionId" INTEGER,
    "deviceId" INTEGER,
    "path" TEXT,
    "referrer" TEXT,
    "country" TEXT,
    "region" TEXT,
    "city" TEXT,
    "deviceType" TEXT,
    "osName" TEXT,
    "clientName" TEXT,
    "vercelEnvironment" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "analytics_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "analytics_events_timestamp_idx" ON "analytics_events"("timestamp");

-- CreateIndex
CREATE INDEX "analytics_events_eventType_idx" ON "analytics_events"("eventType");

-- CreateIndex
CREATE INDEX "analytics_events_projectId_idx" ON "analytics_events"("projectId");

-- CreateIndex
CREATE INDEX "analytics_events_path_idx" ON "analytics_events"("path");

-- CreateIndex
CREATE INDEX "analytics_events_referrer_idx" ON "analytics_events"("referrer");

-- CreateIndex
CREATE INDEX "analytics_events_country_idx" ON "analytics_events"("country");

-- CreateIndex
CREATE INDEX "analytics_events_deviceType_idx" ON "analytics_events"("deviceType");
