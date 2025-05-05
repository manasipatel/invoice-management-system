CREATE TABLE `TokenUsage` (
	`id` text PRIMARY KEY NOT NULL,
	`invoiceId` text NOT NULL,
	`promptTokens` integer NOT NULL,
	`completionTokens` integer NOT NULL,
	`totalTokens` integer NOT NULL,
	`cost` text NOT NULL,
	`createdAt` integer NOT NULL,
	FOREIGN KEY (`invoiceId`) REFERENCES `Invoice`(`id`) ON UPDATE no action ON DELETE no action
);
