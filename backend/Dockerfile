FROM node:24-alpine

WORKDIR /usr/src/app

# Kopiowanie plików definicji pakietów
COPY package*.json ./
RUN npm install

# Kopiowanie reszty kodu aplikacji
COPY . .

# Generowanie klienta Prisma dla architektury kontenera
RUN npx prisma generate

EXPOSE 3001

# Aplikacja migracji i uruchomienie serwera
CMD ["sh", "-c", "npx prisma migrate deploy && npm run dev"]
