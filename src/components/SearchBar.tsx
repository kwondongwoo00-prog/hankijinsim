"use client";

import { useState } from "react";

interface SearchBarProps {
  onSearch: (query: string) => void;
  isLoading?: boolean;
}

export default function SearchBar({ onSearch, isLoading }: SearchBarProps) {
  const [query, setQuery] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = query.trim();
    if (trimmed) {
      onSearch(trimmed);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex w-full gap-2">
      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="식당 이름이나 지역을 검색하세요"
        className="flex-1 rounded-lg border border-gray-300 px-4 py-3 text-base outline-none transition-colors focus:border-orange-500 focus:ring-2 focus:ring-orange-200"
        disabled={isLoading}
      />
      <button
        type="submit"
        disabled={isLoading || !query.trim()}
        className="rounded-lg bg-orange-500 px-6 py-3 font-semibold text-white transition-colors hover:bg-orange-600 disabled:bg-gray-300 disabled:cursor-not-allowed"
      >
        {isLoading ? "검색 중..." : "검색"}
      </button>
    </form>
  );
}
