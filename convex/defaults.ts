export const REQUIRED_ASSETS = [
  { name: "Cash", name_normalized: "cash" },
  { name: "Bank", name_normalized: "bank" },
] as const;

export const DEFAULT_CATEGORIES = [
  { type: "income", name: "Salary", color: undefined, is_system: false },
  { type: "income", name: "Freelance", color: undefined, is_system: false },
  { type: "income", name: "Investment", color: undefined, is_system: false },
  { type: "income", name: "Internal Transfer", color: "#94a3b8", is_system: true },
  { type: "expense", name: "Food", color: "#ef4444", is_system: false },
  { type: "expense", name: "Transport", color: "#f97316", is_system: false },
  { type: "expense", name: "Utilities", color: "#f59e0b", is_system: false },
  { type: "expense", name: "Entertainment", color: "#10b981", is_system: false },
  { type: "expense", name: "Health", color: "#14b8a6", is_system: false },
  { type: "expense", name: "Internal Transfer", color: "#94a3b8", is_system: true },
] as const;
