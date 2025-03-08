type TestControllerConsumer = {
  addTestItem: (item: TestItem) => void;
  clearItems: () => void;
  runTests: (items: TestItem[]) => Promise<void>;
};

type TestItem = {
  id: string;
  label: string;
  uri: string;
  children: TestItem[];
};