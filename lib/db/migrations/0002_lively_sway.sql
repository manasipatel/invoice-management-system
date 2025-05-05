PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_Invoice` (
	`id` text PRIMARY KEY NOT NULL,
	`customerName` text,
	`vendorName` text,
	`invoiceNumber` text,
	`invoiceDate` integer,
	`dueDate` integer,
	`amount` text
);
--> statement-breakpoint
INSERT INTO `__new_Invoice`("id", "customerName", "vendorName", "invoiceNumber", "invoiceDate", "dueDate", "amount") SELECT "id", "customerName", "vendorName", "invoiceNumber", "invoiceDate", "dueDate", "amount" FROM `Invoice`;--> statement-breakpoint
DROP TABLE `Invoice`;--> statement-breakpoint
ALTER TABLE `__new_Invoice` RENAME TO `Invoice`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE TABLE `__new_InvoiceLineItem` (
	`id` text PRIMARY KEY NOT NULL,
	`invoiceId` text NOT NULL,
	`description` text NOT NULL,
	`quantity` text,
	`unitPrice` text,
	`total` text,
	FOREIGN KEY (`invoiceId`) REFERENCES `Invoice`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
INSERT INTO `__new_InvoiceLineItem`("id", "invoiceId", "description", "quantity", "unitPrice", "total") SELECT "id", "invoiceId", "description", "quantity", "unitPrice", "total" FROM `InvoiceLineItem`;--> statement-breakpoint
DROP TABLE `InvoiceLineItem`;--> statement-breakpoint
ALTER TABLE `__new_InvoiceLineItem` RENAME TO `InvoiceLineItem`;