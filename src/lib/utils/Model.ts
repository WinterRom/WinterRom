// Model.ts
export interface Model {
  name: string;
  size: number | null; // 或者你可以将其设置为 number，如果确保它不会是 null
  // 可以添加更多属性...
}