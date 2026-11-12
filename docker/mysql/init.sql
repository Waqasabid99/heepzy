-- Local dev only: `prisma migrate dev` needs to create a temporary shadow database.
GRANT CREATE, DROP, ALTER, INDEX, REFERENCES, SELECT, INSERT, UPDATE, DELETE ON *.* TO 'heepzy'@'%';
FLUSH PRIVILEGES;
