import { buildSale, cancelSale, formatSaleNumber } from '../domain/sales';
import {
  PAYMENT_METHODS,
  type ActivityEntry,
  type Customer,
  type Database,
  type Product,
  type ProductCategory,
  type Sale,
} from '../domain/types';

const RANDOM_SEED = 20261104;
const SALE_COUNT = 350;
const CANCEL_EVERY = 33;
const RECENT_SALE_MINUTES_AGO = [15, 10, 5];
const ACTIVITY_COUNT = 8;
const TAX_PERCENT = 21;
const DISCOUNT_OPTIONS = [0, 0, 0, 0, 5, 10, 15];
const MAX_ITEMS_PER_SALE = 4;
const MAX_QUANTITY_PER_ITEM = 5;

const MINUTE_MS = 60_000;
const HOUR_MS = 60 * MINUTE_MS;
const DAY_MS = 24 * HOUR_MS;
const YEAR_MS = 365 * DAY_MS;

const CUSTOMERS: readonly (readonly [name: string, company: string])[] = [
  ['Ana Gómez', 'Aurora Demo'],
  ['Bruno Ferreyra', 'Cumbre Demo'],
  ['Carla Medina', ''],
  ['Diego Paredes', 'Delta Demo'],
  ['Elena Rossi', 'Estudio Demo'],
  ['Federico Luna', ''],
  ['Gabriela Ortiz', 'Faro Demo'],
  ['Hernán Castro', 'Glaciar Demo'],
  ['Inés Molina', ''],
  ['Joaquín Ríos', 'Horizonte Demo'],
  ['Karina Sosa', 'Índigo Demo'],
  ['Lucas Benítez', ''],
  ['Micaela Vega', 'Junco Demo'],
  ['Nicolás Acosta', 'Kilómetro Demo'],
  ['Olivia Herrera', ''],
  ['Pablo Domínguez', 'Lago Demo'],
  ['Romina Silva', 'Meridiano Demo'],
  ['Santiago Núñez', ''],
  ['Tamara Ibarra', 'Norte Demo'],
  ['Ulises Campos', 'Oasis Demo'],
  ['Valeria Peralta', ''],
  ['Walter Ledesma', 'Prisma Demo'],
  ['Ximena Quiroga', 'Quebrada Demo'],
  ['Yamil Aguirre', 'Ruta Demo'],
];

const PRODUCTS: readonly (readonly [
  name: string,
  sku: string,
  category: ProductCategory,
  pricePesos: number,
  stock: number,
])[] = [
  ['Notebook 14 pulgadas 16 GB', 'NB14-16', 'Computación', 1_250_000, 12],
  ['Notebook 15 pulgadas 32 GB', 'NB15-32', 'Computación', 1_890_000, 4],
  ['Notebook ultraliviana 13 pulgadas', 'NB13-UL', 'Computación', 1_480_000, 7],
  ['PC de escritorio compacta', 'PC-MINI', 'Computación', 980_000, 9],
  ['PC de escritorio para diseño', 'PC-DIS', 'Computación', 2_450_000, 2],
  ['Tablet 11 pulgadas', 'TB-11', 'Computación', 620_000, 15],
  ['Servidor de oficina', 'SRV-OF', 'Computación', 2_500_000, 0],
  ['Monitor 24 pulgadas Full HD', 'MON-24', 'Periféricos', 245_000, 22],
  ['Monitor 27 pulgadas QHD', 'MON-27', 'Periféricos', 410_000, 14],
  ['Monitor ultrawide 34 pulgadas', 'MON-34', 'Periféricos', 720_000, 3],
  ['Teclado mecánico', 'TEC-MEC', 'Periféricos', 89_000, 31],
  ['Teclado inalámbrico', 'TEC-INA', 'Periféricos', 42_000, 40],
  ['Mouse ergonómico', 'MOU-ERG', 'Periféricos', 38_000, 45],
  ['Cámara web 1080p', 'CAM-1080', 'Periféricos', 56_000, 5],
  ['Auriculares con micrófono', 'AUR-MIC', 'Periféricos', 72_000, 26],
  ['Router Wi-Fi 6', 'ROU-WF6', 'Redes', 115_000, 18],
  ['Switch de 8 puertos', 'SW-08', 'Redes', 48_000, 24],
  ['Switch de 24 puertos', 'SW-24', 'Redes', 265_000, 6],
  ['Punto de acceso para techo', 'AP-TCH', 'Redes', 139_000, 1],
  ['Bobina de cable UTP Cat 6', 'UTP-305', 'Redes', 185_000, 11],
  ['Placa de red USB', 'NIC-USB', 'Redes', 19_500, 37],
  ['SSD interno 1 TB', 'SSD-1T', 'Almacenamiento', 98_000, 33],
  ['SSD externo 2 TB', 'SSD-EXT', 'Almacenamiento', 215_000, 13],
  ['Disco rígido 4 TB', 'HDD-4T', 'Almacenamiento', 158_000, 17],
  ['NAS de 2 bahías', 'NAS-2B', 'Almacenamiento', 540_000, 0],
  ['Memoria USB 128 GB', 'USB-128', 'Almacenamiento', 16_500, 60],
  ['Tarjeta microSD 256 GB', 'SD-256', 'Almacenamiento', 24_000, 28],
  ['Base refrigerante para notebook', 'ACC-BASE', 'Accesorios', 27_500, 19],
  ['Soporte para monitor', 'ACC-SOP', 'Accesorios', 34_000, 23],
  ['Hub USB-C de 7 puertos', 'ACC-HUB', 'Accesorios', 46_000, 4],
  ['Mochila para notebook', 'ACC-MOCH', 'Accesorios', 52_000, 16],
  ['Funda para tablet', 'ACC-FUND', 'Accesorios', 8_000, 35],
];

