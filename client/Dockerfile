# client/Dockerfile

# Étape 1 : Builder
FROM node:22 AS builder

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

# Étape 2 : Environnement de dev
FROM node:22

WORKDIR /app

# Copie les modules installés
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app .

EXPOSE 5173
CMD ["npm", "run", "dev", "--", "--host"]
