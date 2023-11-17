FROM node:18.13.0 as builder

WORKDIR /usr/src/app

COPY / /usr/src/app/

RUN yarn install \
  && yarn build

FROM node:18.13.0-alpine

# Install major CA certificates to cover
# https://github.com/SparebankenVest/azure-key-vault-to-kubernetes integration
RUN apk --no-cache add ca-certificates

WORKDIR /usr/src/app

COPY /package.json /usr/src/app/package.json
COPY --from=builder /usr/src/app/dist /usr/src/app/dist
COPY --from=builder /usr/src/app/node_modules /usr/src/app/node_modules

EXPOSE 80

CMD ["node", "dist/app.js"]
