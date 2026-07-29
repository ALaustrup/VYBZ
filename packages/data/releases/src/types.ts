import type {
  CreateReleaseInput,
  ReleaseAsset,
  ReleaseBundle,
  ReleaseFinding,
  ReleaseProject,
  UpdateReleaseInput,
} from "@vybz/domain/releases";

export type ReleasesRepository = {
  listProjects(ownerId: string): Promise<ReleaseProject[]>;
  getBundle(ownerId: string, releaseId: string): Promise<ReleaseBundle | null>;
  createProject(input: CreateReleaseInput): Promise<ReleaseProject>;
  updateProject(ownerId: string, releaseId: string, patch: UpdateReleaseInput): Promise<ReleaseProject>;
  softDeleteProject(ownerId: string, releaseId: string): Promise<void>;
  replaceAssets(ownerId: string, releaseId: string, assets: Omit<ReleaseAsset, "createdAt">[]): Promise<ReleaseAsset[]>;
  replaceFindings(
    ownerId: string,
    releaseId: string,
    findings: Omit<ReleaseFinding, "createdAt" | "updatedAt">[]
  ): Promise<ReleaseFinding[]>;
};

export type KvStore = {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
};
