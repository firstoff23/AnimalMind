CREATE TABLE `animals` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`name` varchar(100) NOT NULL,
	`species` enum('dog','cat') NOT NULL,
	`breed` varchar(100),
	`age` int,
	`isActive` boolean NOT NULL DEFAULT false,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `animals_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `classification_events` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`animalId` int,
	`state` enum('distress','attention','excitement','hunger','alert','relaxed') NOT NULL,
	`confidence` float NOT NULL,
	`emoji` varchar(10) NOT NULL,
	`modelUsed` varchar(50) NOT NULL,
	`cached` boolean NOT NULL DEFAULT false,
	`feedback` enum('correct','incorrect'),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `classification_events_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `settings` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`notificationsEnabled` boolean NOT NULL DEFAULT true,
	`alertSensitivity` enum('low','medium','high') NOT NULL DEFAULT 'medium',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `settings_id` PRIMARY KEY(`id`),
	CONSTRAINT `settings_userId_unique` UNIQUE(`userId`)
);
