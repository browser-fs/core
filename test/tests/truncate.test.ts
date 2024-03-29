import { fs } from '../common';

describe('Truncate Tests', () => {
	const filename: string = 'truncate-file.txt';
	const data = Buffer.alloc(1024 * 16, 'x');

	afterEach(async () => {
		await fs.promises.unlink(filename);
	});

	it('Truncate Sync', () => {
		fs.writeFileSync(filename, data);
		expect(fs.statSync(filename).size).toBe(1024 * 16);

		fs.truncateSync(filename, 1024);
		expect(fs.statSync(filename).size).toBe(1024);

		fs.truncateSync(filename);
		expect(fs.statSync(filename).size).toBe(0);

		fs.writeFileSync(filename, data);
		expect(fs.statSync(filename).size).toBe(1024 * 16);

		const fd = fs.openSync(filename, 'r+');
		fs.ftruncateSync(fd, 1024);
		let stat = fs.statSync(filename);
		expect(stat.size).toBe(1024);

		fs.ftruncateSync(fd);
		stat = fs.statSync(filename);
		expect(stat.size).toBe(0);

		fs.closeSync(fd);
	});

	it('Truncate Async', async () => {
		const stat = fs.promises.stat;

		await fs.promises.writeFile(filename, data);
		expect((await stat(filename)).size).toBe(1024 * 16);

		await fs.promises.truncate(filename, 1024);
		expect((await stat(filename)).size).toBe(1024);

		await fs.promises.truncate(filename);
		expect((await stat(filename)).size).toBe(0);

		await fs.promises.writeFile(filename, data);
		expect((await stat(filename)).size).toBe(1024 * 16);

		const handle = await fs.promises.open(filename, 'w');

		await handle.truncate(1024);
		await handle.sync();
		expect((await stat(filename)).size).toBe(1024);

		await handle.truncate();
		await handle.sync();
		expect((await stat(filename)).size).toBe(0);

		await handle.close();
	});
});
