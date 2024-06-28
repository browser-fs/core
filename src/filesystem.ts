import type { ExtractProperties } from 'utilium';
import { rootCred, type Cred } from './cred.js';
import { join } from './emulation/path.js';
import { Errno, ErrnoError } from './error.js';
import { PreloadFile, parseFlag, type File } from './file.js';
import { ZenFsType, type Stats } from './stats.js';
import { EventEmitter } from 'eventemitter3';

export type FileContents = ArrayBufferView | string;

/**
 * Metadata about a FileSystem
 */
export interface FileSystemMetadata {
	/**
	 * The name of the FS
	 */
	name: string;

	/**
	 * Wheter the FS is readonly or not
	 */
	readonly: boolean;

	/**
	 * The total space
	 */
	totalSpace: number;

	/**
	 * The available space
	 */
	freeSpace: number;

	/**
	 * If set, disables File from using a resizable array buffer.
	 * @default false
	 */
	noResizableBuffers: boolean;

	/**
	 * If set, disables caching on async file systems.
	 * This means *sync operations will not work*.
	 * It has no affect on sync file systems.
	 * @default false
	 */
	noAsyncCache: boolean;

	/**
	 * The optimal block size to use with the file system
	 * @default 4096
	 */
	blockSize?: number;

	/**
	 * Total number of (file) nodes available
	 */
	totalNodes?: number;

	/**
	 * Number of free (file) nodes available
	 */
	freeNodes?: number;

	/**
	 * The type of the FS
	 */
	type: number;
}

/**
 * Structure for a filesystem. All ZenFS backends must extend this.
 *
 * This class includes default implementations for `exists` and `existsSync`
 *
 * If you are extending this class, note that every path is an absolute path and all arguments are present.
 */
export abstract class FileSystem extends EventEmitter {
	/**
	 * Get metadata about the current file system
	 */
	public metadata(): FileSystemMetadata {
		return {
			name: this.constructor.name.toLowerCase(),
			readonly: false,
			totalSpace: 0,
			freeSpace: 0,
			noResizableBuffers: false,
			noAsyncCache: this._disableSync ?? false,
			type: ZenFsType,
		};
	}

	/**
	 * Whether the sync cache should be disabled.
	 * Only affects async things.
	 * @internal @protected
	 */
	_disableSync?: boolean;

	// eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars
	public constructor(...args: any[]) {
		super();
	}

	public async ready(): Promise<void> {}

	/**
	 * Asynchronous rename.
	 */
	public abstract rename(oldPath: string, newPath: string, cred: Cred): Promise<void>;
	/**
	 * Synchronous rename.
	 */
	public abstract renameSync(oldPath: string, newPath: string, cred: Cred): void;

	/**
	 * Asynchronous `stat`.
	 */
	public abstract stat(path: string, cred: Cred): Promise<Stats>;

	/**
	 * Synchronous `stat`.
	 */
	public abstract statSync(path: string, cred: Cred): Stats;

	/**
	 * Opens the file at `path` with the given flag. The file must exist.
	 * @param path The path to open.
	 * @param flag The flag to use when opening the file.
	 */
	public abstract openFile(path: string, flag: string, cred: Cred): Promise<File>;

	/**
	 * Opens the file at `path` with the given flag. The file must exist.
	 * @param path The path to open.
	 * @param flag The flag to use when opening the file.
	 * @return A File object corresponding to the opened file.
	 */
	public abstract openFileSync(path: string, flag: string, cred: Cred): File;

	/**
	 * Create the file at `path` with the given mode. Then, open it with the given flag.
	 */
	public abstract createFile(path: string, flag: string, mode: number, cred: Cred): Promise<File>;

	/**
	 * Create the file at `path` with the given mode. Then, open it with the given flag.
	 */
	public abstract createFileSync(path: string, flag: string, mode: number, cred: Cred): File;

	/**
	 * Asynchronous `unlink`.
	 */
	public abstract unlink(path: string, cred: Cred): Promise<void>;
	/**
	 * Synchronous `unlink`.
	 */
	public abstract unlinkSync(path: string, cred: Cred): void;
	// Directory operations
	/**
	 * Asynchronous `rmdir`.
	 */
	public abstract rmdir(path: string, cred: Cred): Promise<void>;
	/**
	 * Synchronous `rmdir`.
	 */
	public abstract rmdirSync(path: string, cred: Cred): void;
	/**
	 * Asynchronous `mkdir`.
	 * @param mode Mode to make the directory using.
	 */
	public abstract mkdir(path: string, mode: number, cred: Cred): Promise<void>;
	/**
	 * Synchronous `mkdir`.
	 * @param mode Mode to make the directory using.
	 */
	public abstract mkdirSync(path: string, mode: number, cred: Cred): void;
	/**
	 * Asynchronous `readdir`. Reads the contents of a directory.
	 */
	public abstract readdir(path: string, cred: Cred): Promise<string[]>;
	/**
	 * Synchronous `readdir`. Reads the contents of a directory.
	 */
	public abstract readdirSync(path: string, cred: Cred): string[];

