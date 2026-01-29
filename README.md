# RetailOS

A full-stack retail management system built with React, Node.js, and MongoDB. Features product management, supplier management, purchase orders, and purchase tracking with automatic stock updates.

## Project Structure

```
erp/
├── client/                    # React frontend
│   ├── src/
│   │   ├── components/        # React components
│   │   │   ├── Dashboard.js
│   │   │   ├── Products.js
│   │   │   ├── Suppliers.js
│   │   │   ├── PurchaseOrders.js
│   │   │   └── Purchases.js
│   │   ├── services/          # API services
│   │   │   └── api.js
│   │   ├── App.js
│   │   └── App.css
│   ├── public/
│   └── package.json
├── server/                    # Node.js backend
│   ├── models/                # Mongoose models
│   │   ├── Product.js
│   │   ├── Supplier.js
│   │   ├── PurchaseOrder.js
│   │   └── Purchase.js
│   ├── routes/                # API routes
│   │   ├── products.js
│   │   ├── suppliers.js
│   │   ├── purchaseOrders.js
│   │   └── purchases.js
│   ├── server.js
│   └── package.json
└── README.md
```

## Prerequisites

- Node.js (v14 or higher)
- MongoDB (running locally or MongoDB Atlas connection string)
- npm or yarn

## Setup Instructions

### 1. Install MongoDB

Make sure MongoDB is installed and running on your system:
- **Local MongoDB**: Install MongoDB Community Edition and start the service
- **MongoDB Atlas**: Get a connection string from MongoDB Atlas

### 2. Backend Setup

```bash
cd server
npm install
```

Create a `.env` file in the `server` directory:
```
PORT=5000
MONGODB_URI=mongodb://localhost:27017/inventory
```

Or for MongoDB Atlas:
```
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/inventory
```

Start the server:
```bash
npm start
# or for development with auto-reload
npm run dev
```

The server will run on `http://localhost:5000`

### 3. Frontend Setup

Open a new terminal:

```bash
cd client
npm install
npm start
```

The React app will run on `http://localhost:3000`

## Features

### Product Management
- Create, read, update, and delete products
- Track SKU, category, unit, prices (current and cost)
- Stock quantity tracking with minimum stock level alerts
- Search and filter products

### Supplier Management
- Maintain supplier database with contact information
- Track contact person, email, phone, and address

### Purchase Orders
- Create purchase orders with multiple items
- Auto-generate PO numbers (PO-YYYYMMDD-001 format)
- Track order status (pending, approved, received, cancelled)
- Calculate subtotals, tax, and totals automatically
- Link to suppliers and products

### Purchases
- Create purchases (standalone or from purchase orders)
- Auto-generate purchase numbers (PUR-YYYYMMDD-001 format)
- Automatic stock quantity updates when purchases are created
- Track payment status (pending, paid, partial)
- Reverse stock updates when purchases are deleted

### Dashboard
- Overview statistics (total products, low stock items, pending POs, recent purchases)
- Low stock alerts
- Quick access to all modules

## API Endpoints

### Products
- `GET /api/products` - Get all products (supports ?search= and ?category= query params)
- `GET /api/products/:id` - Get single product
- `POST /api/products` - Create product
- `PUT /api/products/:id` - Update product
- `DELETE /api/products/:id` - Delete product

### Suppliers
- `GET /api/suppliers` - Get all suppliers (supports ?search= query param)
- `GET /api/suppliers/:id` - Get single supplier
- `POST /api/suppliers` - Create supplier
- `PUT /api/suppliers/:id` - Update supplier
- `DELETE /api/suppliers/:id` - Delete supplier

### Purchase Orders
- `GET /api/purchase-orders` - Get all purchase orders (supports ?status= and ?supplier= query params)
- `GET /api/purchase-orders/:id` - Get single purchase order
- `POST /api/purchase-orders` - Create purchase order
- `PUT /api/purchase-orders/:id` - Update purchase order
- `DELETE /api/purchase-orders/:id` - Delete purchase order

### Purchases
- `GET /api/purchases` - Get all purchases (supports ?supplier= and ?paymentStatus= query params)
- `GET /api/purchases/:id` - Get single purchase
- `POST /api/purchases` - Create purchase (automatically updates stock)
- `PUT /api/purchases/:id` - Update purchase
- `DELETE /api/purchases/:id` - Delete purchase (reverses stock updates)

### Health Check
- `GET /api/health` - Check server and database connection status

## Technologies Used

- **Frontend**: React 18, Axios
- **Backend**: Node.js, Express, Mongoose
- **Database**: MongoDB

## Database Schema

### Products
- name, description, sku, category, unit
- currentPrice, costPrice
- stockQuantity, minStockLevel

### Suppliers
- name, contactPerson, email, phone, address

### Purchase Orders
- poNumber (auto-generated), supplier, orderDate, expectedDeliveryDate
- status (pending/approved/received/cancelled)
- items[] (product, quantity, unitPrice, total)
- subtotal, tax, total

### Purchases
- purchaseNumber (auto-generated), supplier, purchaseOrder (optional), purchaseDate
- items[] (product, quantity, unitPrice, total)
- subtotal, tax, total
- paymentStatus (pending/paid/partial)
- Automatically updates product stock quantities on creation

