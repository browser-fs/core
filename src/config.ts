import { type Entries } from 'utilium';
import type { Backend, BackendConfiguration, FilesystemOf, SharedConfig } from './backends/backend.js';
import { checkOptions, isBackend, isBackendConfig } from './backends/backend.js';
import * as fs from './emulation/index.js';
import type { AbsolutePath } from './emulation/path.js';
import { setCred, type MountObject } from './emulation/shared.js';
import { Errno, ErrnoError } from './error.js';
import { FileSystem } from './filesystem.js';

/**
 * Configuration for a specific mount point
 */
export type MountConfiguration<T extends Backend> = FilesystemOf<T> | BackendConfiguration<T> | T;

function isMountConfig<T extends Backend>(arg: unknown): arg is MountConfiguration<T> {
	return isBackendConfig(arg) || isBackend(arg) || arg instanceof FileSystem;
}

/**
 * Retrieve a file system with the given configuration.
 * @see MountConfiguration
 */
export async function resolveMountConfig<T extends Backend>(config: MountConfiguration<T>, _depth = 0): Promise<FilesystemOf<T>> {
	if (typeof config !== 'object' || config == null) {
		throw new ErrnoError(Errno.EINVAL, 'Invalid options on mount configuration');
	}

	if (!isMountConfig(config)) {
		throw new ErrnoError(Errno.EINVAL, 'Invalid mount configuration');
	}

	if (config instanceof FileSystem) {
		return config;
	}

	if (isBackend(config)) {
		config = { backend: config } as BackendConfiguration<T>;
	}

	for (const [key, value] of Object.entries(config)) {
		if (key == 'backend') {
			continue;
		}

		if (!isMountConfig(value)) {
			continue;
		}

		if (_depth > 10) {
			throw new ErrnoError(Errno.EINVAL, 'Invalid configuration, too deep and possibly infinite');
		}

		(config as Record<string, FileSystem>)[key] = await resolveMountConfig(value, ++_depth);
	}

	const { backend } = config;

	if (!(await backend.isAvailable())) {
		throw new ErrnoError(Errno.EPERM, 'Backend not available: ' + backend);
	}
	checkOptions(backend, config);
	const mount = (await backend.create(config)) as FilesystemOf<T>;
	if ('_disableSync' in mount) {
		mount._disableSync = config.disableAsyncCache ?? false;
	}
	await mount.ready();
	return mount;
}

type ConfigMounts = { [K in AbsolutePath]: Backend };

/**
 * Configuration
 */
export interface Configuration<T extends ConfigMounts> extends SharedConfig {
	/**
	 * An object mapping mount points to mount configuration
	 */
	mounts: { [K in keyof T & AbsolutePath]: MountConfiguration<T[K]> };
	/**
	 * The uid to use
	 */
	uid: number;
	/**
	 * The gid to use
	 */
	gid: number;
}

/**
 * Configures ZenFS with single mount point /
 */
export async function configure<T extends Backend>(config: MountConfiguration<T>): Promise<void>;

/**
 * Configures ZenFS with the given configuration
 * @see Configuration
 */
export async function configure<T extends ConfigMounts>(config: Partial<Configuration<T>>): Promise<void>;

/**
 * Configures ZenFS with the given configuration
 * @see Configuration
 */
export async function configure(config: MountConfiguration<Backend> | Partial<Configuration<ConfigMounts>>): Promise<void> {
	const uid = 'uid' in config ? config.uid || 0 : 0;
	const gid = 'gid' in config ? config.gid || 0 : 0;

	if (isMountConfig(config)) {
		// single FS
		config = { mounts: { '/': config } } as Partial<Configuration<ConfigMounts>>;
	}

	setCred({ uid, gid, suid: uid, sgid: gid, euid: uid, egid: gid });

	if (!config.mounts) {
		return;
	}

	for (const [point, mountConfig] of Object.entries(config.mounts) as Entries<typeof config.mounts>) {
		if (!point.startsWith('/')) {
			throw new ErrnoError(Errno.EINVAL, 'Mount points must have absolute paths');
		}

		if (isBackendConfig(mountConfig)) {
			mountConfig.disableAsyncCache ??= config.disableAsyncCache || false;
		}

		config.mounts[point] = await resolveMountConfig(mountConfig);
	}

	fs.mountObject(config.mounts as MountObject);
}
