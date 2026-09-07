CREATE TABLE `connections` (
	`id` text PRIMARY KEY NOT NULL,
	`from_trip` text NOT NULL,
	`to_trip` text NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`from_trip`) REFERENCES `trips`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`to_trip`) REFERENCES `trips`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `connections_pair` ON `connections` (`from_trip`,`to_trip`);--> statement-breakpoint
CREATE INDEX `connections_to` ON `connections` (`to_trip`);--> statement-breakpoint
CREATE TABLE `profiles` (
	`user_id` text PRIMARY KEY NOT NULL,
	`nickname` text NOT NULL,
	`phone` text NOT NULL,
	`contact_name` text DEFAULT '' NOT NULL,
	`contact_phone` text DEFAULT '' NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `profiles_nickname_unique` ON `profiles` (`nickname`);--> statement-breakpoint
CREATE TABLE `trips` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`corridor` text NOT NULL,
	`origin` integer NOT NULL,
	`destination` integer NOT NULL,
	`departure` integer NOT NULL,
	`ends_at` integer NOT NULL,
	`status` text NOT NULL,
	`support` integer DEFAULT 0 NOT NULL,
	`emergency` integer DEFAULT 0 NOT NULL,
	`reason` text DEFAULT '' NOT NULL,
	`location` text DEFAULT '' NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `profiles`(`user_id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `trips_user` ON `trips` (`user_id`);--> statement-breakpoint
CREATE INDEX `trips_status_ends` ON `trips` (`status`,`ends_at`);