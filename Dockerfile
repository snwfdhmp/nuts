FROM mhart/alpine-node:5.8.0

# Switch to /app
WORKDIR /app
# Install deps
COPY package.json ./
RUN npm install --production
# Copy source
COPY . ./

# Ports
ENV PORT 7004
ENV GITHUB_TOKEN 1465dd09fb02a1b22961bdbd9a363187be7279ea
ENV API_USERNAME Etsurosu
ENV API_PASSWORD g-qr3]<s
ENV GITHUB_REPO Etsurosu/odc-maj-auto
ENV PORT 7004
ENV TRUST_PROXY loopback

EXPOSE 7004

ENTRYPOINT ["npm", "start"]
