-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "phone" TEXT,
    "preferredLanguage" TEXT NOT NULL DEFAULT 'en',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "lastLoginAt" TIMESTAMP(3),

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sessions" (
    "id" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rate_limit_hits" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "rate_limit_hits_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "farmer_profiles" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "age" INTEGER,
    "stateCode" TEXT,
    "district" TEXT,
    "village" TEXT,
    "farmerCategory" TEXT,
    "landholdingAcres" DOUBLE PRECISION,
    "primaryCrop" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "farmer_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "organizations" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "route" TEXT NOT NULL,

    CONSTRAINT "organizations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "officer_assignments" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "title" TEXT NOT NULL DEFAULT 'Reviewing officer',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "officer_assignments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "assistance_codes" (
    "id" TEXT NOT NULL,
    "farmerId" TEXT NOT NULL,
    "codeHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "assistance_codes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "operator_authorizations" (
    "id" TEXT NOT NULL,
    "operatorId" TEXT NOT NULL,
    "farmerId" TEXT NOT NULL,
    "consentMethod" TEXT NOT NULL,
    "consentText" TEXT NOT NULL,
    "grantedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "revokedAt" TIMESTAMP(3),

    CONSTRAINT "operator_authorizations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "applications" (
    "id" TEXT NOT NULL,
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
    "prefillConsentAt" TIMESTAMP(3),
    "submittedAt" TIMESTAMP(3),
    "decidedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "applications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "application_revisions" (
    "id" TEXT NOT NULL,
    "applicationId" TEXT NOT NULL,
    "revisionNo" INTEGER NOT NULL,
    "snapshot" TEXT NOT NULL,
    "changedFields" TEXT NOT NULL DEFAULT '[]',
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "application_revisions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "government_application_details" (
    "id" TEXT NOT NULL,
    "applicationId" TEXT NOT NULL,
    "fullName" TEXT,
    "age" INTEGER,
    "stateCode" TEXT,
    "district" TEXT,
    "village" TEXT,
    "farmerCategory" TEXT,
    "landholdingAcres" DOUBLE PRECISION,
    "cropCategory" TEXT,
    "irrigationType" TEXT,
    "annualAgriIncome" DOUBLE PRECISION,
    "supportPurpose" TEXT,
    "requestedAmount" DOUBLE PRECISION,
    "hasBankAccount" BOOLEAN,
    "priorSchemeDefault" BOOLEAN,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "government_application_details_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bank_application_details" (
    "id" TEXT NOT NULL,
    "applicationId" TEXT NOT NULL,
    "fullName" TEXT,
    "age" INTEGER,
    "stateCode" TEXT,
    "district" TEXT,
    "village" TEXT,
    "annualIncome" DOUBLE PRECISION,
    "requestedAmount" DOUBLE PRECISION,
    "loanPurpose" TEXT,
    "tenureMonths" INTEGER,
    "existingMonthlyEmi" DOUBLE PRECISION,
    "landholdingAcres" DOUBLE PRECISION,
    "collateralType" TEXT,
    "collateralValue" DOUBLE PRECISION,
    "creditHistory" TEXT,
    "yearsFarming" INTEGER,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "bank_application_details_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "documents" (
    "id" TEXT NOT NULL,
    "applicationId" TEXT NOT NULL,
    "docType" TEXT NOT NULL,
    "originalName" TEXT NOT NULL,
    "storedName" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "sha256" TEXT NOT NULL,
    "uploadedById" TEXT NOT NULL,
    "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revisionNo" INTEGER NOT NULL,
    "supersededAt" TIMESTAMP(3),

    CONSTRAINT "documents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "model_versions" (
    "id" TEXT NOT NULL,
    "route" TEXT NOT NULL,
    "version" TEXT NOT NULL,
    "algorithm" TEXT NOT NULL,
    "artifactPath" TEXT NOT NULL,
    "metrics" TEXT NOT NULL,
    "trainedAt" TIMESTAMP(3) NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "model_versions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "eligibility_rule_configs" (
    "id" TEXT NOT NULL,
    "route" TEXT NOT NULL,
    "version" TEXT NOT NULL,
    "rules" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "eligibility_rule_configs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "assessment_results" (
    "id" TEXT NOT NULL,
    "applicationId" TEXT NOT NULL,
    "revisionNo" INTEGER NOT NULL,
    "modelVersionId" TEXT NOT NULL,
    "ruleConfigId" TEXT NOT NULL,
    "outcome" TEXT NOT NULL,
    "score" DOUBLE PRECISION NOT NULL,
    "ruleResults" TEXT NOT NULL,
    "explanation" TEXT NOT NULL,
    "recommendation" TEXT NOT NULL,
    "suggestions" TEXT NOT NULL DEFAULT '[]',
    "isStale" BOOLEAN NOT NULL DEFAULT false,
    "triggeredById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "assessment_results_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "officer_reviews" (
    "id" TEXT NOT NULL,
    "applicationId" TEXT NOT NULL,
    "revisionNo" INTEGER NOT NULL,
    "officerId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "visibleToFarmer" BOOLEAN NOT NULL DEFAULT true,
    "summary" TEXT NOT NULL,
    "nextSteps" TEXT,
    "deadline" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "officer_reviews_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "review_request_items" (
    "id" TEXT NOT NULL,
    "reviewId" TEXT NOT NULL,
    "itemType" TEXT NOT NULL,
    "fieldKey" TEXT,
    "documentType" TEXT,
    "message" TEXT NOT NULL,
    "resolvedInRevisionNo" INTEGER,
    "resolvedAt" TIMESTAMP(3),
    "farmerResponse" TEXT,

    CONSTRAINT "review_request_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "application_decisions" (
    "id" TEXT NOT NULL,
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
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "application_decisions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "status_history" (
    "id" TEXT NOT NULL,
    "applicationId" TEXT NOT NULL,
    "fromStatus" TEXT,
    "toStatus" TEXT NOT NULL,
    "actorId" TEXT NOT NULL,
    "actorRole" TEXT NOT NULL,
    "note" TEXT,
    "revisionNo" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "status_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "applicationId" TEXT,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "link" TEXT NOT NULL,
    "dedupeKey" TEXT NOT NULL,
    "readAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" TEXT NOT NULL,
    "actorId" TEXT,
    "actorRole" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "applicationId" TEXT,
    "metadata" TEXT NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
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

-- AddForeignKey
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "farmer_profiles" ADD CONSTRAINT "farmer_profiles_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "officer_assignments" ADD CONSTRAINT "officer_assignments_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "officer_assignments" ADD CONSTRAINT "officer_assignments_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assistance_codes" ADD CONSTRAINT "assistance_codes_farmerId_fkey" FOREIGN KEY ("farmerId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "operator_authorizations" ADD CONSTRAINT "operator_authorizations_operatorId_fkey" FOREIGN KEY ("operatorId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "operator_authorizations" ADD CONSTRAINT "operator_authorizations_farmerId_fkey" FOREIGN KEY ("farmerId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "applications" ADD CONSTRAINT "applications_farmerId_fkey" FOREIGN KEY ("farmerId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "applications" ADD CONSTRAINT "applications_assistedByOperatorId_fkey" FOREIGN KEY ("assistedByOperatorId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "applications" ADD CONSTRAINT "applications_operatorAuthorizationId_fkey" FOREIGN KEY ("operatorAuthorizationId") REFERENCES "operator_authorizations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "applications" ADD CONSTRAINT "applications_parentApplicationId_fkey" FOREIGN KEY ("parentApplicationId") REFERENCES "applications"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "application_revisions" ADD CONSTRAINT "application_revisions_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "applications"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "application_revisions" ADD CONSTRAINT "application_revisions_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "government_application_details" ADD CONSTRAINT "government_application_details_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "applications"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bank_application_details" ADD CONSTRAINT "bank_application_details_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "applications"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "documents" ADD CONSTRAINT "documents_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "applications"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "documents" ADD CONSTRAINT "documents_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assessment_results" ADD CONSTRAINT "assessment_results_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "applications"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assessment_results" ADD CONSTRAINT "assessment_results_modelVersionId_fkey" FOREIGN KEY ("modelVersionId") REFERENCES "model_versions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assessment_results" ADD CONSTRAINT "assessment_results_ruleConfigId_fkey" FOREIGN KEY ("ruleConfigId") REFERENCES "eligibility_rule_configs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assessment_results" ADD CONSTRAINT "assessment_results_triggeredById_fkey" FOREIGN KEY ("triggeredById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "officer_reviews" ADD CONSTRAINT "officer_reviews_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "applications"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "officer_reviews" ADD CONSTRAINT "officer_reviews_officerId_fkey" FOREIGN KEY ("officerId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "review_request_items" ADD CONSTRAINT "review_request_items_reviewId_fkey" FOREIGN KEY ("reviewId") REFERENCES "officer_reviews"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "application_decisions" ADD CONSTRAINT "application_decisions_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "applications"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "application_decisions" ADD CONSTRAINT "application_decisions_officerId_fkey" FOREIGN KEY ("officerId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "application_decisions" ADD CONSTRAINT "application_decisions_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "status_history" ADD CONSTRAINT "status_history_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "applications"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "status_history" ADD CONSTRAINT "status_history_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "applications"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "applications"("id") ON DELETE CASCADE ON UPDATE CASCADE;