	/**
	 * Test whether or not the given path exists by checking with the file system.
	 */
	public async exists(path: string, cred: Cred): Promise<boolean> {
		try {
			await this.stat(path, cred);
			return true;
		} catch (e) {
			return (e as ErrnoError).code != 'ENOENT';
		}
	}

	/**
	 * Test whether or not the given path exists by checking with the file system.
	 */
	public existsSync(path: string, cred: Cred): boolean {
		try {
			this.statSync(path, cred);
			return true;
		} catch (e) {
			return (e as ErrnoError).code != 'ENOENT';
		}
	}

	/**
	 * Asynchronous `link`.
	 */
	public abstract link(srcpath: string, dstpath: string, cred: Cred): Promise<void>;

	/**
	 * Synchronous `link`.
	 */
	public abstract linkSync(srcpath: string, dstpath: string, cred: Cred): void;

	/**
	 * Synchronize the data and stats for path asynchronously
	 */
	public abstract sync(path: string, data: Uint8Array, stats: Readonly<Stats>): Promise<void>;

	/**
	 * Synchronize the data and stats for path synchronously
	 */
	public abstract syncSync(path: string, data: Uint8Array, stats: Readonly<Stats>): void;
}

/**
 * `TBase` with `TMixin` mixed-in.
 * @internal @experimental
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type Mixin<TBase extends typeof FileSystem, TMixin> = (abstract new (...args: any[]) => TMixin) & TBase;

/**
 * Asynchronous `FileSystem` methods. This is a convience type.
 * @internal
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type _AsyncFSMethods = ExtractProperties<FileSystem, (...args: any[]) => Promise<unknown>>;

/**
 * Implements the asynchronous API in terms of the synchronous API.
 */
export function Sync<T extends typeof FileSystem>(FS: T): Mixin<T, _AsyncFSMethods> {
	abstract class SyncFS extends FS implements _AsyncFSMethods {
		public async exists(path: string, cred: Cred): Promise<boolean> {
			return this.existsSync(path, cred);
		}

		public async rename(oldPath: string, newPath: string, cred: Cred): Promise<void> {
			return this.renameSync(oldPath, newPath, cred);
		}

		public async stat(path: string, cred: Cred): Promise<Stats> {
			return this.statSync(path, cred);
		}

		public async createFile(path: string, flag: string, mode: number, cred: Cred): Promise<File> {
			return this.createFileSync(path, flag, mode, cred);
		}

		public async openFile(path: string, flag: string, cred: Cred): Promise<File> {
			return this.openFileSync(path, flag, cred);
		}

		public async unlink(path: string, cred: Cred): Promise<void> {
			return this.unlinkSync(path, cred);
		}

		public async rmdir(path: string, cred: Cred): Promise<void> {
			return this.rmdirSync(path, cred);
		}

		public async mkdir(path: string, mode: number, cred: Cred): Promise<void> {
			return this.mkdirSync(path, mode, cred);
		}

		public async readdir(path: string, cred: Cred): Promise<string[]> {
			return this.readdirSync(path, cred);
		}

		public async link(srcpath: string, dstpath: string, cred: Cred): Promise<void> {
			return this.linkSync(srcpath, dstpath, cred);
		}

		public async sync(path: string, data: Uint8Array, stats: Readonly<Stats>): Promise<void> {
			return this.syncSync(path, data, stats);
		}
	}
	return SyncFS;
}

/**
 * @internal
 */
type AsyncOperation = {
	[K in keyof _AsyncFSMethods]: [K, ...Parameters<FileSystem[K]>];
}[keyof _AsyncFSMethods];

/**
 * Async() implements synchronous methods on an asynchronous file system
 *
 * Implementing classes must define `_sync` for the synchronous file system used as a cache.
 * Synchronous methods on an asynchronous FS are implemented by:
 *	- Performing operations over the in-memory copy,
 * 	while asynchronously pipelining them to the backing store.
 * 	- During loading, the contents of the async file system are preloaded into the synchronous store.
 *
 */
