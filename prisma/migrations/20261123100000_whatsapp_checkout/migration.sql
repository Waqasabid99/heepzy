-- Orders can be placed by sending them to the store on WhatsApp.
ALTER TABLE `orders` MODIFY `paymentMethod` ENUM('COD', 'CARD', 'WALLET', 'MANUAL', 'WHATSAPP') NOT NULL;

ALTER TABLE `payments` MODIFY `method` ENUM('COD', 'CARD', 'WALLET', 'MANUAL', 'WHATSAPP') NOT NULL;

ALTER TABLE `store_settings` ADD COLUMN `whatsappCheckout` BOOLEAN NOT NULL DEFAULT true;
