type OutputHandler = {
  append: (text: string) => void;
  appendLine: (text: string) => void;
  show: (preserveFocus?: boolean) => void;
};