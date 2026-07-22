CREATE DATABASE IF NOT EXISTS data_insight CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE data_insight;

-- Table: users
CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    role ENUM('admin', 'analyst', 'viewer') DEFAULT 'viewer',
    status ENUM('active', 'inactive') DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Table: reports
CREATE TABLE IF NOT EXISTS reports (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    sql_query TEXT NOT NULL,
    chart_type VARCHAR(50) DEFAULT 'table',
    chart_config JSON,
    created_by INT,
    is_public BOOLEAN DEFAULT FALSE,
    share_uuid VARCHAR(36) UNIQUE,
    share_password_hash VARCHAR(255),
    is_shareable BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
);

-- Table: report_permissions
CREATE TABLE IF NOT EXISTS report_permissions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    report_id INT NOT NULL,
    user_id INT NOT NULL,
    permission_level ENUM('view', 'edit') DEFAULT 'view',
    FOREIGN KEY (report_id) REFERENCES reports(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Table: dashboards
CREATE TABLE IF NOT EXISTS dashboards (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    layout_config JSON,
    created_by INT,
    is_public BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
);

-- Table: dashboard_widgets
CREATE TABLE IF NOT EXISTS dashboard_widgets (
    id INT AUTO_INCREMENT PRIMARY KEY,
    dashboard_id INT NOT NULL,
    report_id INT NOT NULL,
    position_x INT DEFAULT 0,
    position_y INT DEFAULT 0,
    width INT DEFAULT 4,
    height INT DEFAULT 4,
    FOREIGN KEY (dashboard_id) REFERENCES dashboards(id) ON DELETE CASCADE,
    FOREIGN KEY (report_id) REFERENCES reports(id) ON DELETE CASCADE
);

-- Table: query_history
CREATE TABLE IF NOT EXISTS query_history (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT,
    executed_sql TEXT NOT NULL,
    execution_time_ms INT,
    status ENUM('success', 'fail', 'timeout') NOT NULL,
    error_message TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

-- Table: report_execution_logs
CREATE TABLE IF NOT EXISTS report_execution_logs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    report_id INT,
    user_id INT,
    executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    execution_time_ms INT,
    FOREIGN KEY (report_id) REFERENCES reports(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

-- Table: favorites
CREATE TABLE IF NOT EXISTS favorites (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    item_type ENUM('report', 'dashboard') NOT NULL,
    item_id INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Insert mock Admin user (Password: password123, you should hash this in real app)
-- Note: bcrypt hash for 'password123' is approx '$2a$10$...'
-- I'll put a placeholder here that can be updated via the App
INSERT IGNORE INTO users (email, password_hash, role) VALUES ('admin@example.com', '$2b$10$XVaxbm7x80v7hITl8jYnLea1U8Da9tGlNlNpdGPbA7NEHOho2qy5i', 'admin');