export function Async<T extends typeof FileSystem>(
	FS: T
): Mixin<
	T,
	{
		/**
		 * @internal @protected
		 */
		_sync?: FileSystem;
		queueDone(): Promise<void>;
		ready(): Promise<void>;
		renameSync(oldPath: string, newPath: string, cred: Cred): void;
		statSync(path: string, cred: Cred): Stats;
		createFileSync(path: string, flag: string, mode: number, cred: Cred): File;
		openFileSync(path: string, flag: string, cred: Cred): File;
		unlinkSync(path: string, cred: Cred): void;
		rmdirSync(path: string, cred: Cred): void;
		mkdirSync(path: string, mode: number, cred: Cred): void;
		readdirSync(path: string, cred: Cred): string[];
		linkSync(srcpath: string, dstpath: string, cred: Cred): void;
		syncSync(path: string, data: Uint8Array, stats: Readonly<Stats>): void;
	}
> {
	abstract class AsyncFS extends FS {
		/**
		 * Queue of pending asynchronous operations.
		 */
		private _queue: AsyncOperation[] = [];
		private get _queueRunning(): boolean {
			return !!this._queue.length;
		}

		public queueDone(): Promise<void> {
			return new Promise(resolve => {
				const check = (): unknown => (this._queueRunning ? setTimeout(check) : resolve());
				check();
			});
		}

		private _isInitialized: boolean = false;

		abstract _sync?: FileSystem;

		public async ready(): Promise<void> {
			await super.ready();
			if (this._isInitialized || this._disableSync) {
				return;
			}
			this.checkSync();

			await this._sync.ready();

			try {
				await this.crossCopy('/');
				this._isInitialized = true;
			} catch (e) {
				this._isInitialized = false;
				throw e;
			}
		}

		protected checkSync(path?: string, syscall?: string): asserts this is { _sync: FileSystem } {
			if (this._disableSync) {
				throw new ErrnoError(Errno.ENOTSUP, 'Sync caching has been disabled for this async file system', path, syscall);
			}
			if (!this._sync) {
				throw new ErrnoError(Errno.ENOTSUP, 'No sync cache is attached to this async file system', path, syscall);
			}
		}

		public renameSync(oldPath: string, newPath: string, cred: Cred): void {
			this.checkSync(oldPath, 'rename');
			this._sync.renameSync(oldPath, newPath, cred);
			this.queue('rename', oldPath, newPath, cred);
		}

		public statSync(path: string, cred: Cred): Stats {
			this.checkSync(path, 'stat');
			return this._sync.statSync(path, cred);
		}

		public createFileSync(path: string, flag: string, mode: number, cred: Cred): PreloadFile<this> {
			this.checkSync(path, 'createFile');
			this._sync.createFileSync(path, flag, mode, cred);
			this.queue('createFile', path, flag, mode, cred);
			return this.openFileSync(path, flag, cred);
		}

		public openFileSync(path: string, flag: string, cred: Cred): PreloadFile<this> {
			this.checkSync(path, 'openFile');
			const file = this._sync.openFileSync(path, flag, cred);
			const stats = file.statSync();
			const buffer = new Uint8Array(stats.size);
			file.readSync(buffer);
			return new PreloadFile<this>(this, path, flag, stats, buffer);
		}

		public unlinkSync(path: string, cred: Cred): void {
			this.checkSync(path, 'unlinkSync');
			this._sync.unlinkSync(path, cred);
			this.queue('unlink', path, cred);
		}

		public rmdirSync(path: string, cred: Cred): void {
			this.checkSync(path, 'rmdir');
			this._sync.rmdirSync(path, cred);
			this.queue('rmdir', path, cred);
		}

		public mkdirSync(path: string, mode: number, cred: Cred): void {
			this.checkSync(path, 'mkdir');
			this._sync.mkdirSync(path, mode, cred);
			this.queue('mkdir', path, mode, cred);
		}

		public readdirSync(path: string, cred: Cred): string[] {
			this.checkSync(path, 'readdir');
			return this._sync.readdirSync(path, cred);
		}

		public linkSync(srcpath: string, dstpath: string, cred: Cred): void {
			this.checkSync(srcpath, 'link');
			this._sync.linkSync(srcpath, dstpath, cred);
			this.queue('link', srcpath, dstpath, cred);
		}

		public syncSync(path: string, data: Uint8Array, stats: Readonly<Stats>): void {
			this.checkSync(path, 'sync');
			this._sync.syncSync(path, data, stats);
			this.queue('sync', path, data, stats);
		}

		public existsSync(path: string, cred: Cred): boolean {
			this.checkSync(path, 'exists');
			return this._sync.existsSync(path, cred);
		}

		/**
		 * @internal
		 */
		protected async crossCopy(path: string): Promise<void> {
			this.checkSync(path, 'crossCopy');
			const stats = await this.stat(path, rootCred);
			if (stats.isDirectory()) {
				if (path !== '/') {
					const stats = await this.stat(path, rootCred);
					this._sync.mkdirSync(path, stats.mode, stats.cred());
				}
				const files = await this.readdir(path, rootCred);
				for (const file of files) {
					await this.crossCopy(join(path, file));
				}
			} else {
				await using asyncFile = await this.openFile(path, parseFlag('r'), rootCred);
				using syncFile = this._sync.createFileSync(path, parseFlag('w'), stats.mode, stats.cred());
				const buffer = new Uint8Array(stats.size);
				await asyncFile.read(buffer);
				syncFile.writeSync(buffer, 0, stats.size);
			}
		}

		/**
		 * @internal
		 */
		private async _next(): Promise<void> {
			if (!this._queueRunning) {
				return;
			}

			const [method, ...args] = this._queue.shift()!;
			// @ts-expect-error 2556 (since ...args is not correctly picked up as being a tuple)
			await this[method](...args);
			await this._next();
		}

		/**
		 * @internal
		 */
		private queue(...op: AsyncOperation) {
			this._queue.push(op);
			this._next();
		}
	}

	return AsyncFS;
}

