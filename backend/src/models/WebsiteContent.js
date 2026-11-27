const mongoose = require('mongoose');

const DEFAULT_CONTENT = {
  key: 'main',
  hero: {
    eyebrow: 'FITNESS COMMUNITY',
    headline: 'TRAIN HARD. STAY STRONG.',
    subheadline: 'Built for people who show up. Kovilpatti’s dedicated strength & conditioning training ground.',
    primaryCtaText: 'JOIN MAN & MACHINE',
    secondaryCtaText: 'EXPLORE FACILITIES',
    backgroundImageUrl: '/images/hero/Man & Machine_ Train Hard, Stay Strong.png',
    backgroundStorageKey: '',
  },
  about: {
    sectionLabel: '01 / THE STANDARD',
    headline: 'BUILT FOR DISCIPLINE. NOT EXCUSES.',
    body: 'Man & Machine is engineered for serious training—commercial strength equipment, structured coaching, and a focused floor where consistency compounds.',
    highlightQuote: 'Show up. Do the work. Let the results speak.',
    imageUrl: '',
    imageStorageKey: '',
  },
  facilities: {
    sectionLabel: '04 / THE TRAINING GROUND',
    headline: 'BUILT TO PERFORM.',
    subheadline: 'Commercial-grade free weights, calibrated machines, turf conditioning, and dedicated coaching zones.',
    imageUrl: '/images/framer/training-floor.png',
    imageStorageKey: '',
  },
  membershipSection: {
    sectionLabel: '05 / MAKE THE COMMITMENT',
    headline: 'CHOOSE YOUR PLAN.',
    subheadline: 'Transparent branch pricing with zero hidden fees.',
    ctaText: 'START MEMBERSHIP',
  },
  trainersSection: {
    sectionLabel: '06 / IN YOUR CORNER',
    headline: 'TRAIN WITH PURPOSE.',
    subheadline: 'Good coaching. Better habits. Stronger you.',
  },
  community: {
    sectionLabel: '07 / OUR PEOPLE',
    headline: 'STRONGER TOGETHER.',
    body: 'Every rep, every session, every milestone—backed by coaches and members who hold the line.',
    imageUrl: '/images/framer/community-together.png',
    imageStorageKey: '',
  },
  gallerySection: {
    sectionLabel: '08 / INSIDE THE GYM',
    headline: 'GYM GALLERY.',
    subheadline: 'Real training floors, equipment, coaching moments, and community energy inside Man & Machine.',
    footerNote: 'Not a before and after. A commitment to strength, confidence and the discipline to keep going.',
  },
  cta: {
    eyebrow: 'YOUR FIRST STEP STARTS HERE.',
    headline: 'READY TO BECOME STRONGER?',
    subheadline: 'Your first step starts here.',
    ctaText: 'JOIN MAN & MACHINE',
    backgroundImageUrl: '/images/hero/Man & Machine_ Train Hard, Stay Strong.png',
    backgroundStorageKey: '',
  },
  footer: {
    tagline: 'Built for strength, conditioning, and long-term discipline in Kovilpatti.',
    phone: '+91 98765 43210',
    email: 'contact@manandmachine.in',
    address: 'Kovilpatti, Tamil Nadu',
    copyrightText: '© Man & Machine Fitness Centre. All rights reserved.',
  },
  testimonials: [
    {
      name: 'Karthik S.',
      role: 'Strength Member',
      quote: 'Clean floor, serious equipment, and coaches who actually correct your form every session.',
      rating: 5,
      active: true,
    },
    {
      name: 'Priya R.',
      role: 'Conditioning Athlete',
      quote: 'Consistent programming helped me stay disciplined for over a year without burnout.',
      rating: 5,
      active: true,
    },
  ],
};