type Random = () => number;

/** Generador mulberry32: con la misma semilla, siempre da la misma secuencia. */
function createRandom(seed: number): Random {
  let state = seed;
  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let mixed = Math.imul(state ^ (state >>> 15), 1 | state);
    mixed = (mixed + Math.imul(mixed ^ (mixed >>> 7), 61 | mixed)) ^ mixed;
    return ((mixed ^ (mixed >>> 14)) >>> 0) / 4294967296;
  };
}

function pick<T>(items: readonly T[], random: Random): T {
  const item = items[Math.floor(random() * items.length)];
  if (item === undefined) throw new Error('No se puede elegir de una lista vacía');
  return item;
}

function pickDistinct<T>(items: readonly T[], count: number, random: Random): readonly T[] {
  const remaining = [...items];
  return Array.from({ length: count }, () => {
    const item = pick(remaining, random);
    remaining.splice(remaining.indexOf(item), 1);
    return item;
  });
}

function randomInteger(min: number, max: number, random: Random): number {
  return min + Math.floor(random() * (max - min + 1));
}

function toEmail(name: string): string {
  const plain = name
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase();
  return `${plain.replace(' ', '.')}@example.com`;
}

function createCustomers(now: Date): readonly Customer[] {
  return CUSTOMERS.map(([name, company], index) => {
    const position = String(index + 1).padStart(2, '0');
    const createdAt = new Date(now.getTime() - (400 - index * 5) * DAY_MS).toISOString();

    return {
      id: `customer-0${position}`,
      name,
      email: toEmail(name),
      phone: `+54 11 5555-01${position}`,
      company,
      createdAt,
      updatedAt: createdAt,
    };
  });
}

function createProducts(now: Date): readonly Product[] {
  const createdAt = new Date(now.getTime() - 400 * DAY_MS).toISOString();

  return PRODUCTS.map(([name, sku, category, pricePesos, stock], index) => ({
    id: `product-${String(index + 1).padStart(3, '0')}`,
    name,
    sku,
    category,
    priceCents: pricePesos * 100,
    stock,
    createdAt,
    updatedAt: createdAt,
  }));
}

/**
 * Las ventas más recientes son de hace minutos, sin caer antes del inicio del mes:
 * así el Dashboard tiene datos aunque la demo se abra apenas empieza el día 1.
 */
function recentSaleTimes(now: Date): readonly number[] {
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
  return RECENT_SALE_MINUTES_AGO.map((minutes) =>
    Math.max(monthStart, now.getTime() - minutes * MINUTE_MS),
  );
}

/** Devuelve las fechas de todas las ventas, de la más vieja a la más nueva. */
function createSaleTimes(now: Date, random: Random): readonly number[] {
  const recent = recentSaleTimes(now);
  const newestOlderSale = (recent[0] ?? now.getTime()) - MINUTE_MS;

  // Esta curva da algo más de ventas cerca de hoy, sin amontonarlas en los últimos días:
  // así la comparación con el mes anterior del Dashboard resulta creíble.
  const older = Array.from(
    { length: SALE_COUNT - recent.length },
    () => newestOlderSale - (1 - Math.pow(random(), 0.8)) * YEAR_MS,
  ).sort((a, b) => a - b);

  return [...older, ...recent];
}

function createSales(
  customers: readonly Customer[],
  products: readonly Product[],
  now: Date,
  random: Random,
): readonly Sale[] {
  const times = createSaleTimes(now, random);
  const lastCancellableNumber = SALE_COUNT - RECENT_SALE_MINUTES_AGO.length;

  const sales = times.map((time, index) => {
    const number = index + 1;
    const itemCount = randomInteger(1, MAX_ITEMS_PER_SALE, random);
    const sale = buildSale(
      {
        customer: pick(customers, random),
        lines: pickDistinct(products, itemCount, random).map((product) => ({
          product,
          quantity: randomInteger(1, MAX_QUANTITY_PER_ITEM, random),
        })),
        discountPercent: pick(DISCOUNT_OPTIONS, random),
        paymentMethod: pick(PAYMENT_METHODS, random),
      },
      {
        id: `sale-${String(number).padStart(4, '0')}`,
        number,
        taxPercent: TAX_PERCENT,
        now: new Date(time),
      },
    );

    if (number % CANCEL_EVERY !== 0 || number > lastCancellableNumber) return sale;

    const cancelledAt = new Date(Math.min(time + HOUR_MS, now.getTime()));
    const cancelled = cancelSale(sale, cancelledAt);
    return cancelled.ok ? cancelled.value : sale;
  });

  return sales.reverse();
}

function createActivity(sales: readonly Sale[]): readonly ActivityEntry[] {
  return sales.slice(0, ACTIVITY_COUNT).map((sale, index) => ({
    id: `activity-${String(index + 1).padStart(3, '0')}`,
    type: 'sale',
    message: `Venta ${formatSaleNumber(sale.number)} registrada`,
    createdAt: sale.createdAt,
  }));
}

/** Genera datos ficticios reproducibles, con fechas relativas a `now`. */
export function createSeedDatabase(now: Date): Database {
  const random = createRandom(RANDOM_SEED);
  const customers = createCustomers(now);
  const products = createProducts(now);
  const sales = createSales(customers, products, now, random);

  return {
    version: 1,
    customers,
    products,
    sales,
    activity: createActivity(sales),
    settings: {
      profile: {
        displayName: 'Usuario Demo',
        email: 'demo@example.com',
        role: 'Administrador',
      },
      preferences: {
        currency: 'ARS',
        taxPercent: TAX_PERCENT,
        lowStockThreshold: 5,
        tableDensity: 'comfortable',
        accent: 'violet',
      },
    },
    nextSaleNumber: SALE_COUNT + 1,
  };
}
