-- Messages for returns/refunds: one per order + event + subject (return or refund id).
-- The foreign key on orderId needs an index while the unique key is swapped.
ALTER TABLE `outbound_messages` DROP FOREIGN KEY `outbound_messages_orderId_fkey`;

DROP INDEX `outbound_messages_orderId_event_key` ON `outbound_messages`;

ALTER TABLE `outbound_messages` ADD COLUMN `refId` VARCHAR(40) NOT NULL DEFAULT '';

CREATE UNIQUE INDEX `outbound_messages_orderId_event_refId_key` ON `outbound_messages`(`orderId`, `event`, `refId`);

ALTER TABLE `outbound_messages` ADD CONSTRAINT `outbound_messages_orderId_fkey` FOREIGN KEY (`orderId`) REFERENCES `orders`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
