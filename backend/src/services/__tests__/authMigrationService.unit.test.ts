import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const pgQueryMock = vi.fn();

vi.mock("../../lib/postgres.js", () => ({
	pgQuery: pgQueryMock,
	ensureUserRow: vi.fn(),
}));

async function loadService() {
	vi.resetModules();
	return import("../authMigrationService.js");
}

describe("rollbackToFirebase", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	it("returns not_provisioned when there's no auth_identity_map row", async () => {
		pgQueryMock.mockResolvedValueOnce({ rows: [] });
		const { rollbackToFirebase } = await loadService();
		const result = await rollbackToFirebase("uid-1");
		expect(result).toEqual({ firebaseUid: "uid-1", status: "not_provisioned" });
		expect(pgQueryMock).toHaveBeenCalledTimes(1);
	});

	it("returns already_firebase and does not write when already on firebase", async () => {
		pgQueryMock.mockResolvedValueOnce({ rows: [{ migration_status: "firebase" }] });
		const { rollbackToFirebase } = await loadService();
		const result = await rollbackToFirebase("uid-2");
		expect(result).toEqual({ firebaseUid: "uid-2", status: "already_firebase", previousStatus: "firebase" });
		expect(pgQueryMock).toHaveBeenCalledTimes(1);
	});

	it("flips migration_status to firebase for a migrated user", async () => {
		pgQueryMock.mockResolvedValueOnce({ rows: [{ migration_status: "supabase" }] });
		pgQueryMock.mockResolvedValueOnce({ rows: [] });
		const { rollbackToFirebase } = await loadService();
		const result = await rollbackToFirebase("uid-3");
		expect(result).toEqual({ firebaseUid: "uid-3", status: "rolled_back", previousStatus: "supabase" });
		expect(pgQueryMock).toHaveBeenCalledTimes(2);
		const updateCall = pgQueryMock.mock.calls[1];
		expect(updateCall[0]).toMatch(/update auth_identity_map set migration_status = 'firebase'/);
		expect(updateCall[0]).not.toMatch(/migrated_at/);
		expect(updateCall[1]).toEqual(["uid-3"]);
	});

	it("also rolls back a requires_password_reset user", async () => {
		pgQueryMock.mockResolvedValueOnce({ rows: [{ migration_status: "requires_password_reset" }] });
		pgQueryMock.mockResolvedValueOnce({ rows: [] });
		const { rollbackToFirebase } = await loadService();
		const result = await rollbackToFirebase("uid-4");
		expect(result).toEqual({ firebaseUid: "uid-4", status: "rolled_back", previousStatus: "requires_password_reset" });
	});
});
