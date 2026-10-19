FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm i

FROM node:22-alpine AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# NEXT_PUBLIC_* values are inlined into the client bundle at BUILD time, so
# the deployment workflow exports the VPS .env and passes them as build args.
ARG NEXT_PUBLIC_BLUX_APP_ID
ARG NEXT_PUBLIC_STELLAR_HOME_DOMAIN=testnet.lumenrise.app
ARG LUMENRISE_API_URL=https://api.lumenrise.app
ARG NEXT_PUBLIC_STELLAR_HORIZON_URL=https://horizon-testnet.stellar.org
ARG NEXT_PUBLIC_STELLAR_RPC_URL=https://soroban-testnet.stellar.org
ARG NEXT_PUBLIC_FACTORY_CONTRACT_ID
ARG NEXT_PUBLIC_USDC_CONTRACT_ID
ARG NEXT_PUBLIC_XLM_CONTRACT_ID
ENV NEXT_PUBLIC_BLUX_APP_ID=$NEXT_PUBLIC_BLUX_APP_ID \
    NEXT_PUBLIC_STELLAR_HOME_DOMAIN=$NEXT_PUBLIC_STELLAR_HOME_DOMAIN \
    LUMENRISE_API_URL=$LUMENRISE_API_URL \
    NEXT_PUBLIC_STELLAR_HORIZON_URL=$NEXT_PUBLIC_STELLAR_HORIZON_URL \
    NEXT_PUBLIC_STELLAR_RPC_URL=$NEXT_PUBLIC_STELLAR_RPC_URL \
    NEXT_PUBLIC_FACTORY_CONTRACT_ID=$NEXT_PUBLIC_FACTORY_CONTRACT_ID \
    NEXT_PUBLIC_USDC_CONTRACT_ID=$NEXT_PUBLIC_USDC_CONTRACT_ID \
    NEXT_PUBLIC_XLM_CONTRACT_ID=$NEXT_PUBLIC_XLM_CONTRACT_ID \
    NEXT_OUTPUT=standalone \
    NEXT_TELEMETRY_DISABLED=1
RUN npm run build

FROM node:22-alpine AS run
WORKDIR /app
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000 \
    HOSTNAME=0.0.0.0
RUN addgroup -S nodejs && adduser -S nextjs -G nodejs
COPY --from=build --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=build --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=build --chown=nextjs:nodejs /app/public ./public
USER nextjs
EXPOSE 3000
CMD ["node", "server.js"]
