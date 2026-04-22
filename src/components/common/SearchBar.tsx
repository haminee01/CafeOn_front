import { FaSearch } from "react-icons/fa";
import { useRouter } from "next/navigation";
import { useState } from "react";

interface SearchBarProps {
  placeholder?: string;
  value?: string;
  onChange?: (value: string) => void;
  onSearch?: (value: string) => void;
  disabled?: boolean;
}

const SearchBar: React.FC<SearchBarProps> = ({
  placeholder = "검색어를 입력하세요",
  value = "",
  onChange,
  onSearch,
  disabled = false,
}) => {
  const router = useRouter();
  const [searchValue, setSearchValue] = useState(value);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setSearchValue(newValue);
    if (onChange) {
      onChange(newValue);
    }
  };

  const handleSearch = () => {
    // 검색어가 있든 없든 search 페이지로 이동
    if (searchValue.trim()) {
      // 검색어가 있으면 URL 파라미터로 전달
      router.push(`/search?q=${encodeURIComponent(searchValue.trim())}`);
    } else {
      // 검색어가 없으면 파라미터 없이 search 페이지로 이동
      router.push("/search");
    }
    if (onSearch) {
      onSearch(searchValue);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleSearch();
    }
  };

  return (
    <div className="relative flex items-center w-full sm:w-11/12 md:w-4/5 lg:w-3/5 xl:w-5/12 mx-auto mb-6 sm:mb-8 lg:mb-10">
      <div className="relative flex-1">
        <input
          type="text"
          value={searchValue}
          onChange={handleInputChange}
          onKeyDown={handleKeyPress}
          placeholder={placeholder}
          disabled={disabled}
          className="w-full border border-primary rounded-full pr-11 sm:pr-12 px-3 sm:px-4 py-2.5 sm:py-3 text-sm sm:text-base placeholder-gray-400 focus:outline-none
        focus:ring-0
        focus:border-primary disabled:opacity-50 disabled:cursor-not-allowed"
        />
        <button
          onClick={handleSearch}
          disabled={disabled}
          className="absolute right-1.5 top-1/2 transform -translate-y-1/2 w-8 h-8 sm:w-9 sm:h-9 bg-primary rounded-full flex items-center justify-center disabled:cursor-not-allowed"
        >
          <FaSearch className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-white" />
        </button>
      </div>
    </div>
  );
};

export default SearchBar;
