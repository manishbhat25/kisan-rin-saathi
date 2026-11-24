-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "phone" TEXT,
    "preferredLanguage" TEXT NOT NULL DEFAULT 'en',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "lastLoginAt" DATETIME
);

-- CreateTable
CREATE TABLE "sessions" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tokenHash" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" DATETIME NOT NULL,
    CONSTRAINT "sessions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "rate_limit_hits" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "key" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "farmer_profiles" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "age" INTEGER,
    "stateCode" TEXT,
    "district" TEXT,
    "village" TEXT,
    "farmerCategory" TEXT,
    "landholdingAcres" REAL,
    "primaryCrop" TEXT,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "farmer_profiles_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "organizations" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "route" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "officer_assignments" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "title" TEXT NOT NULL DEFAULT 'Reviewing officer',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "officer_assignments_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "officer_assignments_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "assistance_codes" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "farmerId" TEXT NOT NULL,
    "codeHash" TEXT NOT NULL,
    "expiresAt" DATETIME NOT NULL,
    "usedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "assistance_codes_farmerId_fkey" FOREIGN KEY ("farmerId") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "operator_authorizations" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "operatorId" TEXT NOT NULL,
    "farmerId" TEXT NOT NULL,
    "consentMethod" TEXT NOT NULL,
    "consentText" TEXT NOT NULL,
    "grantedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" DATETIME NOT NULL,
    "revokedAt" DATETIME,
    CONSTRAINT "operator_authorizations_operatorId_fkey" FOREIGN KEY ("operatorId") REFERENCES "users" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "operator_authorizations_farmerId_fkey" FOREIGN KEY ("farmerId") REFERENCES "users" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "applications" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "reference" TEXT NOT NULL,
    "clientRequestId" TEXT NOT NULL,
    "farmerId" TEXT NOT NULL,
    "route" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "version" INTEGER NOT NULL DEFAULT 1,
    "currentRevisionNo" INTEGER NOT NULL DEFAULT 0,
    "submissionMethod" TEXT NOT NULL DEFAULT 'SELF',
    "assistedByOperatorId" TEXT,
    "operatorAuthorizationId" TEXT,
    "parentApplicationId" TEXT,
    "prefillConsentAt" DATETIME,
    "submittedAt" DATETIME,
    "decidedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "applications_farmerId_fkey" FOREIGN KEY ("farmerId") REFERENCES "users" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "applications_assistedByOperatorId_fkey" FOREIGN KEY ("assistedByOperatorId") REFERENCES "users" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "applications_operatorAuthorizationId_fkey" FOREIGN KEY ("operatorAuthorizationId") REFERENCES "operator_authorizations" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "applications_parentApplicationId_fkey" FOREIGN KEY ("parentApplicationId") REFERENCES "applications" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "application_revisions" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "applicationId" TEXT NOT NULL,
    "revisionNo" INTEGER NOT NULL,
    "snapshot" TEXT NOT NULL,
    "changedFields" TEXT NOT NULL DEFAULT '[]',
    "createdById" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "application_revisions_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "applications" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "application_revisions_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "government_application_details" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "applicationId" TEXT NOT NULL,
    "fullName" TEXT,
    "age" INTEGER,
    "stateCode" TEXT,
    "district" TEXT,
    "village" TEXT,
    "farmerCategory" TEXT,
    "landholdingAcres" REAL,
    "cropCategory" TEXT,
    "irrigationType" TEXT,
    "annualAgriIncome" REAL,
    "supportPurpose" TEXT,
    "requestedAmount" REAL,
    "hasBankAccount" BOOLEAN,
    "priorSchemeDefault" BOOLEAN,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "government_application_details_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "applications" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "bank_application_details" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "applicationId" TEXT NOT NULL,
    "fullName" TEXT,
    "age" INTEGER,
    "stateCode" TEXT,
    "district" TEXT,
    "village" TEXT,
    "annualIncome" REAL,
    "requestedAmount" REAL,
    "loanPurpose" TEXT,
    "tenureMonths" INTEGER,
    "existingMonthlyEmi" REAL,
    "landholdingAcres" REAL,
    "collateralType" TEXT,
    "collateralValue" REAL,
    "creditHistory" TEXT,
    "yearsFarming" INTEGER,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "bank_application_details_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "applications" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "documents" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "applicationId" TEXT NOT NULL,
    "docType" TEXT NOT NULL,
    "originalName" TEXT NOT NULL,
    "storedName" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "sha256" TEXT NOT NULL,
    "uploadedById" TEXT NOT NULL,
    "uploadedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revisionNo" INTEGER NOT NULL,
    "supersededAt" DATETIME,
    CONSTRAINT "documents_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "applications" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "documents_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "users" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "model_versions" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "route" TEXT NOT NULL,
    "version" TEXT NOT NULL,
    "algorithm" TEXT NOT NULL,
    "artifactPath" TEXT NOT NULL,
    "metrics" TEXT NOT NULL,
    "trainedAt" DATETIME NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "eligibility_rule_configs" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "route" TEXT NOT NULL,
    "version" TEXT NOT NULL,
    "rules" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "assessment_results" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "applicationId" TEXT NOT NULL,
    "revisionNo" INTEGER NOT NULL,
    "modelVersionId" TEXT NOT NULL,
    "ruleConfigId" TEXT NOT NULL,
    "outcome" TEXT NOT NULL,
    "score" REAL NOT NULL,
    "ruleResults" TEXT NOT NULL,
    "explanation" TEXT NOT NULL,
    "recommendation" TEXT NOT NULL,
    "suggestions" TEXT NOT NULL DEFAULT '[]',
    "isStale" BOOLEAN NOT NULL DEFAULT false,
    "triggeredById" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "assessment_results_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "applications" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "assessment_results_modelVersionId_fkey" FOREIGN KEY ("modelVersionId") REFERENCES "model_versions" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "assessment_results_ruleConfigId_fkey" FOREIGN KEY ("ruleConfigId") REFERENCES "eligibility_rule_configs" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "assessment_results_triggeredById_fkey" FOREIGN KEY ("triggeredById") REFERENCES "users" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "officer_reviews" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "applicationId" TEXT NOT NULL,
    "revisionNo" INTEGER NOT NULL,
    "officerId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "visibleToFarmer" BOOLEAN NOT NULL DEFAULT true,
    "summary" TEXT NOT NULL,
    "nextSteps" TEXT,
    "deadline" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "officer_reviews_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "applications" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "officer_reviews_officerId_fkey" FOREIGN KEY ("officerId") REFERENCES "users" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "review_request_items" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "reviewId" TEXT NOT NULL,
    "itemType" TEXT NOT NULL,
    "fieldKey" TEXT,
    "documentType" TEXT,
    "message" TEXT NOT NULL,
    "resolvedInRevisionNo" INTEGER,
    "resolvedAt" DATETIME,
    "farmerResponse" TEXT,
    CONSTRAINT "review_request_items_reviewId_fkey" FOREIGN KEY ("reviewId") REFERENCES "officer_reviews" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "application_decisions" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "applicationId" TEXT NOT NULL,
    "decision" TEXT NOT NULL,
    "finalKey" TEXT,
    "reason" TEXT NOT NULL,
    "conditions" TEXT,
    "overridesAssessment" BOOLEAN NOT NULL DEFAULT false,
    "officerId" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "revisionNo" INTEGER NOT NULL,
    "assessmentId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "application_decisions_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "applications" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "application_decisions_officerId_fkey" FOREIGN KEY ("officerId") REFERENCES "users" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "application_decisions_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "status_history" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "applicationId" TEXT NOT NULL,
    "fromStatus" TEXT,
    "toStatus" TEXT NOT NULL,
    "actorId" TEXT NOT NULL,
    "actorRole" TEXT NOT NULL,
    "note" TEXT,
    "revisionNo" INTEGER NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "status_history_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "applications" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "status_history_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "users" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "applicationId" TEXT,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "link" TEXT NOT NULL,
    "dedupeKey" TEXT NOT NULL,
    "readAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "notifications_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "notifications_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "applications" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "actorId" TEXT,
    "actorRole" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "applicationId" TEXT,
    "metadata" TEXT NOT NULL DEFAULT '{}',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "audit_logs_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "users" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "audit_logs_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "applications" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "sessions_tokenHash_key" ON "sessions"("tokenHash");

