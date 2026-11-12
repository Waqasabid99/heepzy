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
      announcementText: "Flash Drop — up to 25% off selected styles. Free delivery over Rs 5,000",
      announcementLink: "/offers",
      freeDeliveryEnabled: true,
      freeDeliveryThreshold: "5000.00",
      returnWindowDays: 7,
    },
  });

  // Fill the announcement for stores seeded before the field existed.
  await db.storeSettings.updateMany({
    where: { id: 1, announcementText: null },
    data: {
      announcementText: "Flash Drop — up to 25% off selected styles. Free delivery over Rs 5,000",
      announcementLink: "/offers",
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

const CATEGORIES = [
  ["Sneakers", "sneakers", "/images/categories/sneakers.jpg"],
  ["Formal", "formal", "/images/categories/formal.jpg"],
  ["Heels & Pumps", "heels", "/images/categories/women.jpg"],
  ["Boots", "boots", "/images/lifestyle/ankle-boots.jpg"],
  ["Canvas", "canvas", "/images/products/heritage-canvas.jpg"],
];

const SIZE_CHARTS = {
  men: {
    name: "Men's shoes",
    rows: [
      ["39", "6", "7", "24.5"],
      ["40", "6.5", "7.5", "25.0"],
      ["41", "7.5", "8.5", "25.8"],
      ["42", "8", "9", "26.5"],
      ["43", "9", "10", "27.3"],
      ["44", "9.5", "10.5", "28.0"],
      ["45", "10.5", "11.5", "28.8"],
    ],
  },
  women: {
    name: "Women's shoes",
    rows: [
      ["36", "3.5", "5.5", "22.8"],
      ["37", "4", "6.5", "23.5"],
      ["38", "5", "7.5", "24.1"],
      ["39", "6", "8.5", "24.8"],
      ["40", "6.5", "9", "25.4"],
      ["41", "7.5", "10", "26.0"],
    ],
  },
};

// [slug, name, gender, category, price, compareAt, colour, hex, chart, material, featured, short]
const PRODUCTS = [
  [
    "court-classic",
    "Court Classic",
    "UNISEX",
    "sneakers",
    7499,
    null,
    "Chalk / Sand",
    "#EEE9DF",
    "men",
    "Leather / rubber",
    true,
    "A clean leather court sneaker with a cushioned cupsole.",
  ],
  [
    "street-runner",
    "Street Runner",
    "MEN",
    "sneakers",
    6999,
    null,
    "Onyx",
    "#1A1A1A",
    "men",
    "Engineered knit / EVA",
    true,
    "Featherlight knit runner built for long city days.",
  ],
  [
    "omni-9",
    "Omni 9",
    "UNISEX",
    "sneakers",
    11499,
    null,
    "Teal / Sunset",
    "#2F5D62",
    "men",
    "Mesh / suede / TPU",
    true,
    "Chunky, sculpted and ridiculously comfortable — the Omni 9 drop.",
  ],
  [
    "drift-flex-360",
    "Drift Flex 360",
    "MEN",
    "sneakers",
    8299,
    10999,
    "White / Flame",
    "#F4F2EC",
    "men",
    "Mesh / foam",
    true,
    "Responsive foam and a breathable upper for daily runs.",
  ],
  [
    "glide-blush",
    "Glide Blush",
    "WOMEN",
    "sneakers",
    8999,
    null,
    "Blush",
    "#E9C9C0",
    "women",
    "Mesh / suede",
    true,
    "Retro-runner lines in a soft blush colourway.",
  ],
  [
    "volt-trainer",
    "Volt Trainer",
    "MEN",
    "sneakers",
    9499,
    11999,
    "Volt",
    "#CDEB3B",
    "men",
    "Synthetic / rubber",
    false,
    "Grippy, stable trainer for the gym and the court.",
  ],
  [
    "marlow-derby",
    "Marlow Derby",
    "MEN",
    "formal",
    12499,
    null,
    "Cognac",
    "#8B4A23",
    "men",
    "Full-grain leather",
    true,
    "Hand-finished derby in burnished cognac leather.",
  ],
  [
    "ravi-double-monk",
    "Ravi Double Monk",
    "MEN",
    "formal",
    13999,
    null,
    "Chestnut",
    "#5A3A22",
    "men",
    "Calf leather",
    false,
    "A sharp double-monk strap for weddings and boardrooms.",
  ],
  [
    "heritage-oxford",
    "Heritage Oxford",
    "MEN",
    "formal",
    11999,
    14999,
    "Tan",
    "#9A5B2E",
    "men",
    "Polished calf",
    false,
    "The classic oxford, cut from polished calf leather.",
  ],
  [
    "saba-pump",
    "Saba Pump",
    "WOMEN",
    "heels",
    7299,
    null,
    "Midnight",
    "#1F2A44",
    "women",
    "Suede",
    true,
    "A refined almond-toe pump on a slim 85mm heel.",
  ],
  [
    "noor-stiletto",
    "Noor Stiletto",
    "WOMEN",
    "heels",
    7999,
    null,
    "Noir",
    "#111111",
    "women",
    "Patent leather",
    false,
    "Pointed patent stiletto for evenings that matter.",
  ],
  [
    "kohsar-ankle-boot",
    "Kohsar Ankle Boot",
    "WOMEN",
    "boots",
    10499,
    null,
    "Caramel",
    "#A0622D",
    "women",
    "Leather",
    false,
    "Block-heel ankle boot in soft caramel leather.",
  ],
  [
    "karakoram-work-boot",
    "Karakoram Work Boot",
    "MEN",
    "boots",
    13499,
    null,
    "Wheat",
    "#B07A3C",
    "men",
    "Nubuck / rubber lug",
    false,
    "Rugged lace-up boot with a lugged rubber sole.",
  ],
  [
    "retro-hi-canvas",
    "Retro Hi Canvas",
    "UNISEX",
    "canvas",
    4999,
    6499,
    "Cherry",
    "#B3261E",
    "men",
    "Cotton canvas",
    false,
    "The high-top canvas classic in bold cherry red.",
  ],
  [
    "heritage-canvas",
    "Heritage Canvas",
    "UNISEX",
    "canvas",
    4499,
    null,
    "Natural",
    "#E4D9BF",
    "men",
    "Cotton canvas",
    false,
    "Lived-in canvas sneakers for everyday wear.",
  ],
  [
    "pastel-court",
    "Pastel Court",
    "WOMEN",
    "sneakers",
    8499,
    null,
    "Pastel",
    "#D9D3F0",
    "women",
    "Leather / rubber",
    false,
    "Layered pastel panels on a platform court sole.",
  ],
];

// Product slug → photo filename in public/images/products where they differ.
const IMAGE_FILE = {
  "drift-flex-360": "drift-flex",
  "ravi-double-monk": "ravi-monk",
  "karakoram-work-boot": "karakoram-boot",
};

async function seedCatalogue() {
  for (const [i, [name, slug, imageUrl]] of CATEGORIES.entries()) {
    await db.category.upsert({
      where: { slug },
      update: { name, imageUrl, sortOrder: i },
      create: { name, slug, imageUrl, sortOrder: i },
    });
  }
  // Remove categories from the first scaffold that no longer exist.
  await db.category.deleteMany({ where: { slug: { in: ["sandals", "sports"] }, products: { none: {} } } });

  const brand = await db.brand.upsert({
    where: { slug: "heepzy" },
    update: {},
    create: { name: "Heepzy", slug: "heepzy" },
  });

  const charts = {};
  for (const [key, def] of Object.entries(SIZE_CHARTS)) {
    let chart = await db.sizeChart.findFirst({ where: { name: def.name } });
    if (!chart) {
      chart = await db.sizeChart.create({
        data: {
          name: def.name,
          description:
            "Stand on a sheet of paper, mark your heel and longest toe, and measure. Pick the closest foot length.",
          entries: {
            create: def.rows.map(([eu, uk, us, cm], i) => ({ label: eu, eu, uk, us, footLengthCm: cm, sortOrder: i })),
          },
        },
      });
    }
    charts[key] = chart;
  }

  await db.product.deleteMany({ where: { slug: "heepzy-street-runner" } });

  for (const [idx, p] of PRODUCTS.entries()) {
    const [slug, name, gender, category, price, compareAt, color, hex, chartKey, material, featured, short] = p;
    if (await db.product.findUnique({ where: { slug } })) continue;
    const code = slug
      .split("-")
      .map((w) => w[0])
      .join("")
      .toUpperCase()
      .slice(0, 4);
    const sizes = SIZE_CHARTS[chartKey].rows.map((r) => r[0]);
    await db.product.create({
      data: {
        name,
        slug,
        gender,
        status: "ACTIVE",
        isFeatured: featured,
        basePrice: price.toFixed(2),
        compareAtPrice: compareAt ? compareAt.toFixed(2) : null,
        material,
        shortDescription: short,
        description: `${short} Finished with a cushioned insole and a durable outsole, built to handle everyday wear across the city.`,
        metaTitle: `${name} — ${color}`,
        // Stagger createdAt so "Newest" sorting is meaningful.
        createdAt: new Date(Date.now() - idx * 36e5 * 18),
        brand: { connect: { id: brand.id } },
        sizeChart: { connect: { id: charts[chartKey].id } },
        categories: { connect: [{ slug: category }] },
        images: {
          create: [
            {
              url: `/images/products/${IMAGE_FILE[slug] ?? slug}.jpg`,
              alt: `${name} in ${color}`,
              color,
              sortOrder: 0,
            },
          ],
        },
        variants: {
          create: sizes.map((size, i) => ({
            sku: `HZ-${code}-${size}`,
            color,
            colorHex: hex,
            size,
            // Deterministic demo stock: a few sizes low or sold out.
            stock: (idx + i) % 7 === 0 ? 0 : (idx + i) % 5 === 0 ? 2 : 8 + ((idx * 3 + i) % 9),
          })),
        },
      },
    });
  }

  // Second view per product (close-up crop of the same photo) for the card hover swap.
  // Idempotent: only added when the product has a single image.
  for (const [slug, name, , , , , color] of PRODUCTS) {
    const product = await db.product.findUnique({
      where: { slug },
      select: { id: true, _count: { select: { images: true } } },
    });
    if (!product || product._count.images > 1) continue;
    await db.productImage.create({
      data: {
        productId: product.id,
        url: `/images/products/${IMAGE_FILE[slug] ?? slug}-detail.jpg`,
        alt: `${name} in ${color}, close-up detail`,
        color,
        sortOrder: 1,
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
