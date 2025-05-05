CREATE TABLE `Invoice` (
	`id` text PRIMARY KEY NOT NULL,
	`customerName` text NOT NULL,
	`vendorName` text NOT NULL,
	`invoiceNumber` text NOT NULL,
	`invoiceDate` integer NOT NULL,
	`dueDate` integer NOT NULL,
	`amount` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `InvoiceLineItem` (
	`id` text PRIMARY KEY NOT NULL,
	`invoiceId` text NOT NULL,
	`description` text NOT NULL,
	`quantity` integer NOT NULL,
	`unitPrice` integer NOT NULL,
	`total` integer NOT NULL,
	FOREIGN KEY (`invoiceId`) REFERENCES `Invoice`(`id`) ON UPDATE no action ON DELETE no action
);
