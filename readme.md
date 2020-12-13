# @ling.black/deploy

## Установка

```
yarn add @ling.black/deploy
```

## Использование

Предположим, что в директории `./myExpressApp` лежит проект express. Очень важно, что в `package.json` у нас есть скрипт
запуска:

```json
{
  "scripts": {
    "start": "node ./index.js"
  }
}
```

Порт мы решили использовать `3399`. Это указали в методе `app.listen`. Начнем:

### Общий пример

```js
import {createDeployClient} from "@ling.black/deploy";

(async () => {

    // Создаем подключение
    const deploy = await createDeployClient({
        host: 'myhost.ru',
        port: 22,
        password: '*******',
        user: 'user',
    });

    // Первым делом проверим, что порт не занят, или остановим процесс,
    // который его испольузет
    const port = await deploy.shell.commandPortUsage(3399);
    if (port.process) {
        await deploy.shell.commandKill(port.process);
    }

    // Создадим необходимую директорию и выполним загрузку
    await deploy.shell.command("cd /home/user/tests && mkdir -p app");
    await deploy.sftp.uploadDirectory("./myExpressApp", "/home/user/tests/app");

    // Установим и запустим приложение
    await deploy.shell.command("cd /home/user/tests/app && yarn");
    await deploy.shell.command("cd /home/user/tests/app && node ./index.js");
    // resolve настанет при остановке работы node приложения 

    // Данная строка кода вызовится очень не скоро. Когда express остановится
    deploy.close();

})();
```

Рассмотрим дополнительные примеры

### Загрузка и установка nodeJS приложения

```js
    // Создадим необходимую директорию и выполним загрузку
await deploy.shell.command("cd /home/user/tests && mkdir -p app");
await deploy.sftp.uploadDirectory("./myExpressApp", "/home/user/tests/app");

// Установим и запустим приложение
await deploy.shell.command("cd /home/diego/tests/app && yarn");
```

Можно упростить в:

```js
    await deploy.nodeJSUploadAndInstall("./myExpressApp", "/home/user/tests/app");
```

Таким образом, загрузка и установка упакованы в один метод. Однако нам все еще надо установить и запустить. Окей,
рассмотрим следующий вариант

### Deploy nodeJS приложения

```js
    await deploy.nodeJSDeployApp({
    localPath: "./myExpressApp",
    remotePath: "/home/user/tests/app",
    install: true,
    start: true,
});
```

Флаг `install: true` запускает установку, а `start: true` запускает `yarn start` на сервере. Можно опустить эти
параметры, они по умолчанию установлены в `true`.

### Deploy nodeJS Express приложения

В прошлом примере мы смогли установить и запустить приложение, остается проверить порт. Такой вариант тоже имеется в
удобном виде:

```js
    await deploy.nodeJSDeployExpressApp({
    localPath: "./myExpressApp",
    remotePath: "/home/user/tests/app",
    install: true,
    start: true,
    port: 3399,
});
```

В данный метод мы также передали порт. Если он будет занят, то вызовется `kill ${port}`. Консоль будет отображать все,
что получает nodeJS приложение. Это добивается флагом:

```js
    deploy.showStreamData = true;
```