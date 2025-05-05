PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_TokenUsage` (
	`id` text PRIMARY KEY NOT NULL,
	`invoiceId` text,
	`promptTokens` integer NOT NULL,
	`completionTokens` integer NOT NULL,
	`totalTokens` integer NOT NULL,
	`cost` text NOT NULL,
	`createdAt` integer NOT NULL,
	FOREIGN KEY (`invoiceId`) REFERENCES `Invoice`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
INSERT INTO `__new_TokenUsage`("id", "invoiceId", "promptTokens", "completionTokens", "totalTokens", "cost", "createdAt") SELECT "id", "invoiceId", "promptTokens", "completionTokens", "totalTokens", "cost", "createdAt" FROM `TokenUsage`;--> statement-breakpoint
DROP TABLE `TokenUsage`;--> statement-breakpoint
ALTER TABLE `__new_TokenUsage` RENAME TO `TokenUsage`;--> statement-breakpoint
PRAGMA foreign_keys=ON;