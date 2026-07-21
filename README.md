# 📊 Data Insight (Dynamic Report Builder)

A self-service Data Analytics and Business Intelligence (BI) platform designed specifically for Hospital Information Systems (HIS). This tool allows Data Analysts and Administrators to dynamically create reports and dashboards by simply writing SQL `SELECT` queries, without needing developers to create new screens every time.

## ✨ Features

- **Multi-Database Architecture**: Connects to an internal system DB (for saving users, reports, dashboards) and an external HIS DB (for executing queries).
- **Advanced SQL Editor**: Integrated with **Monaco Editor** (the engine behind VS Code) for syntax highlighting and a rich coding experience.
- **SQL Security Validator**: Built-in middleware to automatically block DML/DDL commands (`INSERT`, `UPDATE`, `DELETE`, `DROP`, etc.), ensuring the HIS database remains read-only and secure.
- **Auto Chart Recommendation**: Analyzes query result data types to automatically suggest the most appropriate visualization (Table, Bar, Pie, Line Chart).
- **Environment Encryption**: Securely encrypts database passwords inside the `.env` file using AES-256-CBC to prevent unauthorized credential access.
- **Modern Enterprise UI**: Built with **AdminLTE 4** and **Bootstrap 5** for a clean, responsive, and professional user interface.

## 🛠️ Tech Stack

**Backend:**
- Node.js (v22)
- Express.js
- MySQL2 (Promise-based Connection Pool)
- bcryptjs & crypto (Security)

**Frontend:**
- EJS (Embedded JavaScript templates)
- AdminLTE 4 & Bootstrap 5
- Apache ECharts (Data Visualization)
- Monaco Editor (SQL Editor)

## 🚀 Getting Started

Follow these instructions to set up the project locally.

### 1. Prerequisites
- Node.js (v18 or higher)
- MySQL Server (v8.0+)
- Git

### 2. Installation
Clone the repository and install dependencies:
```bash
git clone https://github.com/ongsillyone-png/Data-insight.git
cd Data-insight
npm install
```

### 3. Database Setup
1. Create a database named `data_insight` in your MySQL Server.
2. Import the database schema and mock data by executing the `database.sql` script provided in the root directory.
   *(This will create the necessary tables and a default admin user).*

### 4. Environment Configuration
Copy the template environment file:
```bash
cp .env.example .env
```
Open `.env` and fill in your connection details for both the System DB (`data_insight`) and your external HIS DB.

#### 🔒 Encrypting your Database Passwords
For security reasons, passwords should not be stored in plain text. Use the built-in encryption script:
```bash
node encrypt-password.js "your_actual_password_here"
```
Copy the resulting `ENC:...` string and paste it as the value for `DB_PASSWORD` and `HIS_DB_PASSWORD` inside your `.env` file.

### 5. Run the Application
Start the development server:
```bash
npm run dev
```
The application will be available at `http://localhost:3000`.

**Default Login:**
- **Email:** `admin@example.com`
- **Password:** `password123`

## 🛣️ Roadmap

- [x] **Sprint 1:** Core Foundation & Database, Authentication, Layouts.
- [x] **Sprint 2:** Report Builder Engine, SQL Validation, Auto-Charts.
- [ ] **Sprint 3:** Dashboard Builder (Drag & Drop Grid Layout).
- [ ] **Sprint 4:** Enterprise Features (PDF/Excel Export, Roles & Permissions, Audit Logs).

## 📄 License
This project is for internal enterprise use.
