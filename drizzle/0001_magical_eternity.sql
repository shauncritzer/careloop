CREATE TABLE `alerts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`patientId` int NOT NULL,
	`severity` enum('green','yellow','red') NOT NULL,
	`message` text NOT NULL,
	`recommendations` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `alerts_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `app_settings` (
	`id` int AUTO_INCREMENT NOT NULL,
	`pinHash` varchar(128) NOT NULL,
	`caregiverName` varchar(255),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `app_settings_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `daily_logs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`patientId` int NOT NULL,
	`logDate` varchar(10) NOT NULL,
	`weightLbs` float,
	`systolicBp` int,
	`diastolicBp` int,
	`pulseBpm` int,
	`spo2` int,
	`fluidIntakeOz` float,
	`sodiumMg` int,
	`breathingWorse` boolean NOT NULL DEFAULT false,
	`swelling` boolean NOT NULL DEFAULT false,
	`confusion` boolean NOT NULL DEFAULT false,
	`dizziness` boolean NOT NULL DEFAULT false,
	`chestPain` boolean NOT NULL DEFAULT false,
	`missedMeds` boolean NOT NULL DEFAULT false,
	`fallOrNearFall` boolean NOT NULL DEFAULT false,
	`poorAppetite` boolean NOT NULL DEFAULT false,
	`poorSleep` boolean NOT NULL DEFAULT false,
	`notes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `daily_logs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `family_access` (
	`id` int AUTO_INCREMENT NOT NULL,
	`patientId` int NOT NULL,
	`invitedEmail` varchar(320) NOT NULL,
	`accessCode` varchar(32) NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `family_access_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `patients` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(255) NOT NULL,
	`dateOfBirth` varchar(20),
	`baselineWeightLbs` float,
	`baselineSysBp` int,
	`baselineDiaBp` int,
	`baselinePulse` int,
	`baselineSpo2` int,
	`fluidLimitOz` int,
	`sodiumLimitMg` int,
	`caregiverName` varchar(255),
	`familyContactName` varchar(255),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `patients_id` PRIMARY KEY(`id`)
);
