import {
  BaseStorage,
  createStorage,
  StorageType,
} from "@src/shared/storages/base";

const recentTagStore: BaseStorage<string | null> = createStorage(
  "recent-tag-storage-key",
  null,
  {
    storageType: StorageType.Local,
  }
);
export default recentTagStore;
