# Caterly Admin Portal

Modern admin dashboard for Caterly E-Commerce Platform built with Next.js 14, TypeScript, and Tailwind CSS.

## 🚀 Features

- **Authentication**: JWT-based login with role management
- **Dashboard**: Overview statistics and charts
- **Product Management**: CRUD operations for products
- **Order Management**: View and update order statuses
- **Customer Management**: Manage customers and companies
- **Responsive Design**: Mobile-first design with Tailwind CSS
- **Modern UI**: Built with shadcn/ui components
- **Type-Safe**: Full TypeScript support
- **State Management**: Zustand for global state
- **Data Fetching**: TanStack Query for server state

## 📋 Prerequisites

- Node.js 18+
- npm or yarn
- Running backend API (see backend-medusa/README.md)

## 🛠️ Installation

```bash
# Install dependencies
npm install

# Copy environment variables
cp .env.local.example .env.local

# Update .env.local with your API URL
# NEXT_PUBLIC_API_URL=http://localhost:9000
```

## 🏃 Running the App

### Development
```bash
npm run dev
```

Runs on http://localhost:3001

### Production Build
```bash
npm run build
npm start
```

## 🔐 Default Credentials

```
Super Admin:
- Username: superadmin
- Password: password123

Admin:
- Username: admin
- Password: password123

Staff:
- Username: staff
- Password: password123
```

## 📁 Project Structure

```
admin-portal/
├── src/
│   ├── app/
│   │   ├── dashboard/        # Dashboard pages
│   │   │   ├── page.tsx      # Main dashboard
│   │   │   ├── orders/       # Orders management
│   │   │   ├── products/     # Products management
│   │   │   ├── customers/    # Customer management
│   │   │   └── layout.tsx    # Dashboard layout
│   │   ├── login/
│   │   │   └── page.tsx      # Login page
│   │   ├── layout.tsx        # Root layout
│   │   ├── page.tsx          # Home (redirects to dashboard)
│   │   └── globals.css       # Global styles
│   ├── components/
│   │   ├── ui/               # shadcn/ui components
│   │   ├── layout/           # Layout components (Sidebar, Header)
│   │   └── providers.tsx     # App providers
│   ├── lib/
│   │   ├── api.ts            # API client and functions
│   │   └── utils.ts          # Utility functions
│   └── store/
│       └── auth.ts           # Auth state management
├── public/                   # Static assets
├── .env.local.example        # Environment variables template
├── next.config.js            # Next.js configuration
├── tailwind.config.ts        # Tailwind configuration
├── tsconfig.json             # TypeScript configuration
└── package.json
```

## 🎨 UI Components

Built with [shadcn/ui](https://ui.shadcn.com/) - A collection of re-usable components:

- Button
- Card
- Input
- Label
- Dialog
- Dropdown Menu
- Toast notifications (Sonner)
- And more...

## 🔧 Environment Variables

```env
# API Configuration
NEXT_PUBLIC_API_URL=http://localhost:9000

# App Configuration
NEXT_PUBLIC_APP_NAME=Caterly Admin Portal
NEXT_PUBLIC_APP_VERSION=1.0.0
```

## 📱 Pages & Features

### Dashboard (`/dashboard`)
- Overview statistics
- Recent orders
- Top products
- Revenue charts

### Orders (`/dashboard/orders`)
- List all orders
- Filter by status, date, customer
- Update order status
- View order details

### Products (`/dashboard/products`)
- List all products
- Create new products
- Edit product details
- Manage product categories
- Set pricing and options

### Customers (`/dashboard/customers`)
- List all customers
- View customer details
- Manage customer companies
- Track customer orders

### Companies (`/dashboard/companies`)
- List all companies
- Manage departments
- Track company orders

## 🔐 Authentication & Authorization

### Role-Based Access Control

```typescript
enum UserRole {
  SUPER_ADMIN = 1,  // Full system access
  ADMIN = 2,        // Management access
  STAFF = 3,        // Limited admin access
  CUSTOMER = 4      // Store access only
}
```

### Protected Routes
- All `/dashboard/*` routes require authentication
- Some routes may have role-specific access

### Auth Store (Zustand)
```typescript
const { user, token, isAuthenticated, login, logout } = useAuthStore()
```

## 🚀 Deployment

### Vercel (Recommended)
```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel
```

Environment variables on Vercel:
- `NEXT_PUBLIC_API_URL` - Your backend API URL

### Manual Deployment
```bash
npm run build
npm start
```

## 📝 TODO

- [ ] Add product image upload
- [ ] Add order details page
- [ ] Add customer details page
- [ ] Add company management page
- [ ] Add quote management
- [ ] Add reports and analytics
- [ ] Add notification system
- [ ] Add dark mode toggle
- [ ] Add export to CSV/PDF
- [ ] Add search functionality
- [ ] Add bulk operations

## 🤝 Contributing

1. Create feature branch
2. Make changes
3. Test thoroughly
4. Submit PR

## 📄 License

Proprietary - Caterly Platform

