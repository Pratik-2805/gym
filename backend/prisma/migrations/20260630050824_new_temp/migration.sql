-- CreateEnum
CREATE TYPE "Role" AS ENUM ('SUPERADMIN', 'GYM_OWNER', 'STAFF');

-- CreateEnum
CREATE TYPE "MembershipStatus" AS ENUM ('ACTIVE', 'EXPIRED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "TransactionStatus" AS ENUM ('PENDING', 'AWAITING_VERIFICATION', 'PAID', 'FAILED', 'REJECTED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "PaymentMode" AS ENUM ('MANUAL_UPI', 'RAZORPAY');

-- CreateEnum
CREATE TYPE "ReminderType" AS ENUM ('EXPIRING_7', 'EXPIRING_3', 'EXPIRING_1', 'EXPIRED_TODAY', 'EXPIRED_3', 'EXPIRED_7');

-- CreateEnum
CREATE TYPE "WhatsappSessionStatus" AS ENUM ('CONNECTED', 'DISCONNECTED', 'INITIALIZING', 'QR_READY');

-- CreateEnum
CREATE TYPE "WhatsAppDisplayNameStatus" AS ENUM ('PENDING_REVIEW', 'APPROVED', 'DECLINED', 'REGISTERING', 'REGISTERED', 'REGISTRATION_FAILED');

-- CreateEnum
CREATE TYPE "CallPermissionStatus" AS ENUM ('UNKNOWN', 'PENDING', 'GRANTED', 'DENIED', 'REVOKED');

-- CreateTable
CREATE TABLE "Gym" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "whatsapp_connected" BOOLEAN NOT NULL DEFAULT false,
    "whatsapp_phone_number" TEXT,
    "whatsapp_phone_number_id" TEXT,
    "whatsapp_waba_id" TEXT,
    "whatsapp_business_id" TEXT,
    "whatsapp_access_token" TEXT,
    "whatsappStatus" TEXT DEFAULT 'disconnected',
    "whatsappVerifiedAt" TIMESTAMP(3),
    "whatsappLastError" TEXT,
    "whatsappVerificationStatus" TEXT DEFAULT 'NOT_VERIFIED',
    "whatsappQualityRating" TEXT DEFAULT 'UNKNOWN',
    "whatsappMessagingTier" TEXT DEFAULT 'UNKNOWN',
    "whatsappVerifiedName" TEXT,
    "whatsappDisplayPhoneNumber" TEXT,
    "whatsappNameStatus" "WhatsAppDisplayNameStatus",
    "pendingDisplayName" TEXT,
    "pendingNameStatus" "WhatsAppDisplayNameStatus",
    "lastNameChangeRequestAt" TIMESTAMP(3),
    "lastNameApprovedAt" TIMESTAMP(3),
    "lastRegistrationAttemptAt" TIMESTAMP(3),
    "registrationError" TEXT,
    "displayNameRetryCount" INTEGER NOT NULL DEFAULT 0,
    "displayNameLockedUntil" TIMESTAMP(3),

    CONSTRAINT "Gym_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WhatsAppDisplayNameHistory" (
    "id" TEXT NOT NULL,
    "gymId" TEXT NOT NULL,
    "requestedByUserId" TEXT,
    "phoneNumberId" TEXT NOT NULL,
    "graphApiVersion" TEXT NOT NULL,
    "oldName" TEXT,
    "newName" TEXT NOT NULL,
    "status" "WhatsAppDisplayNameStatus" NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "metaResponse" JSONB,
    "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "approvedAt" TIMESTAMP(3),
    "registeredAt" TIMESTAMP(3),
    "rejectionReason" TEXT,
    "processedByWorker" BOOLEAN NOT NULL DEFAULT false,
    "workerAttempts" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "WhatsAppDisplayNameHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GymUser" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'STAFF',
    "gymId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GymUser_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Member" (
    "id" TEXT NOT NULL,
    "memberName" TEXT,
    "whatsappName" TEXT,
    "phone" TEXT NOT NULL,
    "email" TEXT,
    "address" TEXT,
    "dob" TIMESTAMP(3),
    "emergencyContact" TEXT,
    "notes" TEXT,
    "isBotDisabled" BOOLEAN NOT NULL DEFAULT false,
    "blockedAt" TIMESTAMP(3),
    "callPermissionStatus" "CallPermissionStatus" NOT NULL DEFAULT 'UNKNOWN',
    "callPermissionUpdatedAt" TIMESTAMP(3),
    "callPermissionVerifiedAt" TIMESTAMP(3),
    "callPermissionRequestedAt" TIMESTAMP(3),
    "callPermissionGrantedAt" TIMESTAMP(3),
    "callPermissionRevokedAt" TIMESTAMP(3),
    "callPermissionRequestCount" INTEGER NOT NULL DEFAULT 0,
    "gymId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Member_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MembershipPlan" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "price" DOUBLE PRECISION NOT NULL,
    "durationDays" INTEGER NOT NULL,
    "gymId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MembershipPlan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Membership" (
    "id" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "status" "MembershipStatus" NOT NULL DEFAULT 'ACTIVE',
    "gymId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Membership_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Transaction" (
    "id" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "status" "TransactionStatus" NOT NULL DEFAULT 'PENDING',
    "paymentMode" "PaymentMode" NOT NULL,
    "referenceId" TEXT,
    "paymentDetails" JSONB,
    "memberId" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "gymId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Transaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WhatsappSession" (
    "id" TEXT NOT NULL,
    "sessionData" TEXT,
    "qrCode" TEXT,
    "status" "WhatsappSessionStatus" NOT NULL DEFAULT 'DISCONNECTED',
    "gymId" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WhatsappSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChatbotSettings" (
    "id" TEXT NOT NULL,
    "welcomeMessage" TEXT NOT NULL DEFAULT 'Welcome to {{gym_name}}!

1. My Membership
2. Renew Membership
3. View Plans
4. Contact Gym
5. Offers',
    "isAiModeEnabled" BOOLEAN NOT NULL DEFAULT false,
    "aiKnowledgeBase" TEXT,
    "gymId" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ChatbotSettings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PaymentSettings" (
    "id" TEXT NOT NULL,
    "upiId" TEXT,
    "upiName" TEXT,
    "razorpayKeyId" TEXT,
    "razorpayKeySecret" TEXT,
    "isRazorpayEnabled" BOOLEAN NOT NULL DEFAULT false,
    "gymId" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PaymentSettings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RenewalLog" (
    "id" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "membershipId" TEXT NOT NULL,
    "reminderType" "ReminderType" NOT NULL,
    "status" TEXT NOT NULL,
    "gymId" TEXT NOT NULL,
    "sentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RenewalLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "recipientPhone" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "gymId" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Invoice" (
    "id" TEXT NOT NULL,
    "transactionId" TEXT NOT NULL,
    "invoiceNumber" TEXT NOT NULL,
    "pdfPath" TEXT,
    "gymId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Invoice_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "details" TEXT NOT NULL,
    "gymId" TEXT NOT NULL,
    "userId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WhatsAppMessages" (
    "id" TEXT NOT NULL,
    "gymId" TEXT NOT NULL,
    "messageId" TEXT NOT NULL,
    "senderPhone" TEXT NOT NULL,
    "recipientPhone" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "direction" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WhatsAppMessages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WhatsAppEvents" (
    "id" TEXT NOT NULL,
    "messageId" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL,
    "rawPayload" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WhatsAppEvents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WhatsAppTemplates" (
    "id" TEXT NOT NULL,
    "gymId" TEXT NOT NULL,
    "templateName" TEXT NOT NULL,
    "metaTemplateId" TEXT,
    "language" TEXT NOT NULL DEFAULT 'en_US',
    "category" TEXT NOT NULL DEFAULT 'UTILITY',
    "status" TEXT NOT NULL,
    "components" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WhatsAppTemplates_pkey" PRIMARY KEY ("id")
);

<<<<<<<< HEAD:backend/prisma/migrations/20260630050824_new_temp/migration.sql
========
-- CreateTable
CREATE TABLE "UserCredential" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "credentialID" TEXT NOT NULL,
    "publicKey" TEXT NOT NULL,
    "counter" INTEGER NOT NULL DEFAULT 0,
    "transports" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserCredential_pkey" PRIMARY KEY ("id")
);

>>>>>>>> eb2e7caadb73bb68ebcad9470330ac8742c5e4d9:backend/prisma/migrations/20260705072819_init/migration.sql
-- CreateIndex
CREATE UNIQUE INDEX "Gym_slug_key" ON "Gym"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "GymUser_email_key" ON "GymUser"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Member_gymId_phone_key" ON "Member"("gymId", "phone");

-- CreateIndex
CREATE UNIQUE INDEX "WhatsappSession_gymId_key" ON "WhatsappSession"("gymId");

-- CreateIndex
CREATE UNIQUE INDEX "ChatbotSettings_gymId_key" ON "ChatbotSettings"("gymId");

-- CreateIndex
CREATE UNIQUE INDEX "PaymentSettings_gymId_key" ON "PaymentSettings"("gymId");

-- CreateIndex
CREATE UNIQUE INDEX "Invoice_transactionId_key" ON "Invoice"("transactionId");

-- CreateIndex
CREATE UNIQUE INDEX "Invoice_invoiceNumber_key" ON "Invoice"("invoiceNumber");

-- CreateIndex
CREATE UNIQUE INDEX "WhatsAppMessages_messageId_key" ON "WhatsAppMessages"("messageId");

-- CreateIndex
CREATE UNIQUE INDEX "WhatsAppTemplates_gymId_templateName_key" ON "WhatsAppTemplates"("gymId", "templateName");

<<<<<<<< HEAD:backend/prisma/migrations/20260630050824_new_temp/migration.sql
========
-- CreateIndex
CREATE UNIQUE INDEX "UserCredential_credentialID_key" ON "UserCredential"("credentialID");

>>>>>>>> eb2e7caadb73bb68ebcad9470330ac8742c5e4d9:backend/prisma/migrations/20260705072819_init/migration.sql
-- AddForeignKey
ALTER TABLE "WhatsAppDisplayNameHistory" ADD CONSTRAINT "WhatsAppDisplayNameHistory_gymId_fkey" FOREIGN KEY ("gymId") REFERENCES "Gym"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GymUser" ADD CONSTRAINT "GymUser_gymId_fkey" FOREIGN KEY ("gymId") REFERENCES "Gym"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Member" ADD CONSTRAINT "Member_gymId_fkey" FOREIGN KEY ("gymId") REFERENCES "Gym"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MembershipPlan" ADD CONSTRAINT "MembershipPlan_gymId_fkey" FOREIGN KEY ("gymId") REFERENCES "Gym"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Membership" ADD CONSTRAINT "Membership_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "Member"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Membership" ADD CONSTRAINT "Membership_planId_fkey" FOREIGN KEY ("planId") REFERENCES "MembershipPlan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Membership" ADD CONSTRAINT "Membership_gymId_fkey" FOREIGN KEY ("gymId") REFERENCES "Gym"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "Member"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_planId_fkey" FOREIGN KEY ("planId") REFERENCES "MembershipPlan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_gymId_fkey" FOREIGN KEY ("gymId") REFERENCES "Gym"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WhatsappSession" ADD CONSTRAINT "WhatsappSession_gymId_fkey" FOREIGN KEY ("gymId") REFERENCES "Gym"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChatbotSettings" ADD CONSTRAINT "ChatbotSettings_gymId_fkey" FOREIGN KEY ("gymId") REFERENCES "Gym"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentSettings" ADD CONSTRAINT "PaymentSettings_gymId_fkey" FOREIGN KEY ("gymId") REFERENCES "Gym"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RenewalLog" ADD CONSTRAINT "RenewalLog_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "Member"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RenewalLog" ADD CONSTRAINT "RenewalLog_membershipId_fkey" FOREIGN KEY ("membershipId") REFERENCES "Membership"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RenewalLog" ADD CONSTRAINT "RenewalLog_gymId_fkey" FOREIGN KEY ("gymId") REFERENCES "Gym"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_gymId_fkey" FOREIGN KEY ("gymId") REFERENCES "Gym"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "Member"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_transactionId_fkey" FOREIGN KEY ("transactionId") REFERENCES "Transaction"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_gymId_fkey" FOREIGN KEY ("gymId") REFERENCES "Gym"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_gymId_fkey" FOREIGN KEY ("gymId") REFERENCES "Gym"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "GymUser"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WhatsAppMessages" ADD CONSTRAINT "WhatsAppMessages_gymId_fkey" FOREIGN KEY ("gymId") REFERENCES "Gym"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WhatsAppEvents" ADD CONSTRAINT "WhatsAppEvents_messageId_fkey" FOREIGN KEY ("messageId") REFERENCES "WhatsAppMessages"("messageId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WhatsAppTemplates" ADD CONSTRAINT "WhatsAppTemplates_gymId_fkey" FOREIGN KEY ("gymId") REFERENCES "Gym"("id") ON DELETE CASCADE ON UPDATE CASCADE;
<<<<<<<< HEAD:backend/prisma/migrations/20260630050824_new_temp/migration.sql
========

-- AddForeignKey
ALTER TABLE "UserCredential" ADD CONSTRAINT "UserCredential_userId_fkey" FOREIGN KEY ("userId") REFERENCES "GymUser"("id") ON DELETE CASCADE ON UPDATE CASCADE;
>>>>>>>> eb2e7caadb73bb68ebcad9470330ac8742c5e4d9:backend/prisma/migrations/20260705072819_init/migration.sql
