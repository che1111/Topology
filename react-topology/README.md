# Topology

using node >= 20
current using node v22.13.1 (tested in mode 20.17.0)
yarn version 1.22.22

## Run 
    ```
    yarn install
    cd packages/demo-app-ts
    yarn start:demo-app:hot
    ```

## Build Production

    ```
    yarn build:demo-app
    ```

## build image using docker file

    ```
    docker build -t topology-prod .
    ```