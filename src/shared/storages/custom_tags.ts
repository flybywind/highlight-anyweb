import {
  BaseStorage,
  createStorage,
  StorageType,
} from "@src/shared/storages/base";

type TagList = Array<string>;

const tagListStore: BaseStorage<TagList> = createStorage(
  "taglist-storage-key",
  Array<string>(),
  {
    storageType: StorageType.Local,
  }
);
export default tagListStore;
