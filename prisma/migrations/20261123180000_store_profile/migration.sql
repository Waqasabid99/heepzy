-- Store profile shown in the footer: tagline, address and social links.
ALTER TABLE `store_settings`
    ADD COLUMN `tagline` VARCHAR(160) NULL,
    ADD COLUMN `storeAddress` VARCHAR(255) NULL,
    ADD COLUMN `facebookUrl` VARCHAR(255) NULL,
    ADD COLUMN `instagramUrl` VARCHAR(255) NULL,
    ADD COLUMN `tiktokUrl` VARCHAR(255) NULL;
