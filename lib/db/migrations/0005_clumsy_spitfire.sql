CREATE TABLE `InputToken` (
	`id` text PRIMARY KEY NOT NULL,
	`chatId` text,
	`messageId` text,
	`tokens` integer NOT NULL,
	`createdAt` integer NOT NULL,
	FOREIGN KEY (`chatId`) REFERENCES `Chat`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`messageId`) REFERENCES `Message`(`id`) ON UPDATE no action ON DELETE set null
);