-- CreateIndex
CREATE INDEX "sessions_userId_idx" ON "sessions"("userId");

-- CreateIndex
CREATE INDEX "rate_limit_hits_key_createdAt_idx" ON "rate_limit_hits"("key", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "farmer_profiles_userId_key" ON "farmer_profiles"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "organizations_code_key" ON "organizations"("code");

-- CreateIndex
CREATE UNIQUE INDEX "organizations_route_key" ON "organizations"("route");

-- CreateIndex
CREATE UNIQUE INDEX "officer_assignments_userId_organizationId_key" ON "officer_assignments"("userId", "organizationId");

-- CreateIndex
CREATE INDEX "assistance_codes_farmerId_idx" ON "assistance_codes"("farmerId");

-- CreateIndex
CREATE INDEX "operator_authorizations_operatorId_farmerId_idx" ON "operator_authorizations"("operatorId", "farmerId");

-- CreateIndex
CREATE UNIQUE INDEX "applications_reference_key" ON "applications"("reference");

-- CreateIndex
CREATE UNIQUE INDEX "applications_clientRequestId_key" ON "applications"("clientRequestId");

-- CreateIndex
CREATE INDEX "applications_route_status_idx" ON "applications"("route", "status");

-- CreateIndex
CREATE INDEX "applications_farmerId_idx" ON "applications"("farmerId");

-- CreateIndex
CREATE UNIQUE INDEX "application_revisions_applicationId_revisionNo_key" ON "application_revisions"("applicationId", "revisionNo");

-- CreateIndex
CREATE UNIQUE INDEX "government_application_details_applicationId_key" ON "government_application_details"("applicationId");

-- CreateIndex
CREATE UNIQUE INDEX "bank_application_details_applicationId_key" ON "bank_application_details"("applicationId");

-- CreateIndex
CREATE UNIQUE INDEX "documents_storedName_key" ON "documents"("storedName");

-- CreateIndex
CREATE INDEX "documents_applicationId_docType_idx" ON "documents"("applicationId", "docType");

-- CreateIndex
CREATE UNIQUE INDEX "model_versions_version_key" ON "model_versions"("version");

-- CreateIndex
CREATE INDEX "model_versions_route_isActive_idx" ON "model_versions"("route", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "eligibility_rule_configs_version_key" ON "eligibility_rule_configs"("version");

-- CreateIndex
CREATE INDEX "eligibility_rule_configs_route_isActive_idx" ON "eligibility_rule_configs"("route", "isActive");

-- CreateIndex
CREATE INDEX "assessment_results_applicationId_createdAt_idx" ON "assessment_results"("applicationId", "createdAt");

-- CreateIndex
CREATE INDEX "officer_reviews_applicationId_createdAt_idx" ON "officer_reviews"("applicationId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "application_decisions_finalKey_key" ON "application_decisions"("finalKey");

-- CreateIndex
CREATE INDEX "application_decisions_applicationId_idx" ON "application_decisions"("applicationId");

-- CreateIndex
CREATE INDEX "status_history_applicationId_createdAt_idx" ON "status_history"("applicationId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "notifications_dedupeKey_key" ON "notifications"("dedupeKey");

-- CreateIndex
CREATE INDEX "notifications_userId_readAt_idx" ON "notifications"("userId", "readAt");

-- CreateIndex
CREATE INDEX "audit_logs_applicationId_createdAt_idx" ON "audit_logs"("applicationId", "createdAt");

-- CreateIndex
CREATE INDEX "audit_logs_actorId_idx" ON "audit_logs"("actorId");
