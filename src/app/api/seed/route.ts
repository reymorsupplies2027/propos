import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import bcrypt from 'bcryptjs';

function daysAgo(n: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - n);
  d.setHours(Math.floor(Math.random() * 14) + 7, Math.floor(Math.random() * 60), Math.floor(Math.random() * 60));
  return d;
}

function randomItem<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

export async function POST() {
  try {
    // ── Platform Owner ──────────────────────────────────────────────────────
    const ownerPasswordHash = await bcrypt.hash('admin123', 10);

    const existingOwner = await db.platformOwner.findUnique({
      where: { email: 'admin@propos.tt' },
    });

    const owner = existingOwner || await db.platformOwner.create({
      data: {
        email: 'admin@propos.tt',
        name: 'Propos Admin',
        passwordHash: ownerPasswordHash,
      },
    });

    // ── Plans ───────────────────────────────────────────────────────────────
    const planData = [
      {
        name: 'Starter',
        slug: 'starter',
        price: 0,
        currency: 'TTD',
        interval: 'monthly',
        maxProperties: 5,
        maxClients: 20,
        features: JSON.stringify([
          'Up to 5 properties',
          'Up to 20 clients',
          'Basic agent profile',
          'Inquiry form',
        ]),
        isActive: true,
      },
      {
        name: 'Professional',
        slug: 'professional',
        price: 299,
        currency: 'TTD',
        interval: 'monthly',
        maxProperties: 25,
        maxClients: 100,
        features: JSON.stringify([
          'Up to 25 properties',
          'Up to 100 clients',
          'Custom agent profile',
          'Deal management',
          'Visitor analytics',
          'Tax management',
          'Custom domain',
        ]),
        isActive: true,
      },
      {
        name: 'Premium',
        slug: 'premium',
        price: 599,
        currency: 'TTD',
        interval: 'monthly',
        maxProperties: -1,
        maxClients: -1,
        features: JSON.stringify([
          'Unlimited properties',
          'Unlimited clients',
          'Premium agent profile',
          'Advanced deal management',
          'Advanced visitor analytics',
          'Full tax management',
          'Custom domain',
          'Priority support',
          'Virtual tours',
          'Social media integration',
        ]),
        isActive: true,
      },
    ];

    const plans: Array<{ id: string; slug: string }> = [];
    for (const p of planData) {
      const plan = await db.plan.upsert({
        where: { slug: p.slug },
        update: p,
        create: p,
      });
      plans.push(plan);
    }

    const professionalPlan = plans.find((p) => p.slug === 'professional')!;

    // ── Laura Homes TT — Agent ──────────────────────────────────────────────
    const agentPasswordHash = await bcrypt.hash('laura123', 10);

    let lauraUser = await db.platformUser.findUnique({
      where: { email: 'laura@laurahomes.tt' },
    });

    if (!lauraUser) {
      lauraUser = await db.platformUser.create({
        data: {
          email: 'laura@laurahomes.tt',
          name: 'Laura',
          passwordHash: agentPasswordHash,
          role: 'agent',
          agent: {
            create: {
              slug: 'laura-homes-tt',
              businessName: 'Laura Homes TT',
              displayName: 'Laura Homes TT',
              phone: '+1868-123-4567',
              email: 'laura@laurahomes.tt',
              city: 'Arima',
              country: 'TT',
              primaryColor: '#1B4332',
              accentColor: '#D4A373',
              tagline: 'Your Home, Our Mission',
              bio: 'Premier real estate agency serving Arima and Trinidad & Tobago. Specializing in residential and commercial properties with personalized service.',
              facebook: 'https://www.facebook.com/laurahomestt',
              instagram: 'https://www.instagram.com/laurahomestt',
              whatsapp: '+18681234567',
              commissionRate: 5.0,
              status: 'active',
            },
          },
        },
        include: { agent: true },
      });
    }

    if (!lauraUser) {
      return NextResponse.json({ error: 'Failed to create agent user' }, { status: 500 });
    }

    const lauraAgent = await db.agent.findUnique({
      where: { userId: lauraUser.id },
    });

    if (!lauraAgent) {
      return NextResponse.json({ error: 'Failed to create agent profile' }, { status: 500 });
    }

    // ── Properties (6 varied types) ──────────────────────────────────────────
    const propertiesData = [
      {
        agentId: lauraAgent.id,
        title: 'Modern Apartment in Arima Heights',
        slug: 'modern-apartment-arima-heights',
        description: 'Beautiful 2-bedroom apartment with modern finishes, open-plan kitchen and balcony overlooking the Northern Range. Covered parking included.',
        propertyType: 'apartment',
        listingType: 'sale',
        status: 'available',
        price: 650000,
        currency: 'TTD',
        bedrooms: 2,
        bathrooms: 1,
        areaSqm: 85,
        yearBuilt: 2022,
        address: "12 O'Meara Road",
        city: 'Arima',
        neighborhood: 'Arima Heights',
        country: 'TT',
        features: JSON.stringify(['Air conditioning', 'Open-plan kitchen', 'Balcony', 'Parking', 'Hot water', 'Aluminium windows']),
        images: JSON.stringify([]),
        isFeatured: true,
        publishedAt: daysAgo(3),
      },
      {
        agentId: lauraAgent.id,
        title: 'Family Home in Santa Rosa',
        slug: 'family-home-santa-rosa',
        description: 'Spacious 4-bedroom family home in a quiet Santa Rosa community. Large garden, two-car garage, and close to schools and shops.',
        propertyType: 'house',
        listingType: 'sale',
        status: 'available',
        price: 1850000,
        currency: 'TTD',
        bedrooms: 4,
        bathrooms: 3,
        areaSqm: 220,
        lotSizeSqm: 600,
        yearBuilt: 2018,
        address: '45 Santa Rosa Old Road',
        city: 'Arima',
        neighborhood: 'Santa Rosa',
        country: 'TT',
        features: JSON.stringify(['Air conditioning', 'Garage', 'Garden', 'Swimming pool', '24-hour security', 'Equipped kitchen', 'Laundry area']),
        images: JSON.stringify([]),
        isFeatured: true,
        publishedAt: daysAgo(7),
      },
      {
        agentId: lauraAgent.id,
        title: 'Townhouse in Malabar Gardens',
        slug: 'townhouse-malabar-gardens',
        description: 'Elegant 3-level townhouse with contemporary design. Designer kitchen, master bathroom with jacuzzi, and a rooftop terrace with panoramic views.',
        propertyType: 'townhouse',
        listingType: 'sale',
        status: 'pending',
        price: 1200000,
        currency: 'TTD',
        bedrooms: 3,
        bathrooms: 2,
        areaSqm: 160,
        lotSizeSqm: 150,
        yearBuilt: 2023,
        address: '8 Malabar Gardens',
        city: 'Arima',
        neighborhood: 'Malabar',
        country: 'TT',
        features: JSON.stringify(['Air conditioning', 'Jacuzzi', 'Terrace', 'Designer kitchen', 'Built-in wardrobes', 'Alarm system']),
        images: JSON.stringify([]),
        isFeatured: false,
        publishedAt: daysAgo(10),
      },
      {
        agentId: lauraAgent.id,
        title: 'Commercial Space in Downtown Arima',
        slug: 'commercial-space-downtown-arima',
        description: 'Ideal commercial space for an office or shop in the heart of Arima. High visibility and foot traffic. Includes a bathroom and small kitchen.',
        propertyType: 'commercial',
        listingType: 'rent',
        status: 'rented',
        price: 5500,
        currency: 'TTD',
        areaSqm: 120,
        yearBuilt: 2015,
        address: '23 Broadway',
        city: 'Arima',
        neighborhood: 'Centro',
        country: 'TT',
        features: JSON.stringify(['Air conditioning', 'Private bathroom', 'Small kitchen', 'Customer parking', 'Alarm system', 'Wheelchair access']),
        images: JSON.stringify([]),
        isFeatured: false,
        publishedAt: daysAgo(20),
      },
      {
        agentId: lauraAgent.id,
        title: 'Land on Tumpuna Road',
        slug: 'land-tumpuna-road',
        description: 'Flat 800 sqm plot ideal for residential construction. All utilities available: water, electricity and drainage. Located in a developing residential area.',
        propertyType: 'land',
        listingType: 'sale',
        status: 'available',
        price: 450000,
        currency: 'TTD',
        lotSizeSqm: 800,
        address: 'Tumpuna Road, Lot 47',
        city: 'Arima',
        neighborhood: 'Tumpuna',
        country: 'TT',
        features: JSON.stringify(['Flat terrain', 'Utilities available', 'Titled', 'Residential zone', 'Paved access']),
        images: JSON.stringify([]),
        isFeatured: false,
        publishedAt: daysAgo(15),
      },
      {
        agentId: lauraAgent.id,
        title: 'Luxury Villa on Hollis Reservoir Road',
        slug: 'luxury-villa-hollis-reservoir',
        description: 'Stunning luxury villa with 5 bedrooms, infinity pool and spectacular views of the Hollis Reservoir. Premium finishes, smart home technology and unique architectural design.',
        propertyType: 'villa',
        listingType: 'sale',
        status: 'sold',
        price: 4200000,
        currency: 'TTD',
        bedrooms: 5,
        bathrooms: 4,
        areaSqm: 380,
        lotSizeSqm: 1200,
        yearBuilt: 2021,
        address: '1 Hollis Reservoir Road',
        city: 'Arima',
        neighborhood: 'Hollis Reservoir',
        country: 'TT',
        features: JSON.stringify(['Infinity pool', 'Smart home', 'Gourmet kitchen', 'Wine cellar', 'Home cinema', 'Gym', 'Landscaped garden', '24-hour security', 'Generator', 'Central air conditioning']),
        images: JSON.stringify([]),
        isFeatured: false,
        publishedAt: daysAgo(25),
      },
    ];

    const properties: Array<{ id: string; slug: string; title: string; status: string; price: number | null }> = [];
    for (const p of propertiesData) {
      const existing = await db.property.findUnique({
        where: { agentId_slug: { agentId: p.agentId, slug: p.slug } },
      });
      const prop = existing || await db.property.create({ data: p });
      properties.push(prop);
    }

    const apartmentProp = properties[0]!;
    const villaProp = properties[5]!;

    // ── Clients (4) ─────────────────────────────────────────────────────────
    const clientsData = [
      {
        agentId: lauraAgent.id,
        firstName: 'Miguel',
        lastName: 'García',
        email: 'miguel.garcia@email.com',
        phone: '+1868-555-0101',
        source: 'website',
        budgetMin: 500000,
        budgetMax: 800000,
        preferredType: 'apartment',
        preferredCity: 'Arima',
        status: 'active',
        lastContactAt: daysAgo(2),
      },
      {
        agentId: lauraAgent.id,
        firstName: 'Anita',
        lastName: 'Ramlal',
        email: 'anita.ramlal@email.com',
        phone: '+1868-555-0102',
        source: 'referral',
        budgetMin: 1500000,
        budgetMax: 2500000,
        preferredType: 'house',
        preferredCity: 'Arima',
        notes: 'Looking for a family home near good schools',
        status: 'active',
        lastContactAt: daysAgo(5),
      },
      {
        agentId: lauraAgent.id,
        firstName: 'Rajesh',
        lastName: 'Maharaj',
        email: 'rajesh.maharaj@email.com',
        phone: '+1868-555-0103',
        source: 'facebook',
        budgetMin: 300000,
        budgetMax: 600000,
        preferredType: 'land',
        preferredCity: 'Arima',
        status: 'active',
        lastContactAt: daysAgo(8),
      },
      {
        agentId: lauraAgent.id,
        firstName: 'Patricia',
        lastName: 'Joseph',
        email: 'patricia.joseph@email.com',
        phone: '+1868-555-0104',
        source: 'instagram',
        budgetMin: 1000000,
        budgetMax: 5000000,
        preferredType: 'villa',
        preferredCity: 'Arima',
        notes: 'Interested in luxury properties with a pool',
        status: 'inactive',
        lastContactAt: daysAgo(18),
      },
    ];

    const clients: Array<{ id: string }> = [];
    for (const c of clientsData) {
      const client = await db.client.create({ data: c });
      clients.push(client);
    }

    const miguelClient = clients[0];

    // ── Deals (2) ───────────────────────────────────────────────────────────
    const dealsData = [
      {
        agentId: lauraAgent.id,
        propertyId: villaProp.id,
        clientId: clients[3].id,
        dealType: 'sale',
        status: 'closed',
        totalPrice: villaProp.price ?? 0,
        currency: 'TTD',
        commission: (villaProp.price ?? 0) * 0.05,
        commissionRate: 5.0,
        closeDate: daysAgo(5),
        notes: 'Successful sale of the luxury villa. Deal completed with all inspections approved.',
      },
      {
        agentId: lauraAgent.id,
        propertyId: apartmentProp.id,
        clientId: miguelClient.id,
        dealType: 'sale',
        status: 'pending',
        totalPrice: apartmentProp.price ?? 0,
        currency: 'TTD',
        commission: (apartmentProp.price ?? 0) * 0.05,
        commissionRate: 5.0,
        notes: 'Client is processing mortgage approval. Awaiting confirmation.',
      },
    ];

    const deals: Array<{ id: string }> = [];
    for (const d of dealsData) {
      const deal = await db.deal.create({ data: d });
      deals.push(deal);
    }

    // ── Tax Obligations (3) ──────────────────────────────────────────────────
    const now = new Date();
    const taxData = [
      {
        agentId: lauraAgent.id,
        taxType: 'BIR',
        description: 'Income Tax - Monthly filing',
        period: `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`,
        dueDate: new Date(now.getFullYear(), now.getMonth() + 1, 30),
        amount: 4500,
        currency: 'TTD',
        status: 'pending',
        notes: 'Monthly BIR filing based on the month\'s commissions.',
      },
      {
        agentId: lauraAgent.id,
        taxType: 'Property Tax',
        description: 'Property Tax - Annual payment',
        period: String(now.getFullYear()),
        dueDate: new Date(now.getFullYear(), 8, 31),
        amount: 12000,
        currency: 'TTD',
        status: 'pending',
        notes: 'Annual tax on properties managed by the agency.',
      },
      {
        agentId: lauraAgent.id,
        taxType: 'NIS',
        description: 'National Insurance - Quarterly contribution',
        period: `Q${Math.ceil((now.getMonth() + 1) / 3)}-${now.getFullYear()}`,
        dueDate: new Date(now.getFullYear(), now.getMonth() + 1, 15),
        amount: 3200,
        currency: 'TTD',
        status: 'pending',
        notes: 'Quarterly National Insurance contribution for employees.',
      },
    ];

    const taxes: Array<{ id: string }> = [];
    for (const t of taxData) {
      const tax = await db.taxObligation.create({ data: t });
      taxes.push(tax);
    }

    // ── Visitor Events (~50) ─────────────────────────────────────────────────
    const eventTypes = ['page_view', 'click', 'property_view', 'scroll', 'inquiry'];
    const pages = ['/', '/properties', '/about-us', '/contact', '/properties/modern-apartment-arima-heights', '/properties/family-home-santa-rosa', '/properties/townhouse-malabar-gardens', '/properties/commercial-space-downtown-arima', '/properties/land-tumpuna-road', '/properties/luxury-villa-hollis-reservoir'];
    const referrers = ['https://www.google.com', 'https://www.facebook.com', 'https://www.instagram.com', 'https://m.search.yahoo.com', null];
    const userAgents = ['Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/126.0', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 14_5) Safari/17.5', 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5) Mobile/15E148', 'Mozilla/5.0 (Linux; Android 14) Chrome/126.0 Mobile', 'Mozilla/5.0 (iPad; CPU OS 17_5) AppleWebKit/605.1.15'];
    const eventElements = ['#hero-section', '.property-card', '#contact-form', '.nav-properties', '#cta-button', null];
    const eventTexts = ['View Details', 'Contact', 'Properties', 'About Us', null];
    const countries = ['TT', 'TT', 'TT', 'US', 'CA', 'GB'];
    const cities = ['Port of Spain', 'San Fernando', 'Arima', 'Chaguanas', 'New York', 'Toronto', 'London'];

    const visitorEvents: Array<{ agentId: string; eventType: string; sessionId: string; page: string | null; elementId: string | null; elementText: string | null; propertySlug: string | null; referrer: string | null; userAgent: string | null; ip: string; country: string; city: string; dwellTimeMs: number | null; metadata: string; createdAt: Date }> = [];

    const sessionIdPrefixes = ['sess_abc', 'sess_def', 'sess_ghi', 'sess_jkl', 'sess_mno', 'sess_pqr', 'sess_stu', 'sess_vwx'];

    for (let i = 0; i < 50; i++) {
      const eventType = randomItem(eventTypes);
      const page = randomItem(pages);
      let propertySlug: string | null = null;
      if (page.startsWith('/properties/') && page !== '/properties') {
        propertySlug = page.replace('/properties/', '');
      }

      const sessionIdx = Math.floor(Math.random() * sessionIdPrefixes.length);
      const sessionId = `${sessionIdPrefixes[sessionIdx]}_${Math.floor(i / 6)}`;
      const country = randomItem(countries);

      visitorEvents.push({
        agentId: lauraAgent.id,
        eventType,
        sessionId,
        page,
        elementId: eventType === 'click' ? randomItem(eventElements) : null,
        elementText: eventType === 'click' ? randomItem(eventTexts) : null,
        propertySlug,
        referrer: randomItem(referrers),
        userAgent: randomItem(userAgents),
        ip: `192.168.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`,
        country,
        city: randomItem(cities),
        dwellTimeMs: eventType === 'page_view' || eventType === 'scroll' ? Math.floor(Math.random() * 30000) + 2000 : null,
        metadata: JSON.stringify({}),
        createdAt: daysAgo(Math.floor(Math.random() * 30)),
      });
    }

    for (const evt of visitorEvents) {
      await db.visitorEvent.create({ data: evt });
    }

    // ── Subscription (Laura on Professional) ─────────────────────────────────
    const existingSub = await db.subscription.findFirst({
      where: { agentId: lauraAgent.id, status: { in: ['trial', 'active'] } },
    });

    if (!existingSub) {
      const subEnd = new Date();
      subEnd.setMonth(subEnd.getMonth() + 1);

      await db.subscription.create({
        data: {
          agentId: lauraAgent.id,
          planId: professionalPlan.id,
          status: 'active',
          startsAt: new Date(),
          endsAt: subEnd,
        },
      });
    }

    // ── Stats ───────────────────────────────────────────────────────────────
    const finalProperties = await db.property.count({ where: { agentId: lauraAgent.id } });
    const finalClients = await db.client.count({ where: { agentId: lauraAgent.id } });
    const finalDeals = await db.deal.count({ where: { agentId: lauraAgent.id } });
    const finalTaxes = await db.taxObligation.count({ where: { agentId: lauraAgent.id } });
    const finalEvents = await db.visitorEvent.count({ where: { agentId: lauraAgent.id } });
    const finalPlans = await db.plan.count();

    return NextResponse.json({
      seeded: true,
      stats: {
        platformOwner: 1,
        plans: finalPlans,
        agents: 1,
        properties: finalProperties,
        clients: finalClients,
        deals: finalDeals,
        taxObligations: finalTaxes,
        visitorEvents: finalEvents,
        subscriptions: 1,
      },
    });
  } catch (error) {
    console.error('Error seeding data:', error);
    return NextResponse.json(
      { error: 'Internal server error while seeding data', details: String(error) },
      { status: 500 }
    );
  }
}
