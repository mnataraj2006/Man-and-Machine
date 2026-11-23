# Man & Machine Fitness

Professional website for **Man & Machine Fitness Gym, Kovilpatti**.

---

## Project Structure

```
MAN-AND-MACHINE/
├── frontend/        # React + Vite + Tailwind CSS
├── backend/         # Node.js + Express + MongoDB (prepared, not yet implemented)
├── docs/            # Reference files (Stitch export, design specs)
├── .gitignore
└── README.md
```

---

## Frontend

**Stack:** React 18 · Vite 6 · Tailwind CSS 3 · Space Grotesk + Inter

```bash
cd frontend
npm install
npm run dev      # http://localhost:3000
npm run build    # production build → dist/
```

### Frontend Structure
```
frontend/src/
├── components/      # UI components organised by section
│   ├── Navbar/
│   ├── Hero/
│   ├── Stats/
│   ├── About/
│   ├── Training/
│   ├── Facilities/
│   ├── Gallery/
│   ├── Transformations/
│   ├── Reviews/
│   ├── Location/
│   ├── CTA/
│   └── Footer/
├── pages/           # Page-level components (for future React Router)
├── data/            # Static structured content (training, facilities, testimonials)
├── services/        # API service layer (communicates with backend)
├── hooks/           # Custom React hooks
└── assets/          # Bundled assets (fonts, icons)

frontend/public/
├── images/          # Organised gym photography
│   ├── logo/
│   ├── hero/
│   ├── gym/
│   ├── equipment/
│   ├── trainers/
│   ├── members/
│   ├── transformations/
│   └── testimonials/
└── videos/          # Gym/training videos
    ├── hero/
    ├── gym/
    └── training/
```

---

## Backend

**Stack (planned):** Node.js · Express · MongoDB · Mongoose · JWT

> ⚠️ Backend is **architecture-only** at this stage. No endpoints, database, or authentication are implemented yet.

```bash
cd backend
npm install
npm run dev      # http://localhost:5000
```

### Planned Backend Features
- Membership enquiry form submissions
- Contact form handling
- Trainer information API
- Membership plan management
- Member reviews
- Admin dashboard
- Authentication (JWT)

### Backend Structure
```
backend/src/
├── config/          # DB, environment, app config
├── controllers/     # Request handlers
├── models/          # Mongoose schemas
├── routes/          # Express route definitions
├── middleware/      # Auth, validation, error handling
├── services/        # Business logic
└── utils/           # Helpers and utilities
```

---

## Environment Variables

Copy `.env.example` to `.env` in the backend directory and fill in your values:

```bash
cp backend/.env.example backend/.env
```

---

## Color Palette

| Token | Hex | Usage |
|-------|-----|-------|
| Background | `#09090B` | Dark charcoal base |
| Primary text | `#F5F5F5` | White text |
| Secondary text | `#B8B8C7` | Muted gray |
| Accent | `#E58A32` | Orange — brand primary |
| Border | `#292936` | Subtle dividers |

---

## Contact

**Man & Machine Fitness Centre**
Balaji Complex, 580E/5, Ettayapuram Road, Kovilpatti – 628501
📞 +91 75988 85566
