# 1. korak: Build okolje (uporabimo Node.js)
FROM node:18-alpine as build

WORKDIR /app

# Kopiramo package.json in namestimo knjižnice
COPY package.json ./
RUN npm install

# Kopiramo preostalo kodo in zgradimo aplikacijo
COPY . .
RUN npm run build

# 2. korak: Produkcijsko okolje (Nginx strežnik)
FROM nginx:alpine

# Kopiramo zgrajeno aplikacijo iz 1. koraka v Nginx mapo
COPY --from=build /app/build /usr/share/nginx/html

# Odpremo port 80
EXPOSE 80

# Zaženemo Nginx
CMD ["nginx", "-g", "daemon off;"]