/**
 * Implements the non-readonly methods to throw `EROFS`
 */
export function Readonly<T extends typeof FileSystem>(
	FS: T
): Mixin<
	T,
	{
		metadata(): FileSystemMetadata;
		rename(oldPath: string, newPath: string, cred: Cred): Promise<void>;
		renameSync(oldPath: string, newPath: string, cred: Cred): void;
		createFile(path: string, flag: string, mode: number, cred: Cred): Promise<File>;
		createFileSync(path: string, flag: string, mode: number, cred: Cred): File;
		unlink(path: string, cred: Cred): Promise<void>;
		unlinkSync(path: string, cred: Cred): void;
		rmdir(path: string, cred: Cred): Promise<void>;
		rmdirSync(path: string, cred: Cred): void;
		mkdir(path: string, mode: number, cred: Cred): Promise<void>;
		mkdirSync(path: string, mode: number, cred: Cred): void;
		link(srcpath: string, dstpath: string, cred: Cred): Promise<void>;
		linkSync(srcpath: string, dstpath: string, cred: Cred): void;
		sync(path: string, data: Uint8Array, stats: Readonly<Stats>): Promise<void>;
		syncSync(path: string, data: Uint8Array, stats: Readonly<Stats>): void;
	}
> {
	abstract class ReadonlyFS extends FS {
		public metadata(): FileSystemMetadata {
			return { ...super.metadata(), readonly: true };
		}
		/* eslint-disable @typescript-eslint/no-unused-vars */
		public async rename(oldPath: string, newPath: string, cred: Cred): Promise<void> {
			throw new ErrnoError(Errno.EROFS);
		}

		public renameSync(oldPath: string, newPath: string, cred: Cred): void {
			throw new ErrnoError(Errno.EROFS);
		}

		public async createFile(path: string, flag: string, mode: number, cred: Cred): Promise<File> {
			throw new ErrnoError(Errno.EROFS);
		}

		public createFileSync(path: string, flag: string, mode: number, cred: Cred): File {
			throw new ErrnoError(Errno.EROFS);
		}

		public async unlink(path: string, cred: Cred): Promise<void> {
			throw new ErrnoError(Errno.EROFS);
		}

		public unlinkSync(path: string, cred: Cred): void {
			throw new ErrnoError(Errno.EROFS);
		}

		public async rmdir(path: string, cred: Cred): Promise<void> {
			throw new ErrnoError(Errno.EROFS);
		}

		public rmdirSync(path: string, cred: Cred): void {
			throw new ErrnoError(Errno.EROFS);
		}

		public async mkdir(path: string, mode: number, cred: Cred): Promise<void> {
			throw new ErrnoError(Errno.EROFS);
		}

		public mkdirSync(path: string, mode: number, cred: Cred): void {
			throw new ErrnoError(Errno.EROFS);
		}

		public async link(srcpath: string, dstpath: string, cred: Cred): Promise<void> {
			throw new ErrnoError(Errno.EROFS);
		}

		public linkSync(srcpath: string, dstpath: string, cred: Cred): void {
			throw new ErrnoError(Errno.EROFS);
		}

		public async sync(path: string, data: Uint8Array, stats: Readonly<Stats>): Promise<void> {
			throw new ErrnoError(Errno.EROFS);
		}

		public syncSync(path: string, data: Uint8Array, stats: Readonly<Stats>): void {
			throw new ErrnoError(Errno.EROFS);
		}
		/* eslint-enable @typescript-eslint/no-unused-vars */
	}
	return ReadonlyFS;
}
