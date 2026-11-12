/**
 * Seed baseline data. Idempotent — safe to run repeatedly.
 *   npm run db:seed
 * Creates: admin user (from SEED_ADMIN_* env), store settings, GST rate,
 * delivery zones/rates, categories, brand, a size chart and one sample product.
 */
import "dotenv/config";
import { randomUUID } from "node:crypto";
import { PrismaMariaDb } from "@prisma/adapter-mariadb";
import { hashPassword } from "better-auth/crypto";
import prismaPkg from "../src/generated/prisma/index.js";

const { PrismaClient } = prismaPkg;

const url = new URL(process.env.DATABASE_URL);
const db = new PrismaClient({
  adapter: new PrismaMariaDb({
    host: url.hostname,
    port: Number(url.port || 3306),
    user: decodeURIComponent(url.username),
    password: decodeURIComponent(url.password),
    database: url.pathname.slice(1),
    connectionLimit: 2,
    allowPublicKeyRetrieval: url.searchParams.get("allowPublicKeyRetrieval") === "true",
  }),
});

async function seedAdmin() {
  const email = process.env.SEED_ADMIN_EMAIL?.toLowerCase();
  const password = process.env.SEED_ADMIN_PASSWORD;
  if (!email || !password) {
    console.warn("• Skipping admin: set SEED_ADMIN_EMAIL and SEED_ADMIN_PASSWORD");
    return;
  }
  if (password.length < 12) throw new Error("SEED_ADMIN_PASSWORD must be at least 12 characters");

  const existing = await db.user.findUnique({ where: { email } });
  if (existing) {
    await db.user.update({ where: { id: existing.id }, data: { role: "admin" } });
    console.log(`• Admin exists: ${email}`);
    return;
  }
  const userId = randomUUID();
  await db.user.create({
    data: {
      id: userId,
      email,
      name: process.env.SEED_ADMIN_NAME || "Admin",
      emailVerified: true,
      role: "admin",
      accounts: {
        create: {
          id: randomUUID(),
          accountId: userId,
          providerId: "credential",
          password: await hashPassword(password),
        },
      },
    },
  });
  console.log(`• Admin created: ${email}`);
}

async function seedStore() {
  await db.storeSettings.upsert({
    where: { id: 1 },
    update: {},
    create: {
      id: 1,
      storeName: "Heepzy",
      freeDeliveryEnabled: true,
      freeDeliveryThreshold: "5000.00",
      returnWindowDays: 7,
    },
  });

  if (!(await db.taxRate.count())) {
    await db.taxRate.create({ data: { name: "GST", rate: "18.00", priority: 0 } });
  }

  if (!(await db.deliveryZone.count())) {
    await db.deliveryZone.create({
      data: {
        name: "Major cities",
        cities: ["karachi", "lahore", "islamabad", "rawalpindi", "faisalabad", "multan", "peshawar"],
        sortOrder: 0,
        rates: {
          create: [
            { name: "Standard", price: "250.00", codFee: "0.00", estimatedDaysMin: 2, estimatedDaysMax: 4 },
            { name: "Express", price: "450.00", estimatedDaysMin: 1, estimatedDaysMax: 2 },
          ],
        },
      },
    });
    await db.deliveryZone.create({
      data: {
        name: "Rest of Pakistan",
        isDefault: true,
        sortOrder: 10,
        rates: {
          create: [{ name: "Standard", price: "350.00", codFee: "50.00", estimatedDaysMin: 3, estimatedDaysMax: 6 }],
        },
      },
    });
  }
  console.log("• Store settings, tax and delivery seeded");
}

async function seedCatalogue() {
  const cats = [
    ["Sneakers", "sneakers"],
    ["Formal", "formal"],
    ["Sandals & Slides", "sandals"],
    ["Sports", "sports"],
    ["Boots", "boots"],
  ];
  for (const [i, [name, slug]] of cats.entries()) {
    await db.category.upsert({ where: { slug }, update: {}, create: { name, slug, sortOrder: i } });
  }

  const brand = await db.brand.upsert({
    where: { slug: "heepzy" },
    update: {},
    create: { name: "Heepzy", slug: "heepzy" },
  });

  let chart = await db.sizeChart.findFirst({ where: { name: "Men's shoes" } });
  if (!chart) {
    const rows = [
      ["39", "39", "6", "7", "24.5"],
      ["40", "40", "6.5", "7.5", "25.0"],
      ["41", "41", "7.5", "8.5", "25.8"],
      ["42", "42", "8", "9", "26.5"],
      ["43", "43", "9", "10", "27.3"],
      ["44", "44", "9.5", "10.5", "28.0"],
      ["45", "45", "10.5", "11.5", "28.8"],
    ];
    chart = await db.sizeChart.create({
      data: {
        name: "Men's shoes",
        description: "Measure your foot from heel to longest toe and pick the closest foot length.",
        entries: {
          create: rows.map(([label, eu, uk, us, cm], i) => ({ label, eu, uk, us, footLengthCm: cm, sortOrder: i })),
        },
      },
    });
  }

  const slug = "heepzy-street-runner";
  if (!(await db.product.findUnique({ where: { slug } }))) {
    await db.product.create({
      data: {
        name: "Street Runner",
        slug,
        shortDescription: "Lightweight everyday sneaker with a cushioned sole.",
        description: "Breathable mesh upper, cushioned EVA midsole and a grippy rubber outsole.",
        gender: "MEN",
        status: "ACTIVE",
        isFeatured: true,
        basePrice: "6999.00",
        compareAtPrice: "8499.00",
        material: "Mesh / EVA",
        brand: { connect: { id: brand.id } },
        sizeChart: { connect: { id: chart.id } },
        categories: { connect: [{ slug: "sneakers" }] },
        variants: {
          create: ["40", "41", "42", "43", "44"].flatMap((size) =>
            [
              ["Black", "#111111", "BLK"],
              ["White", "#f5f5f5", "WHT"],
            ].map(([color, colorHex, code]) => ({ sku: `HZ-SR-${code}-${size}`, color, colorHex, size, stock: 10 })),
          ),
        },
      },
    });
  }
  console.log("• Catalogue seeded");
}

try {
  await seedStore();
  await seedCatalogue();
  await seedAdmin();
  console.log("✔ Seed complete");
} catch (err) {
  console.error(err);
  process.exitCode = 1;
} finally {
  await db.$disconnect();
}
