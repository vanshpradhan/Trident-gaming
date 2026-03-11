# Trident Gaming Café 🔱

Trident Gaming Café is a premium, modern gaming café management system designed for high-performance gaming centers and VR lounges. It provides a seamless experience for both gamers and administrators.

![Trident Logo](public/trident-logo.png)

## 🚀 Overview

The system manages the entire lifecycle of a gaming café session—from console discovery and bookings to food/snack ordering and real-time loyalty tracking. 

### Key Features
- **Live Console Management**: Real-time status tracking for high-end consoles (PS5, PSVR2).
- **Session Booking**: Integrated booking system with time-slot management.
- **Snack Bar Integrations**: Digital menu for ordering snacks and drinks while gaming.
- **Loyalty & Leveling**: Gamified user experience with XP, Tiers (Bronze to Gold), and Active Boosters.
- **Admin Command Center**: Complete dashboard for managing sessions, inventory, and revenue.

---

## 🛠️ Tech Stack

- **Frontend**: React, Vite, Framer Motion, Tailwind CSS
- **Backend**: Java 21, Spring Boot, Spring Data JPA, Spring Security
- **Database**: H2 (Embedded database)
- **Communication**: SSE (Server-Sent Events) for real-time updates

---

## 📦 Prerequisites

Ensure you have the following installed:
- **Node.js** (v18 or higher)
- **Java Development Kit (JDK) 21** or higher

---

## 🏗️ Installation & Setup

1. **Clone the repository**:
   ```bash
   git clone https://github.com/vanshpradhan/Trident-gaming.git
   cd Trident-gaming
   ```

2. **Frontend Setup**:
   ```bash
   npm install
   ```

3. **Backend Setup**:
   The backend uses Maven Wrapper, so no separate installation is required besides the JDK.

---

## 🚦 Running the Application

### 1. Start the Frontend
In the root directory:
```bash
npm run dev
```
The frontend will be available at `http://localhost:3000`.

### 2. Start the Backend
Navigate to the `backend` folder and run the server. 

> [!IMPORTANT]
> **Windows/Encoding Note:** If your project path contains special characters (like `é`), use the following command to avoid script encoding issues:

```powershell
cd backend
java -Dmaven.multiModuleProjectDirectory=. -classpath .mvn\wrapper\maven-wrapper.jar org.apache.maven.wrapper.MavenWrapperMain spring-boot:run
```

Otherwise, you can use:
```powershell
./mvnw spring-boot:run
```
The backend will be available at `http://localhost:8080`.

---

## 📄 License
This project is for demonstration and gaming café management purposes.
