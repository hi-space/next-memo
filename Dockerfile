FROM node:22

WORKDIR /app
COPY . /app

EXPOSE 3000

ENV AWS_DEFAULT_REGION=ap-northeast-2

RUN yarn install
RUN yarn build

CMD ["yarn", "start"]
