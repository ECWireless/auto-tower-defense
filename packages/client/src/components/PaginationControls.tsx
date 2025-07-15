import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useState } from 'react';

const MAX_PAGES = 5;

export const PaginationControls = ({
  currentPage,
  onPageChange,
  totalPages,
}: {
  currentPage: number;
  onPageChange: (page: number) => void;
  totalPages: number;
}): JSX.Element | null => {
  const [pageChunk, setPageChunk] = useState(1);
  if (totalPages <= 1) return null;

  return (
    <div className="flex gap-1 items-center justify-center mt-4">
      <button
        onClick={() => {
          onPageChange(currentPage - 1);
          if (currentPage - 1 <= (pageChunk - 1) * MAX_PAGES) {
            setPageChunk(pageChunk - 1);
          }
        }}
        disabled={currentPage === 1}
        className="disabled:cursor-not-allowed disabled:opacity-50 flex hover:bg-gray-800 hover:cursor-pointer hover:text-white h-8 items-center justify-center rounded-sm text-gray-400 transition-colors w-8"
      >
        <ChevronLeft className="h-4 w-4" />
      </button>

      <div className="flex gap-1 items-center">
        {Array.from(
          {
            length:
              currentPage > MAX_PAGES * (pageChunk - 1) &&
              MAX_PAGES * pageChunk > totalPages
                ? totalPages % MAX_PAGES
                : MAX_PAGES,
          },
          (_, i) => i + 1,
        ).map(pageIndex => {
          const page = (pageChunk - 1) * MAX_PAGES + pageIndex;
          return (
            <button
              key={page}
              onClick={() => onPageChange(page)}
              className={`flex items-center justify-center hover:cursor-pointer h-8 rounded-sm text-sm transition-colors w-8 ${
                currentPage === page
                  ? 'bg-cyan-600 text-white'
                  : 'hover:bg-gray-800 hover:text-white text-gray-400'
              }`}
            >
              {page}
            </button>
          );
        })}
      </div>

      <button
        onClick={() => {
          onPageChange(currentPage + 1);
          if (currentPage + 1 > pageChunk * MAX_PAGES) {
            setPageChunk(pageChunk + 1);
          }
        }}
        disabled={currentPage === totalPages}
        className="disabled:cursor-not-allowed disabled:opacity-50 flex hover:bg-gray-800 hover:cursor-pointer hover:text-white h-8 items-center justify-center rounded-sm text-gray-400 transition-colors w-8"
      >
        <ChevronRight className="h-4 w-4" />
      </button>
    </div>
  );
};
