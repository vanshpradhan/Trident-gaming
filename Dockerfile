# ─────────────────────────────────────────────
# Stage 1: Build the React frontend
# ─────────────────────────────────────────────
FROM node:20-alpine AS frontend-build

WORKDIR /app

# Copy package files and install dependencies
COPY package.json package-lock.json ./
RUN npm ci

# Copy frontend source and build
COPY index.html vite.config.ts tsconfig.json ./
COPY src/ ./src/
COPY public/ ./public/

RUN npm run build
# Output: /app/dist/

# ─────────────────────────────────────────────
# Stage 2: Build the Spring Boot backend (includes React dist via Maven)
# ─────────────────────────────────────────────
FROM maven:3.9-eclipse-temurin-21 AS backend-build

WORKDIR /app

# Copy the built React dist from stage 1
COPY --from=frontend-build /app/dist ./dist

# Copy Maven wrapper and pom.xml first (layer cache for dependencies)
COPY backend/pom.xml ./backend/pom.xml
COPY backend/.mvn ./backend/.mvn
COPY backend/mvnw ./backend/mvnw

# Download dependencies (cached unless pom.xml changes)
RUN chmod +x ./backend/mvnw && \
    cd backend && \
    ./mvnw dependency:go-offline -B

# Copy backend source
COPY backend/src ./backend/src

# Build fat JAR (skip npm steps — dist already copied above)
# We override the exec-maven-plugin executions by skipping them
RUN cd backend && \
    ./mvnw package -B -DskipTests \
      -Dexec.skip=true \
      -Dmaven.exec.skip=true
# Output: /app/backend/target/cafe-1.0.0.jar

# ─────────────────────────────────────────────
# Stage 3: Final minimal JRE image
# ─────────────────────────────────────────────
FROM eclipse-temurin:21-jre-alpine

WORKDIR /app

# Copy the fat JAR from the build stage
COPY --from=backend-build /app/backend/target/cafe-1.0.0.jar app.jar

# Expose the port Spring Boot listens on
EXPOSE 8080

# Activate the production Spring profile
ENV SPRING_PROFILES_ACTIVE=prod

# Run the app
ENTRYPOINT ["java", "-jar", "app.jar"]
