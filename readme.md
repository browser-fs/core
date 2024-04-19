# CoreFS

This is ZenFS, rebuilt to use `tsc` and modified slightly, essentially it's still ZenFS, but more modern build structure.

ZenFS is a file system that emulates the [NodeJS filesystem API](http://nodejs.org/api/fs.html).

It works using a system of backends, which are used by ZenFS to store and retrieve data. ZenFS can also integrate with other tools.

ZenFS is a fork of [BrowserFS](https://github.com/jvilk/BrowserFS).

## Backends

ZenFS is modular and extensible. The core includes two built-in backends:

-   `InMemory`: Stores files in-memory. This is cleared when the runtime ends (e.g. a user navigating away from a web page or a Node process exiting)
-   `Overlay`: Use read-only file system as read-write by overlaying a writable file system on top of it. ([copy-on-write](https://en.wikipedia.org/wiki/Copy-on-write))

ZenFS supports a number of other backends. Many are provided as separate packages under `@zenfs`. More backends can be defined by separate libraries by extending the `FileSystem` class and/or providing a `Backend` object.

For more information, see the [docs](https://zen-fs.github.io/core).

## Installing

```sh
npm install @zenfs/core
```

## Usage

> [!NOTE]
> The examples are written in ESM.  
> If you are using CJS, you can `require` the package.  
> If using a browser environment without support for `type=module` in `script` tags, you can add a `script` tag to your HTML pointing to the `browser.min.js` and use ZenFS with the global `ZenFS` object.

```js
import fs from '@zenfs/core'; // You can also use the named export, `fs`

fs.writeFileSync('/test.txt', 'Cool, I can do this in any JS environment (including browsers)!');

const contents = fs.readFileSync('/test.txt', 'utf-8');
console.log(contents);
```

#### Using different and/or multiple backends

A single `InMemory` backend is created by default, mounted on `/`.

You can configure ZenFS to use a different backend and mount multiple backends. It is strongly recommended to do so using the `configure` function.

You can use multiple backends by passing an object to `configure` which maps paths to file systems.

The following example mounts a zip file to `/zip`, in-memory storage to `/tmp`, and IndexedDB to `/home`. Note that `/` has the default in-memory backend.

```js
import { configure, InMemory } from '@zenfs/core';
import { IndexedDB } from '@zenfs/dom';
import { Zip } from '@zenfs/zip';

const zipData = await (await fetch('mydata.zip')).arrayBuffer();

await configure({
	'/mnt/zip': { backend: Zip, zipData },
	'/tmp': InMemory,
	'/home': IndexedDB,
};
```

> [!TIP]
> When configuring a mount point, you can pass in
>
> 1. A `Backend` object, if the backend has no required options
> 2. An object that has the options accepted by the backend and a `backend` property which is a `Backend` object
> 3. A `FileSystem` instance (_not recommended_)

Here is an example that mounts the `WebStorage` backend from `@zenfs/dom` on `/`:

```js
import { configure, fs } from '@zenfs/core';
import { WebStorage } from '@zenfs/dom';

await configure({ backend: WebStorage });

if (!fs.existsSync('/test.txt')) {
	fs.writeFileSync('/test.txt', 'This will persist across reloads!');
}

const contents = fs.readFileSync('/test.txt', 'utf-8');
console.log(contents);
```

#### FS Promises

The FS promises API is exposed as `promises`.

```js
import { configure } from '@zenfs/core';
import { exists, writeFile } from '@zenfs/core/promises';
import { IndexedDB } from '@zenfs/dom';

await configure({ '/': IndexedDB });

const exists = await exists('/myfile.txt');
if (!exists) {
	await writeFile('/myfile.txt', 'Lots of persistant data');
}
```

> [!NOTE]
> You can import the promises API using:
>
> 1. Exports from `@zenfs/core/promises`
> 2. The `promises` export from `@zenfs/core`
> 3. `fs.promises` on the exported `fs` from `@zenfs/core`.

#### Mounting and unmounting, creating backends

If you would like to create backends without configure (e.g. to do something dynamic at runtime), you may do so by importing the backend and calling `resolveMountConfig` with it.

You can then mount and unmount the backend instance by using `mount` and `umount`.

```js
import { configure, resolveMountConfig, InMemory } from '@zenfs/core';
import { IndexedDB  } from '@zenfs/dom';
import { Zip } from '@zenfs/zip';

await configure({
	'/tmp': InMemory,
	'/home': IndexedDB,
};

fs.mkdirSync('/mnt');

const res = await fetch('mydata.zip');
const zipfs = await resolveMountConfig({ backend: Zip, zipData: await res.arrayBuffer() });
fs.mount('/mnt/zip', zipfs);

// do stuff with the mounted zip

fs.umount('/mnt/zip'); // finished using the zip
```

> [!WARNING]
> Instances of backends follow the **internal** ZenFS API. You should never use a backend's methods unless you are extending a backend.

## Using with bundlers

ZenFS exports a drop-in for Node's `fs` module (up to the version of `@types/node` in package.json), so you can use it for your bundler of preference using the default export.

## Building

-   Make sure you have Node and NPM installed. You must have Node v18 or newer.
-   Install dependencies with `npm install`
-   Build using `npm run build`
-   You can find the built code in `dist`.

### Testing

Run unit tests with `npm test`.