const websiteContentSchema = new mongoose.Schema(
  {
    key: {
      type: String,
      default: 'main',
      unique: true,
      index: true,
    },
    hero: {
      eyebrow: { type: String, default: DEFAULT_CONTENT.hero.eyebrow },
      headline: { type: String, default: DEFAULT_CONTENT.hero.headline },
      subheadline: { type: String, default: DEFAULT_CONTENT.hero.subheadline },
      primaryCtaText: { type: String, default: DEFAULT_CONTENT.hero.primaryCtaText },
      secondaryCtaText: { type: String, default: DEFAULT_CONTENT.hero.secondaryCtaText },
      backgroundImageUrl: { type: String, default: DEFAULT_CONTENT.hero.backgroundImageUrl },
      backgroundStorageKey: { type: String, default: '' },
    },
    about: {
      sectionLabel: { type: String, default: DEFAULT_CONTENT.about.sectionLabel },
      headline: { type: String, default: DEFAULT_CONTENT.about.headline },
      body: { type: String, default: DEFAULT_CONTENT.about.body },
      highlightQuote: { type: String, default: DEFAULT_CONTENT.about.highlightQuote },
      imageUrl: { type: String, default: '' },
      imageStorageKey: { type: String, default: '' },
    },
    facilities: {
      sectionLabel: { type: String, default: DEFAULT_CONTENT.facilities.sectionLabel },
      headline: { type: String, default: DEFAULT_CONTENT.facilities.headline },
      subheadline: { type: String, default: DEFAULT_CONTENT.facilities.subheadline },
      imageUrl: { type: String, default: DEFAULT_CONTENT.facilities.imageUrl },
      imageStorageKey: { type: String, default: '' },
    },
    membershipSection: {
      sectionLabel: { type: String, default: DEFAULT_CONTENT.membershipSection.sectionLabel },
      headline: { type: String, default: DEFAULT_CONTENT.membershipSection.headline },
      subheadline: { type: String, default: DEFAULT_CONTENT.membershipSection.subheadline },
      ctaText: { type: String, default: DEFAULT_CONTENT.membershipSection.ctaText },
    },
    trainersSection: {
      sectionLabel: { type: String, default: DEFAULT_CONTENT.trainersSection.sectionLabel },
      headline: { type: String, default: DEFAULT_CONTENT.trainersSection.headline },
      subheadline: { type: String, default: DEFAULT_CONTENT.trainersSection.subheadline },
    },
    community: {
      sectionLabel: { type: String, default: DEFAULT_CONTENT.community.sectionLabel },
      headline: { type: String, default: DEFAULT_CONTENT.community.headline },
      body: { type: String, default: DEFAULT_CONTENT.community.body },
      imageUrl: { type: String, default: DEFAULT_CONTENT.community.imageUrl },
      imageStorageKey: { type: String, default: '' },
    },
    gallerySection: {
      sectionLabel: { type: String, default: DEFAULT_CONTENT.gallerySection.sectionLabel },
      headline: { type: String, default: DEFAULT_CONTENT.gallerySection.headline },
      subheadline: { type: String, default: DEFAULT_CONTENT.gallerySection.subheadline },
      footerNote: { type: String, default: DEFAULT_CONTENT.gallerySection.footerNote },
    },
    cta: {
      eyebrow: { type: String, default: DEFAULT_CONTENT.cta.eyebrow },
      headline: { type: String, default: DEFAULT_CONTENT.cta.headline },
      subheadline: { type: String, default: DEFAULT_CONTENT.cta.subheadline },
      ctaText: { type: String, default: DEFAULT_CONTENT.cta.ctaText },
      backgroundImageUrl: { type: String, default: DEFAULT_CONTENT.cta.backgroundImageUrl },
      backgroundStorageKey: { type: String, default: '' },
    },
    footer: {
      tagline: { type: String, default: DEFAULT_CONTENT.footer.tagline },
      phone: { type: String, default: DEFAULT_CONTENT.footer.phone },
      email: { type: String, default: DEFAULT_CONTENT.footer.email },
      address: { type: String, default: DEFAULT_CONTENT.footer.address },
      copyrightText: { type: String, default: DEFAULT_CONTENT.footer.copyrightText },
    },
    testimonials: {
      type: [
        {
          name: { type: String, trim: true, required: true },
          role: { type: String, trim: true, default: 'Member' },
          quote: { type: String, trim: true, required: true },
          rating: { type: Number, default: 5, min: 1, max: 5 },
          active: { type: Boolean, default: true },
        },
      ],
      default: DEFAULT_CONTENT.testimonials,
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
  },
  { timestamps: true }
);

websiteContentSchema.statics.getOrCreateMain = async function () {
  let doc = await this.findOne({ key: 'main' });
  if (!doc) {
    doc = await this.create(DEFAULT_CONTENT);
  }
  return doc;
};

const WebsiteContent = mongoose.model('WebsiteContent', websiteContentSchema);

module.exports = WebsiteContent;
module.exports.DEFAULT_CONTENT = DEFAULT_CONTENT;
